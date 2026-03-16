"""Paganini AIOS — CVM Public Data Ingester

Pulls fund data from CVM open data using only the fund's CNPJ.
No client data needed — everything is public regulatory filing.

Sources:
  - dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/ (daily reports)
  - dados.cvm.gov.br/dados/FI/CAD/DADOS/ (fund registry)
  - dados.cvm.gov.br/dados/FI/DOC/CDA/ (portfolio composition)

GATE-2026-03-15T150325:302c8788e62d
"""
from __future__ import annotations

import csv
import io
import json
import logging
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CVM_BASE = "https://dados.cvm.gov.br/dados/FI"
CVM_CAD = f"{CVM_BASE}/CAD/DADOS"
CVM_DIARIO = f"{CVM_BASE}/DOC/INF_DIARIO/DADOS"
CVM_CDA = f"{CVM_BASE}/DOC/CDA/DADOS"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PaganiniAIOS/1.0)"}


def _clean_cnpj(cnpj: str) -> str:
    """Remove formatting from CNPJ, keep digits only."""
    return re.sub(r"[^0-9]", "", cnpj)


def _format_cnpj(cnpj: str) -> str:
    """Format CNPJ: XX.XXX.XXX/XXXX-XX."""
    d = _clean_cnpj(cnpj)
    if len(d) == 14:
        return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"
    return cnpj


def _fetch_csv(url: str, encoding: str = "latin-1") -> list[dict]:
    """Fetch and parse a CSV from CVM open data. Handles .csv and .zip."""
    import zipfile

    # Try .zip first (CVM changed format), then .csv
    urls_to_try = []
    if url.endswith(".csv"):
        zip_url = url.replace(".csv", ".zip")
        urls_to_try = [zip_url, url]
    else:
        urls_to_try = [url]

    for try_url in urls_to_try:
        req = urllib.request.Request(try_url, headers={**HEADERS, "User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw_bytes = resp.read()

            if try_url.endswith(".zip"):
                zf = zipfile.ZipFile(io.BytesIO(raw_bytes))
                csv_names = [n for n in zf.namelist() if n.endswith(".csv")]
                if not csv_names:
                    continue
                raw = zf.read(csv_names[0]).decode(encoding, errors="ignore")
            else:
                raw = raw_bytes.decode(encoding, errors="ignore")

            reader = csv.DictReader(io.StringIO(raw), delimiter=";")
            return list(reader)
        except Exception as e:
            logger.debug("Failed to fetch %s: %s", try_url, e)
            continue

    logger.warning("All URLs failed for %s", url)
    return []


def fetch_fund_registry(cnpj: str) -> Optional[dict]:
    """Fetch fund registration data from CVM cadastro.

    Returns fund name, type, admin, manager, custodian, start date, etc.
    """
    clean = _clean_cnpj(cnpj)

    # CVM publishes full registry as CSV
    url = f"{CVM_CAD}/cad_fi.csv"
    print(f"  Buscando cadastro CVM... ({url[:60]}...)")

    rows = _fetch_csv(url)
    if not rows:
        return None

    for row in rows:
        row_cnpj = _clean_cnpj(row.get("CNPJ_FUNDO", ""))
        if row_cnpj == clean:
            return {
                "cnpj": _format_cnpj(clean),
                "nome": row.get("DENOM_SOCIAL", "").strip(),
                "tipo": row.get("TP_FUNDO", ""),
                "classe": row.get("CLASSE", ""),
                "situacao": row.get("SIT", ""),
                "data_registro": row.get("DT_REG", ""),
                "data_constituicao": row.get("DT_CONST", ""),
                "data_inicio": row.get("DT_INI_ATIV", ""),
                "administrador": row.get("ADMIN", "").strip(),
                "cnpj_admin": row.get("CNPJ_ADMIN", ""),
                "gestor": row.get("GESTOR", "").strip(),
                "auditor": row.get("AUDITOR", "").strip(),
                "custodiante": row.get("CUSTODIANTE", "").strip(),
                "controlador": row.get("CONTROLADOR", "").strip(),
                "publico_alvo": row.get("PUBLICO_ALVO", ""),
                "taxa_adm": row.get("TAXA_ADM", ""),
                "taxa_perfm": row.get("TAXA_PERFM", ""),
                "condominio": row.get("CONDOM", ""),
                "exclusivo": row.get("FUNDO_EXCLUSIVO", ""),
                "cotas": row.get("FUNDO_COTAS", ""),
                "tributacao": row.get("TRIB_LPRAZO", ""),
                "entidade_invest": row.get("ENTID_INVEST", ""),
            }

    return None


def fetch_daily_info(cnpj: str, months_back: int = 3) -> list[dict]:
    """Fetch daily fund info (PL, cotas, captação, resgate).

    CVM publishes monthly CSV files: inf_diario_fi_YYYYMM.csv
    """
    clean = _clean_cnpj(cnpj)
    now = datetime.now(timezone.utc)
    all_records = []

    for i in range(months_back):
        dt = now - timedelta(days=30 * i)
        ym = dt.strftime("%Y%m")
        url = f"{CVM_DIARIO}/inf_diario_fi_{ym}.csv"
        print(f"  Buscando informe diário {ym}...")

        rows = _fetch_csv(url)
        for row in rows:
            # Handle both old (CNPJ_FUNDO) and new (CNPJ_FUNDO_CLASSE) column names
            row_cnpj = _clean_cnpj(row.get("CNPJ_FUNDO_CLASSE", row.get("CNPJ_FUNDO", "")))
            if row_cnpj == clean:
                try:
                    all_records.append({
                        "data": row.get("DT_COMPTC", ""),
                        "pl": float(row.get("VL_PATRIM_LIQ", "0").replace(",", ".")),
                        "valor_cota": float(row.get("VL_QUOTA", row.get("VL_QUOTA", "0")).replace(",", ".")),
                        "captacao": float(row.get("CAPTC_DIA", "0").replace(",", ".")),
                        "resgate": float(row.get("RESG_DIA", "0").replace(",", ".")),
                        "nr_cotistas": int(row.get("NR_COTST", "0") or 0),
                    })
                except (ValueError, TypeError):
                    pass

    return sorted(all_records, key=lambda x: x["data"])


def fetch_portfolio_composition(cnpj: str, months_back: int = 1) -> list[dict]:
    """Fetch CDA (Composição e Diversificação das Aplicações).

    Shows what assets the fund holds — for credit receivable funds this includes receivables data.
    """
    clean = _clean_cnpj(cnpj)
    now = datetime.now(timezone.utc)
    all_records = []

    for i in range(months_back):
        dt = now - timedelta(days=30 * i)
        ym = dt.strftime("%Y%m")
        url = f"{CVM_CDA}/cda_fi_{ym}.csv"
        print(f"  Buscando CDA {ym}...")

        rows = _fetch_csv(url)
        for row in rows:
            row_cnpj = _clean_cnpj(row.get("CNPJ_FUNDO_CLASSE", row.get("CNPJ_FUNDO", "")))
            if row_cnpj == clean:
                try:
                    all_records.append({
                        "data": row.get("DT_COMPTC", ""),
                        "tipo_ativo": row.get("TP_APLIC", ""),
                        "tipo_ativo_desc": row.get("DS_APLIC", "").strip(),
                        "emissor": row.get("NM_FUNDO_COTA", row.get("EMISSOR", "")).strip(),
                        "cnpj_emissor": row.get("CNPJ_FUNDO_COTA", row.get("CD_ISIN", "")),
                        "valor": float(row.get("VL_MERC_POS_FINAL", "0").replace(",", ".")),
                        "percentual_pl": float(row.get("VL_PERCENT", "0").replace(",", ".") or 0),
                    })
                except (ValueError, TypeError):
                    pass

    return all_records


def build_fund_profile(cnpj: str) -> dict:
    """Build complete fund profile from CVM public data.

    This is the main entry point — given a CNPJ, returns everything
    needed for the POC without any client-provided data.
    """
    print(f"\n{'='*50}")
    print("PAGANINI AIOS — CVM Data Ingestion")
    print(f"CNPJ: {_format_cnpj(cnpj)}")
    print(f"{'='*50}\n")

    profile = {"cnpj": _format_cnpj(cnpj), "ingested_at": datetime.now(timezone.utc).isoformat()}

    # 1. Registry
    print("[1/3] Cadastro do Fundo")
    reg = fetch_fund_registry(cnpj)
    if reg:
        profile["cadastro"] = reg
        print(f"  ✅ {reg['nome']}")
        print(f"     Tipo: {reg['tipo']} | Classe: {reg['classe']}")
        print(f"     Admin: {reg['administrador']}")
        print(f"     Gestor: {reg['gestor']}")
        print(f"     Custódia: {reg['custodiante']}")
        print(f"     Situação: {reg['situacao']}")
    else:
        print("  ❌ Fundo não encontrado no cadastro CVM")
        profile["cadastro"] = None

    # 2. Daily info (last 3 months)
    print("\n[2/3] Informe Diário (últimos 3 meses)")
    daily = fetch_daily_info(cnpj, months_back=3)
    if daily:
        latest = daily[-1]
        first = daily[0]
        profile["informe_diario"] = {
            "registros": len(daily),
            "periodo": f"{first['data']} a {latest['data']}",
            "ultimo": latest,
            "pl_atual": latest["pl"],
            "valor_cota_atual": latest["valor_cota"],
            "nr_cotistas": latest["nr_cotistas"],
            "captacao_periodo": sum(d["captacao"] for d in daily),
            "resgate_periodo": sum(d["resgate"] for d in daily),
        }
        print(f"  ✅ {len(daily)} registros ({first['data']} → {latest['data']})")
        print(f"     PL atual: R$ {latest['pl']:,.2f}")
        print(f"     Cota: R$ {latest['valor_cota']:,.6f}")
        print(f"     Cotistas: {latest['nr_cotistas']}")
    else:
        print("  ⚠️ Sem dados no informe diário")
        profile["informe_diario"] = None

    # 3. Portfolio composition
    print("\n[3/3] Composição da Carteira (CDA)")
    portfolio = fetch_portfolio_composition(cnpj, months_back=1)
    if portfolio:
        total_val = sum(p["valor"] for p in portfolio)
        by_type = {}
        for p in portfolio:
            tp = p["tipo_ativo_desc"] or p["tipo_ativo"]
            by_type[tp] = by_type.get(tp, 0) + p["valor"]

        profile["carteira"] = {
            "ativos": len(portfolio),
            "valor_total": total_val,
            "composicao": [
                {"tipo": tp, "valor": val, "percentual": (val/total_val*100) if total_val else 0}
                for tp, val in sorted(by_type.items(), key=lambda x: -x[1])
            ],
            "detalhes": portfolio[:20],  # Top 20 positions
        }
        print(f"  ✅ {len(portfolio)} posições | R$ {total_val:,.2f}")
        for tp, val in sorted(by_type.items(), key=lambda x: -x[1])[:5]:
            pct = val / total_val * 100 if total_val else 0
            print(f"     {tp}: R$ {val:,.2f} ({pct:.1f}%)")
    else:
        print("  ⚠️ Sem dados de composição")
        profile["carteira"] = None

    # Summary
    print(f"\n{'='*50}")
    nome = profile.get("cadastro", {}).get("nome", "?") if profile.get("cadastro") else "?"
    print(f"✅ Profile completo: {nome}")
    sections = sum(1 for k in ["cadastro", "informe_diario", "carteira"] if profile.get(k))
    print(f"   {sections}/3 seções com dados")
    print(f"{'='*50}")

    return profile


def save_fund_profile(profile: dict, base_path: str = ".") -> Path:
    """Save fund profile to runtime/funds/<slug>/."""
    base = Path(base_path).resolve()
    nome = profile.get("cadastro", {}).get("nome", "fundo-desconhecido") if profile.get("cadastro") else "fundo-desconhecido"
    slug = re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")[:60]

    fund_dir = base / "runtime" / "funds" / slug
    fund_dir.mkdir(parents=True, exist_ok=True)

    # Save full profile
    (fund_dir / "cvm_profile.json").write_text(
        json.dumps(profile, ensure_ascii=False, indent=2, default=str)
    )

    # Save fund.json (compatible with existing system)
    fund_data = {
        "nome": nome,
        "cnpj": profile.get("cnpj", ""),
        "slug": slug,
        "source": "cvm_open_data",
        "onboarded_at": profile.get("ingested_at", ""),
        "patrimonio_liquido": profile.get("informe_diario", {}).get("pl_atual", 0) if profile.get("informe_diario") else 0,
        "valor_cota": profile.get("informe_diario", {}).get("valor_cota_atual", 0) if profile.get("informe_diario") else 0,
        "administrador": profile.get("cadastro", {}).get("administrador", "") if profile.get("cadastro") else "",
        "gestor": profile.get("cadastro", {}).get("gestor", "") if profile.get("cadastro") else "",
        "custodiante": profile.get("cadastro", {}).get("custodiante", "") if profile.get("cadastro") else "",
        "cedentes": [],  # CDA doesn't always show individual cedentes
        "covenants": {},  # Would need the regulamento for this
    }
    (fund_dir / "fund.json").write_text(
        json.dumps(fund_data, ensure_ascii=False, indent=2, default=str)
    )

    # Save manifest
    manifest = {
        "name": nome,
        "slug": slug,
        "source": "cvm_open_data",
        "created_at": profile.get("ingested_at", ""),
        "status": "ready",
        "stats": {
            "daily_records": profile.get("informe_diario", {}).get("registros", 0) if profile.get("informe_diario") else 0,
            "portfolio_positions": profile.get("carteira", {}).get("ativos", 0) if profile.get("carteira") else 0,
        },
    }
    (fund_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, default=str)
    )

    print(f"\n📁 Salvo em: {fund_dir}")
    return fund_dir


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python3 cvm_ingester.py <CNPJ> [base_path]")
        print("Ex:  python3 cvm_ingester.py XX.XXX.XXX/0001-XX")
        sys.exit(1)

    cnpj = sys.argv[1]
    base = sys.argv[2] if len(sys.argv) > 2 else "."

    profile = build_fund_profile(cnpj)
    save_fund_profile(profile, base)
