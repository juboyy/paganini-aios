"""Paganini AIOS — Fund Onboarding Flow

CLI commands for onboarding a real fund:
  paganini onboard --name "Fund XYZ" --regulation reg.pdf --cedentes ced.csv
  paganini onboard status
  paganini onboard validate

GATE-2026-03-15T150325:302c8788e62d
"""
from __future__ import annotations

import csv
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import click
from packs.finance.integrations.cvm import build_fund_profile, save_fund_profile


def _ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _base():
    return Path(os.environ.get("PAGANINI_BASE", ".")).resolve()


def _fund_dir(base: Path, fund_name: str) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", fund_name.lower()).strip("-")
    return base / "runtime" / "funds" / slug


def _extract_pdf_text(pdf_path: Path) -> str:
    """Extract text from PDF. Tries pdfplumber, falls back to pdfminer."""
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            return "\n\n".join(page.extract_text() or "" for page in pdf.pages)
    except ImportError:
        pass

    try:
        from pdfminer.high_level import extract_text
        return extract_text(str(pdf_path))
    except ImportError:
        pass

    # Last resort: just note it
    return f"[PDF não processado — instale pdfplumber: pip install pdfplumber]\nArquivo: {pdf_path}"


def _parse_cedentes_csv(csv_path: Path) -> list[dict]:
    """Parse cedentes CSV. Expected columns: nome, cnpj, setor, valor, rating."""
    cedentes = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize keys
            clean = {}
            for k, v in row.items():
                key = k.strip().lower().replace(" ", "_")
                clean[key] = v.strip() if v else ""

            cedente = {
                "nome": clean.get("nome", clean.get("name", clean.get("razao_social", ""))),
                "cnpj": clean.get("cnpj", ""),
                "setor": clean.get("setor", clean.get("sector", clean.get("segmento", ""))),
                "valor": float(clean.get("valor", clean.get("volume", "0")).replace(",", ".") or 0),
                "rating_interno": clean.get("rating", clean.get("rating_interno", clean.get("score", ""))),
            }
            if cedente["nome"]:
                cedentes.append(cedente)

    return cedentes


def _parse_custody_xml(xml_path: Path) -> dict:
    """Parse custody report (simplified XML/CSV)."""
    content = xml_path.read_text(errors="ignore")

    # Try CSV
    if xml_path.suffix.lower() == ".csv":
        rows = list(csv.DictReader(content.splitlines()))
        return {"format": "csv", "records": len(rows), "raw": rows[:5]}

    # Basic XML stats
    import re as _re
    tags = set(_re.findall(r"<(\w+)", content))
    return {"format": "xml", "tags": len(tags), "size_kb": len(content) // 1024}


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


@click.group("onboard")
def onboard_cli():
    """Fund onboarding commands."""
    pass


@onboard_cli.command("init")
@click.option("--name", required=True, help="Fund name (e.g. 'Fundo Alpha')")
@click.option("--regulation", type=click.Path(exists=True), help="Fund regulation PDF")
@click.option("--cedentes", type=click.Path(exists=True), help="Cedentes CSV file")
@click.option("--custody", type=click.Path(exists=True), help="Custody report (XML/CSV)")
@click.option("--covenants", type=click.Path(exists=True), help="Covenants JSON file")
def onboard_init(name, regulation, cedentes, custody, covenants):
    """Initialize a new fund onboarding."""
    base = _base()
    fund_dir = _fund_dir(base, name)
    fund_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "name": name,
        "slug": fund_dir.name,
        "created_at": _ts(),
        "status": "initializing",
        "files": {},
        "stats": {},
    }

    click.echo(f"📁 Criando fundo: {name}")
    click.echo(f"   Dir: {fund_dir}")

    # 1. Copy & process regulation
    if regulation:
        reg_path = Path(regulation)
        dest = fund_dir / f"regulamento{reg_path.suffix}"
        shutil.copy2(reg_path, dest)
        manifest["files"]["regulation"] = str(dest.relative_to(base))

        click.echo(f"\n📄 Processando regulamento: {reg_path.name}")
        text = _extract_pdf_text(reg_path)
        (fund_dir / "regulamento.txt").write_text(text)
        chunks = _chunk_text(text)
        manifest["stats"]["regulation_chars"] = len(text)
        manifest["stats"]["regulation_chunks"] = len(chunks)
        click.echo(f"   {len(text):,} chars → {len(chunks)} chunks")

        # Ingest into ChromaDB
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(base / "runtime" / "data"))
            collection = client.get_or_create_collection("fidc_regulations")

            ids = [f"{fund_dir.name}_reg_{i}" for i in range(len(chunks))]
            metadatas = [{"source": name, "type": "regulation", "chunk": i} for i in range(len(chunks))]
            collection.add(documents=chunks, ids=ids, metadatas=metadatas)

            manifest["stats"]["total_chunks"] = collection.count()
            click.echo(f"   ✅ Indexado no ChromaDB ({collection.count()} chunks total)")
        except Exception as e:
            click.echo(f"   ⚠️ ChromaDB indisponível: {e}")

    # 2. Process cedentes
    if cedentes:
        ced_path = Path(cedentes)
        shutil.copy2(ced_path, fund_dir / "cedentes.csv")
        manifest["files"]["cedentes"] = f"runtime/funds/{fund_dir.name}/cedentes.csv"

        ced_list = _parse_cedentes_csv(ced_path)
        (fund_dir / "cedentes.json").write_text(
            json.dumps(ced_list, ensure_ascii=False, indent=2)
        )
        manifest["stats"]["cedentes"] = len(ced_list)
        total_vol = sum(c["valor"] for c in ced_list)

        click.echo(f"\n🏢 Cedentes: {len(ced_list)} carregados")
        click.echo(f"   Volume total: R$ {total_vol:,.2f}")
        for c in ced_list[:5]:
            click.echo(f"   • {c['nome']} ({c['cnpj']}) — R$ {c['valor']:,.2f}")
        if len(ced_list) > 5:
            click.echo(f"   ... +{len(ced_list)-5} mais")

    # 3. Process custody
    if custody:
        cust_path = Path(custody)
        shutil.copy2(cust_path, fund_dir / f"custodia{cust_path.suffix}")
        manifest["files"]["custody"] = f"runtime/funds/{fund_dir.name}/custodia{cust_path.suffix}"

        cust_data = _parse_custody_xml(cust_path)
        manifest["stats"]["custody"] = cust_data
        click.echo(f"\n🏦 Custódia: {cust_path.name} ({cust_data.get('format','?')})")

    # 4. Load covenants
    if covenants:
        cov_path = Path(covenants)
        shutil.copy2(cov_path, fund_dir / "covenants.json")
        manifest["files"]["covenants"] = f"runtime/funds/{fund_dir.name}/covenants.json"

        cov_data = json.loads(cov_path.read_text())
        manifest["stats"]["covenants"] = len(cov_data) if isinstance(cov_data, dict) else 0
        click.echo(f"\n📋 Covenants: {len(cov_data) if isinstance(cov_data, dict) else '?'} regras carregadas")

    # 5. Build fund.json (unified)
    fund_data = {
        "nome": name,
        "slug": fund_dir.name,
        "onboarded_at": _ts(),
        "cedentes": json.loads((fund_dir / "cedentes.json").read_text()) if (fund_dir / "cedentes.json").exists() else [],
        "covenants": json.loads((fund_dir / "covenants.json").read_text()) if (fund_dir / "covenants.json").exists() else {},
    }
    (fund_dir / "fund.json").write_text(json.dumps(fund_data, ensure_ascii=False, indent=2))

    # 6. Save manifest
    manifest["status"] = "ready"
    (fund_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))

    click.echo(f"\n{'='*50}")
    click.echo(f"✅ Fundo '{name}' onboarded com sucesso!")
    click.echo(f"   Dir: {fund_dir}")
    click.echo("\nPróximos passos:")
    click.echo(f"   paganini onboard status --fund {fund_dir.name}")
    click.echo(f"   paganini onboard validate --fund {fund_dir.name}")
    click.echo(f"   paganini daemons run --fund {fund_dir.name}")


@onboard_cli.command("status")
@click.option("--fund", help="Fund slug (directory name)")
def onboard_status(fund):
    """Show onboarding status for a fund."""
    base = _base()
    funds_dir = base / "runtime" / "funds"

    if fund:
        manifest_path = funds_dir / fund / "manifest.json"
        if not manifest_path.exists():
            click.echo(f"❌ Fundo não encontrado: {fund}")
            return
        m = json.loads(manifest_path.read_text())
        click.echo(f"\n📊 {m['name']}")
        click.echo(f"   Status: {m['status']}")
        click.echo(f"   Criado: {m['created_at']}")
        for k, v in m.get("stats", {}).items():
            click.echo(f"   {k}: {v}")
        click.echo("\n   Arquivos:")
        for k, v in m.get("files", {}).items():
            click.echo(f"   • {k}: {v}")
    else:
        if not funds_dir.exists():
            click.echo("Nenhum fundo onboarded.")
            return
        for fd in sorted(funds_dir.iterdir()):
            mp = fd / "manifest.json"
            if mp.exists():
                m = json.loads(mp.read_text())
                ced = m.get("stats", {}).get("cedentes", "?")
                chunks = m.get("stats", {}).get("regulation_chunks", "?")
                click.echo(f"  {m['name']} [{m['status']}] — {ced} cedentes, {chunks} chunks")


@onboard_cli.command("validate")
@click.option("--fund", required=True, help="Fund slug")
def onboard_validate(fund):
    """Validate onboarded fund data."""
    base = _base()
    fund_dir = base / "runtime" / "funds" / fund

    if not fund_dir.exists():
        click.echo(f"❌ Fundo não encontrado: {fund}")
        return

    click.echo(f"\n🔍 Validando fundo: {fund}")
    issues = []

    # Check files
    for f in ["fund.json", "manifest.json"]:
        if not (fund_dir / f).exists():
            issues.append(f"Missing: {f}")

    # Check cedentes
    ced_path = fund_dir / "cedentes.json"
    if ced_path.exists():
        ceds = json.loads(ced_path.read_text())
        for c in ceds:
            if not c.get("cnpj"):
                issues.append(f"Cedente sem CNPJ: {c.get('nome','?')}")
            elif len(re.sub(r"[^0-9]", "", c["cnpj"])) != 14:
                issues.append(f"CNPJ inválido: {c['cnpj']} ({c.get('nome','?')})")
        click.echo(f"   ✅ {len(ceds)} cedentes carregados")
        no_cnpj = sum(1 for c in ceds if not c.get("cnpj"))
        if no_cnpj:
            click.echo(f"   ⚠️ {no_cnpj} sem CNPJ")
    else:
        issues.append("Sem cedentes carregados")

    # Check regulation
    reg_path = fund_dir / "regulamento.txt"
    if reg_path.exists():
        text = reg_path.read_text()
        click.echo(f"   ✅ Regulamento: {len(text):,} chars")
        # Basic checks
        if "fidc" not in text.lower() and "fundo" not in text.lower():
            issues.append("Regulamento não parece ser de fundo de investimento")
    else:
        issues.append("Sem regulamento processado")

    # Check covenants
    cov_path = fund_dir / "covenants.json"
    if cov_path.exists():
        click.echo("   ✅ Covenants carregados")
    else:
        click.echo("   ℹ️ Sem covenants (opcional)")

    if issues:
        click.echo(f"\n   ⚠️ {len(issues)} issue(s):")
        for i in issues:
            click.echo(f"   • {i}")
    else:
        click.echo("\n   ✅ Validação OK — fundo pronto para operação")




@onboard_cli.command("auto")
@click.option("--cnpj", required=True, help="Fund CNPJ number")
def onboard_auto(cnpj):
    """Auto-onboard a fund using CVM public data. No client data needed."""
    base = _base()
    click.echo("Onboarding via CVM dados abertos...")
    profile = build_fund_profile(cnpj)
    fund_dir = save_fund_profile(profile, str(base))

    nome = profile.get("cadastro", {}).get("nome", "?") if profile.get("cadastro") else "?"
    click.echo(f"\n✅ {nome} onboarded via CVM")
    click.echo(f"   paganini onboard status --fund {fund_dir.name}")
    click.echo(f"   paganini onboard validate --fund {fund_dir.name}")


if __name__ == "__main__":
    onboard_cli()
