"""PAGANINI CLI — The Right Path.

Flow: paganini query → RAG retrieve → MetaClaw enrich → Moltis LLM → Guardrails → Response
"""

import os
import sys
import time
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

PAGANINI_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PAGANINI_ROOT))


def _load_config():
    from packages.kernel.engine import load_config
    return load_config()


@click.group()
@click.version_option(version="0.1.0", prog_name="paganini")
def cli():
    """🎻 PAGANINI AIOS — AI Operating System for Financial Markets."""
    pass


@cli.command()
@click.option("--provider", type=click.Choice(["openai", "anthropic", "google", "ollama", "custom"]),
              prompt="LLM Provider", help="LLM provider (BYOK — you keep your keys)")
@click.option("--model", default=None, help="Model name")
@click.option("--api-key", default=None, help="API key (or use env var)")
@click.option("--corpus", default=None, help="Path to corpus directory")
@click.option("--runtime", "rt", type=click.Choice(["moltis", "python", "docker"]),
              default="moltis", help="Runtime engine")
def init(provider, model, api_key, corpus, rt):
    """Initialize PAGANINI AIOS."""
    from packages.kernel.engine import save_config

    model_defaults = {
        "openai": "gpt-4o-mini", "anthropic": "claude-sonnet-4-20250514",
        "google": "gemini/gemini-2.5-flash", "ollama": "ollama/llama3.1",
        "custom": "gpt-4o",
    }

    config = {
        "version": "0.1.0",
        "runtime": {"engine": rt, "moltis_config": "moltis.yaml",
                     "gateway_url": "http://127.0.0.1:30000"},
        "provider": {"type": provider, "model": model or model_defaults.get(provider, "gpt-4o-mini"),
                     "api_key": api_key or "", "base_url": ""},
        "rag": {"chunk_size": 384, "chunk_overlap": 64, "respect_headers": True,
                "top_k": 5, "max_context_tokens": 8000},
        "metaclaw": {"enabled": False, "skills_dir": "skills/", "auto_evolve": True,
                     "max_skills": 500, "mode": "skills_only"},
        "guardrails": {"eligibility": True, "concentration": True, "covenant": True,
                       "pld_aml": True, "compliance": True, "risk_assessment": True},
        "data_dir": "runtime/data",
        "corpus_dir": corpus or "",
        "pack": "fidc",
    }

    # Resolve API key
    if not api_key and provider not in ("ollama",):
        env_map = {"openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
                    "google": "GEMINI_API_KEY"}
        env_var = env_map.get(provider, "")
        env_val = os.environ.get(env_var, "")
        if env_val:
            config["provider"]["api_key"] = f"${{{env_var}}}"
            console.print(f"  ✓ Using {env_var} from environment")
        else:
            key = click.prompt(f"  API Key for {provider}", hide_input=True)
            config["provider"]["api_key"] = key

    save_config(config)

    console.print(Panel.fit(
        f"[bold green]✓ PAGANINI initialized[/]\n\n"
        f"  Runtime:  {rt}\n"
        f"  Provider: {provider}\n"
        f"  Model:    {config['provider']['model']}\n"
        f"  MetaClaw: {'on' if config['metaclaw']['enabled'] else 'off'}\n\n"
        f"  Next: [bold]paganini ingest <corpus_dir>[/]",
        title="🎻 PAGANINI AIOS", border_style="green"
    ))


@cli.command()
@click.argument("corpus_dir")
def ingest(corpus_dir):
    """Ingest corpus documents into RAG pipeline."""
    from packages.rag.pipeline import RAGPipeline
    config = _load_config()
    config["corpus_dir"] = corpus_dir
    pipeline = RAGPipeline(config)

    with console.status("[bold green]Ingesting corpus..."):
        stats = pipeline.ingest(corpus_dir)

    console.print(Panel.fit(
        f"[bold green]✓ Corpus ingested[/]\n\n"
        f"  Files:  {stats['files']}\n"
        f"  Chunks: {stats['chunks']}\n"
        f"  Chars:  {stats['total_chars']:,}",
        title="📚 Ingestion Complete", border_style="green"
    ))


@cli.command()
@click.argument("question")
@click.option("--no-llm", is_flag=True, help="Retrieve only, skip LLM")
@click.option("--top-k", default=5, help="Chunks to retrieve")
@click.option("--verbose", "-v", is_flag=True, help="Show detailed output")
def query(question, no_llm, top_k, verbose):
    """Query the PAGANINI knowledge base.
    
    Flow: Agent dispatch → RAG retrieve → MetaClaw enrich → Moltis/LLM → Guardrails → Response
    """
    from packages.rag.pipeline import RAGPipeline
    from packages.kernel.moltis import get_llm_fn
    from packages.kernel.metaclaw import MetaClawProxy
    from packages.agents.framework import AgentRegistry, AgentDispatcher
    from packages.shared.guardrails import GuardrailPipeline

    config = _load_config()
    config["rag"]["top_k"] = top_k

    # 1. RAG Pipeline
    pipeline = RAGPipeline(config)
    if pipeline.collection.count() == 0:
        console.print("[red]✗ No documents indexed. Run: paganini ingest <corpus_dir>[/]")
        return

    # 2. MetaClaw
    metaclaw = MetaClawProxy(config)

    # 2.5 Agent dispatch
    registry = AgentRegistry()
    dispatcher = AgentDispatcher(registry)
    agent, agent_confidence = dispatcher.route(question)

    # 3. LLM (via Moltis or direct)
    llm_fn = None if no_llm else get_llm_fn(config)

    runtime_engine = config.get("runtime", {}).get("engine", "python")

    with console.status("[bold cyan]Querying..."):
        start = time.time()

        # Retrieve
        chunks = pipeline.retrieve(question)

        # Build context
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(
                f"[Fonte {i+1}: {chunk.source} | {chunk.section} | Score: {chunk.score:.2f}]\n{chunk.text}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # MetaClaw enrichment
        if metaclaw.enabled:
            context = metaclaw.enrich_query(question, context)

        # LLM call
        if llm_fn:
            agent_context = ""
            if agent:
                agent_context = f"\nVocê está atuando como o agente {agent.name}. {agent.role[:200]}\n"

            system_prompt = f"""Você é um especialista em FIDC (Fundos de Investimento em Direitos Creditórios) e regulamentação CVM.
{agent_context}
Regras:
1. Responda APENAS com base no contexto fornecido
2. Cite as fontes usando [Fonte N]
3. Se não encontrar a resposta no contexto, diga explicitamente
4. Seja preciso e objetivo — terminologia técnica correta"""

            user_prompt = f"Contexto:\n{context}\n\n---\n\nPergunta: {question}\n\nResponda citando fontes."
            response_text = llm_fn(system_prompt, user_prompt)
        else:
            response_text = f"[RAG sem LLM] {len(chunks)} chunks encontrados:\n\n{context}"

        elapsed = (time.time() - start) * 1000
        avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
        confidence = min(avg_score * 1.2, 1.0)

        # MetaClaw post-learning
        if metaclaw.enabled and llm_fn and confidence > 0.7:
            metaclaw.learn_from_interaction(question, response_text, chunks, confidence)

        # Guardrails check
        guardrails = GuardrailPipeline(config)
        guard_result = guardrails.check(question, response_text, chunks, confidence)

    # ── Output ──────────────────────────────────────
    if verbose:
        agent_name = agent.name if agent else "none"
        console.print(f"\n[dim]🧠 Runtime: {runtime_engine} | Model: {config['provider']['model']}[/]")
        console.print(f"[dim]🤖 Agent: {agent_name} (confiança: {agent_confidence:.2f})[/]")
        console.print(f"[dim]🔍 RAG: {len(chunks)} chunks | MetaClaw: {'on' if metaclaw.enabled else 'off'}[/]")
        if chunks:
            for c in chunks:
                console.print(f"[dim]   • {c.source} | {c.section} | {c.score:.2f}[/]")
        console.print(f"[dim]🛡️  Guardrails: {guard_result.summary}[/]")
        console.print(f"[dim]⏱️  {elapsed:.0f}ms | 📊 Confiança: {confidence:.2f}[/]\n")

    # Check if blocked
    if not guard_result.passed:
        console.print(Panel(
            f"[bold red]⛔ BLOQUEADO pelo guardrail: {guard_result.blocked_by}[/]\n\n"
            + "\n".join(f"  {g.gate}: {'✓' if g.passed else '✗'} {g.reason}" for g in guard_result.gates if not g.passed),
            title="🛡️ Guardrail Block",
            border_style="red", padding=(1, 2)
        ))
        return

    border = "green" if confidence > 0.7 else "yellow" if confidence > 0.4 else "red"
    console.print(Panel(
        response_text,
        title=f"📋 Resposta ({confidence:.0%} confiança)",
        border_style=border, padding=(1, 2)
    ))

    if verbose and chunks:
        table = Table(title="📎 Fontes", show_header=True, header_style="bold")
        table.add_column("#", width=3)
        table.add_column("Fonte", style="cyan")
        table.add_column("Seção")
        table.add_column("Score", justify="right")
        for i, c in enumerate(chunks):
            table.add_row(str(i+1), c.source, c.section, f"{c.score:.2f}")
        console.print(table)


@cli.command()
def status():
    """Show PAGANINI system status."""
    from packages.rag.pipeline import RAGPipeline
    from packages.kernel.moltis import MoltisAdapter
    from packages.kernel.metaclaw import MetaClawProxy

    config = _load_config()

    console.print("\n[bold]🎻 PAGANINI AIOS v0.1.0[/]\n")

    # Runtime
    runtime = config.get("runtime", {})
    engine = runtime.get("engine", "python")
    console.print(f"  Runtime:   {engine}")

    if engine == "moltis":
        adapter = MoltisAdapter(config)
        ms = adapter.status()
        installed = "[green]✓[/]" if ms["installed"] else "[red]✗[/]"
        running = "[green]✓[/]" if ms["running"] else "[yellow]stopped[/]"
        console.print(f"  Moltis:    {installed} installed | {running}")
        if ms["binary"]:
            console.print(f"  Binary:    {ms['binary']}")

    # Provider
    provider = config.get("provider", {})
    console.print(f"  Provider:  {provider.get('type', 'not set')}")
    console.print(f"  Model:     {provider.get('model', 'not set')}")

    # MetaClaw
    mc = MetaClawProxy(config)
    mcs = mc.status()
    mc_status = f"[green]on[/] ({mcs['skills_count']} skills)" if mcs["enabled"] else "[dim]off[/]"
    console.print(f"  MetaClaw:  {mc_status}")

    # RAG
    try:
        pipeline = RAGPipeline(config)
        rs = pipeline.status()
        console.print(f"  Chunks:    {rs['chunks_indexed']}")
    except Exception:
        console.print(f"  Chunks:    [red]error[/]")

    # Corpus
    corpus = config.get("corpus_dir", "")
    if corpus and Path(corpus).exists():
        files = list(Path(corpus).rglob("*.md"))
        console.print(f"  Corpus:    {len(files)} files")
    else:
        console.print(f"  Corpus:    [yellow]not configured[/]")

    console.print()


@cli.command("eval")
@click.option("--eval-set", default="eval_questions.jsonl", help="Path to eval questions")
@click.option("--with-llm", is_flag=True, help="Run with LLM (slower, measures answer quality)")
def eval_cmd(eval_set, with_llm):
    """Run RAG evaluation suite."""
    from packages.rag.pipeline import RAGPipeline
    from packages.rag.eval import run_eval, print_report
    from packages.kernel.moltis import get_llm_fn

    config = _load_config()
    pipeline = RAGPipeline(config)

    if pipeline.collection.count() == 0:
        console.print("[red]✗ No documents indexed. Run: paganini ingest <corpus_dir>[/]")
        return

    llm_fn = get_llm_fn(config) if with_llm else None

    with console.status("[bold cyan]Running evaluation..."):
        metrics = run_eval(pipeline, eval_set, llm_fn=llm_fn)

    print_report(metrics)


@cli.command()
def doctor():
    """Diagnose PAGANINI installation."""
    from packages.kernel.moltis import MoltisAdapter

    checks = []

    # Python
    v = sys.version_info
    checks.append(("Python 3.11+", v.major == 3 and v.minor >= 11, f"{v.major}.{v.minor}.{v.micro}"))

    # Moltis
    import shutil
    moltis_bin = shutil.which("moltis")
    checks.append(("Moltis binary", bool(moltis_bin), moltis_bin or "not found (run install.sh)"))

    # Dependencies
    for pkg in ["chromadb", "litellm", "click", "rich", "yaml", "httpx"]:
        try:
            __import__(pkg)
            checks.append((f"Package: {pkg}", True, "installed"))
        except ImportError:
            checks.append((f"Package: {pkg}", False, "missing"))

    # Config
    config_exists = Path("config.yaml").exists()
    checks.append(("Config", config_exists, "config.yaml" if config_exists else "run: paganini init"))

    # Moltis health
    if config_exists:
        config = _load_config()
        adapter = MoltisAdapter(config)
        running = adapter.is_running()
        checks.append(("Moltis gateway", running, "responding" if running else "not running"))

    table = Table(title="🩺 PAGANINI Doctor", show_header=True)
    table.add_column("Check")
    table.add_column("Status")
    table.add_column("Details")
    for name, ok, detail in checks:
        status_str = "[green]✓[/]" if ok else "[red]✗[/]"
        table.add_row(name, status_str, str(detail))
    console.print(table)


@cli.command("up")
def up():
    """Start PAGANINI services (Moltis + MetaClaw)."""
    from packages.kernel.moltis import MoltisAdapter

    config = _load_config()
    runtime = config.get("runtime", {})
    engine = runtime.get("engine", "python")

    if engine == "moltis":
        adapter = MoltisAdapter(config)
        if adapter.is_running():
            console.print("[green]✓ Moltis already running[/]")
        elif adapter.is_installed:
            with console.status("Starting Moltis gateway..."):
                if adapter.start():
                    console.print("[green]✓ Moltis gateway started[/]")
                else:
                    console.print("[red]✗ Failed to start Moltis[/]")
                    console.print("  Run manually: moltis gateway start")
        else:
            console.print("[yellow]⚠ Moltis not installed. Run install.sh or use --runtime python[/]")

    elif engine == "docker":
        os.system("docker compose -f infra/docker-compose.yaml up -d")

    console.print(Panel.fit(
        "[bold green]PAGANINI AIOS ready.[/]\n\n"
        "  [bold]paganini query \"sua pergunta\"[/]\n"
        "  [bold]paganini status[/]",
        title="🎻", border_style="green"
    ))


if __name__ == "__main__":
    cli()
