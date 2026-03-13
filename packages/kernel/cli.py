"""PAGANINI AIOS CLI — Deploy and manage the financial AI operating system."""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="paganini",
        description="PAGANINI AIOS — AI Operating System for Financial Markets",
    )
    sub = parser.add_subparsers(dest="command")

    # Status
    sub.add_parser("status", help="Show system status")

    # Ingest
    ingest = sub.add_parser("ingest", help="Ingest corpus into RAG pipeline")
    ingest.add_argument("path", help="Path to corpus directory")
    ingest.add_argument("--force", action="store_true", help="Re-ingest all files")

    # Query
    query = sub.add_parser("query", help="Query the knowledge base")
    query.add_argument("question", nargs="+", help="Question to ask")
    query.add_argument("--fund", help="Scope to specific fund")
    query.add_argument("--mode", choices=["semantic", "exact", "hybrid", "graph"], default="hybrid")

    # Agents
    agents = sub.add_parser("agents", help="Manage agents")
    agents.add_argument("action", choices=["list", "start", "stop", "status"])
    agents.add_argument("--agent", help="Specific agent name")

    # Deploy
    deploy = sub.add_parser("deploy", help="Deploy PAGANINI AIOS")
    deploy.add_argument("--target", choices=["local", "docker", "remote"], default="local")
    deploy.add_argument("--host", help="Remote host for SSH deploy")

    # Eval
    sub.add_parser("eval", help="Run RAG evaluation suite")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    if args.command == "status":
        print("PAGANINI AIOS v0.1.0")
        print("Status: INITIALIZING")
        print("Corpus: data/corpus/fidc/ (164 files, 5.6MB)")
        print("Agents: 0 running")
        print("Model: BYOK (not configured)")

    elif args.command == "ingest":
        print(f"Ingesting corpus from: {args.path}")
        print("Pipeline: parse → chunk → extract → embed → graph")
        # TODO: implement

    elif args.command == "query":
        question = " ".join(args.question)
        print(f"Query: {question}")
        print(f"Mode: {args.mode}")
        # TODO: implement

    elif args.command == "deploy":
        print(f"Deploying to: {args.target}")
        if args.target == "remote" and args.host:
            print(f"Host: {args.host}")
        # TODO: implement

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
