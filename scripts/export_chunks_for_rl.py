#!/usr/bin/env python3
"""Export RAG chunks as structured training data for RL.

Outputs JSONL with each chunk as a training sample:
- input: question that this chunk answers
- context: the chunk text
- source: origin file
- section: section title
- metadata: guardrails, regulatory refs

For GRPO: the reward signal comes from guardrail pass/fail + confidence.
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path("runtime/data")
BM25_PATH = DATA_DIR / "bm25_index.json"
OUTPUT_PATH = Path("runtime/rl-training-data.jsonl")


def generate_questions(chunk_text: str, source: str, section: str) -> list[str]:
    """Generate synthetic questions from chunk content.
    
    In production, this would use an LLM. For now, template-based.
    """
    questions = []
    
    # Source-based templates
    templates = {
        "cvm-175": [
            f"O que a CVM 175 diz sobre {section.lower()}?",
            f"Quais são as regras de {section.lower()} segundo a regulamentação?",
        ],
        "cvm-240": [
            f"Como a CVM 240 trata {section.lower()}?",
            f"Quais as implicações da CVM 240 para {section.lower()}?",
        ],
        "covenants": [
            f"O que são {section.lower()} em FIDCs?",
            f"Como funcionam os {section.lower()}?",
        ],
        "due-diligence": [
            f"Qual o processo de {section.lower()} para cedentes?",
            f"O que verificar em {section.lower()}?",
        ],
        "pld-aml": [
            f"Quais as obrigações de PLD/AML para {section.lower()}?",
            f"Como funciona {section.lower()} em compliance FIDC?",
        ],
        "stress-test": [
            f"Como realizar {section.lower()} em FIDC?",
            f"Quais cenários de {section.lower()} são obrigatórios?",
        ],
        "subordinacao": [
            f"O que é {section.lower()} em FIDCs?",
            f"Como funciona a {section.lower()}?",
        ],
        "obrigacoes-custodiante": [
            f"Quais são as {section.lower()} do custodiante?",
            f"O que o custodiante deve fazer em {section.lower()}?",
        ],
        "fundamentos": [
            f"Explique {section.lower()} de FIDCs.",
            f"O que é {section.lower()}?",
        ],
        "guardrails": [
            f"Como funciona o guardrail de {section.lower()}?",
            f"Qual o limite de {section.lower()}?",
        ],
        "operacoes": [
            f"Como funciona {section.lower()} em FIDC?",
            f"Qual o processo de {section.lower()}?",
        ],
        "paganini": [
            f"Como o Paganini trata {section.lower()}?",
            f"O que o Paganini faz em {section.lower()}?",
        ],
    }
    
    # Match source to template group
    source_lower = source.lower()
    for key, tmpl_list in templates.items():
        if key in source_lower:
            questions.extend(tmpl_list)
            break
    
    # Fallback generic
    if not questions:
        questions = [
            f"Explique {section.lower()} no contexto de FIDCs.",
            f"O que é {section.lower()}?",
        ]
    
    return questions


def main():
    if not BM25_PATH.exists():
        print("❌ BM25 index not found. Run: paganini ingest <corpus_dir>")
        sys.exit(1)
    
    data = json.load(open(BM25_PATH))
    ids = data["ids"]
    metadatas = data["metadatas"]
    
    # BM25 stores tf (term frequencies) per doc, but not raw text
    # We need to read chunks from the corpus files directly
    # Re-chunk using the same logic as RAGPipeline
    
    # Instead, get from Chroma which stores documents
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(DATA_DIR / "chroma"))
        collection = client.get_or_create_collection("corpus")
        result = collection.get(
            ids=ids,
            include=["documents", "metadatas"]
        )
        documents = result["documents"]
        metas = result["metadatas"]
    except Exception as e:
        print(f"⚠ Chroma unavailable ({e}), falling back to re-reading corpus files")
        # Fallback: re-read and chunk
        documents = []
        metas = metadatas
        for m in metadatas:
            documents.append("[" + m.get("source", "?") + "] " + m.get("section", "?"))
    
    # Export as JSONL training data
    samples = []
    for i, (doc, meta) in enumerate(zip(documents, metas)):
        source = meta.get("source", "unknown")
        section = meta.get("section", "unknown")
        
        questions = generate_questions(doc, source, section)
        
        for q in questions:
            sample = {
                "id": ids[i] if i < len(ids) else f"chunk-{i}",
                "input": q,
                "context": doc,
                "expected_source": source,
                "expected_section": section,
                "metadata": {k: v for k, v in meta.items() if k not in ("source", "section")},
            }
            samples.append(sample)
    
    # Write JSONL
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    
    print(f"✅ Exported {len(samples)} training samples from {len(documents)} chunks")
    print(f"   Sources: {len(set(m.get("source", "?") for m in metas))}")
    print(f"   Output: {OUTPUT_PATH}")
    
    # Also export a summary
    summary = {
        "total_samples": len(samples),
        "total_chunks": len(documents),
        "sources": list(set(m.get("source", "?") for m in metas)),
        "avg_context_length": sum(len(d) for d in documents) // max(len(documents), 1),
    }
    summary_path = OUTPUT_PATH.with_suffix(".json")
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"   Summary: {summary_path}")


if __name__ == "__main__":
    main()
