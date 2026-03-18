# REASONING.md — Estrutura de Raciocínio Unificada
# Fusão BMAD-CE + Superpowers (obra/superpowers)
# Aplica-se a: OraCLI (workspace) e PAGANINI AIOS (produto)

> Não é uma substituição do BMAD-CE. É uma evolução.
> Superpowers traz disciplina mecânica ao que o BMAD-CE define em stages.

---

## Iron Laws (Leis de Ferro)

Importadas do Superpowers. Não-negociáveis. Violação = parar, reverter, refazer.

```
1. NO CODE WITHOUT DESIGN FIRST
   → Brainstorming skill: nenhuma implementação até design aprovado.
   → Mapeia para: BMAD Stage 2 (PRD) + Stage 4 (Architecture)

2. NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
   → TDD skill: RED-GREEN-REFACTOR. Escreveu código antes do teste? Deleta.
   → Mapeia para: BMAD Stage 13 (QA)

3. NO FIXES WITHOUT ROOT CAUSE INVESTIGATION
   → Systematic debugging: 4 fases. Sem hypothesis = sem fix.
   → Mapeia para: BMAD Stage 1 (Context Scout) aplicado a bugs

4. NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION
   → Verification skill: evidência > claims. "Should work" = mentira.
   → Mapeia para: BMAD Stage 13 (QA) + Stage 14 (Deploy smoke test)

5. NO IMPLEMENTATION WITHOUT GATE TOKEN
   → Pre-Execution Gate (nosso): gate.py gera token. Sem token = violação.
   → Já existe. Superpowers reforça com seu próprio hard-gate pattern.
```

---

## Pipeline Unificado

```
BMAD-CE Stage          Superpowers Skill              Quem Executa
─────────────────────  ─────────────────────────────  ────────────
 1. Context Scout      (nosso gate.py)                OraCLI
 2. PRD                brainstorming                  PM Agent
 3. Research           brainstorming (questions)      General Agent
 4. Architecture       brainstorming → design doc     Architect Agent
 5. UX Design          brainstorming (visual comp.)   General Agent
 6. Business Analyst   brainstorming (constraints)    PM Agent
 7. Scrum Master       writing-plans                  PM Agent
 8. Create Story       writing-plans (bite-sized)     PM Agent
 9. Review Checklist   spec-review-loop               Architect Agent
10. Specifier          writing-plans (exact paths)    Code Agent
11. Dev Senior         subagent-driven-development    Code Agent → Codex
12. Code Review        two-stage-review               Code Agent + Security
13. QA                 test-driven-development        QA Agent
14. Deploy             verification-before-completion Infra Agent
15. Stakeholder Review requesting-code-review         Docs + General
16. Retrospective      (nosso memory-reflection)      Docs Agent
17. Knowledge Writer   (nosso MEMORY.md)              Docs Agent
18. Metrics Logger     (nosso OTel)                   Infra + Data
```

---

## Novos Padrões Integrados

### 1. Brainstorming Gate (Stages 2-5)

**Antes:** BMAD dizia "PM Agent produz PRD" sem detalhar como.
**Agora:** Brainstorming skill define o processo exato.

```
TRIGGER: Qualquer task que envolve criar/modificar funcionalidade

PROCESSO:
  1. Explorar contexto (git log, docs, commits recentes)
  2. Perguntas clarificadoras — UMA POR VEZ
     → Não fazer 10 perguntas num bloco. Uma. Esperar resposta. Próxima.
  3. Propor 2-3 abordagens com trade-offs e recomendação
  4. Apresentar design em seções (digeríveis, não wall of text)
  5. Aprovação humana obrigatória antes de prosseguir
  6. Escrever design doc → docs/specs/YYYY-MM-DD-<topic>-design.md
  7. Spec review loop (subagente reviewer, max 5 iterações)
  8. Humano revisa spec escrita
  9. Transição para writing-plans

HARD GATE:
  Nenhuma implementação, nenhum código, nenhum scaffold
  até design apresentado E aprovado. ZERO exceções.
  Mesmo que pareça "simples demais pra precisar de design".
```

### 2. Writing Plans (Stages 7-10)

**Antes:** BMAD dizia "PM cria story.md com tasks e dependências".
**Agora:** Plans são receitas para "junior entusiasmado com zero taste".

```
FORMATO DE TASK:
  ### Task N: [Nome do Componente]

  **Arquivos:**
  - Criar: `caminho/exato/arquivo.py`
  - Modificar: `caminho/exato/existente.py:123-145`
  - Testar: `tests/caminho/exato/test_arquivo.py`

  - [ ] **Step 1: Escrever teste falhando**
  ```python
  def test_comportamento_especifico():
      resultado = funcao(entrada)
      assert resultado == esperado
  ```

  - [ ] **Step 2: Rodar teste, verificar que falha**
  Run: `pytest tests/path/test.py::test_name -v`
  Esperado: FAIL com "funcao not defined"

  - [ ] **Step 3: Implementar código mínimo**
  ```python
  def funcao(entrada):
      return esperado
  ```

  - [ ] **Step 4: Rodar teste, verificar que passa**
  - [ ] **Step 5: Commit**

REGRAS:
  - Cada step: 2-5 minutos
  - Código COMPLETO no plan (nunca "adicionar validação")
  - Comandos EXATOS com output esperado
  - Paths EXATOS (nunca "no diretório relevante")
  - DRY, YAGNI, TDD, commits frequentes
  - Se spec cobre múltiplos subsistemas → quebrar em plans separados
```

### 3. Subagent-Driven Development (Stage 11)

**Antes:** Code Agent invocava Codex com spec.md genérica.
**Agora:** Cada task roda em subagente isolado com two-stage review.

```
POR TASK:
  1. Despachar subagente implementador
     → Context crafted (NUNCA herdar sessão do orquestrador)
     → Task específica do plan com todos os detalhes
  2. Subagente implementa, testa, commita
  3. Despachar subagente SPEC REVIEWER
     → Verifica: código implementa o que a spec pede?
     → Se falhar → implementador corrige → re-review
  4. Despachar subagente CODE QUALITY REVIEWER
     → Verifica: código é limpo, seguro, performante?
     → Se falhar → implementador corrige → re-review
  5. Marcar task como completa
  6. Próxima task

REGRAS:
  - FRESH subagent per task (zero context pollution)
  - Orquestrador CRAFTA o prompt (não herda história)
  - Two-stage review: spec compliance DEPOIS code quality
  - Subagente que pergunta → orquestrador responde → re-dispatch
```

### 4. Test-Driven Development (Stage 13)

**Antes:** QA Agent "executa testes".
**Agora:** TDD é lei. RED-GREEN-REFACTOR mandatório.

```
RED:
  - Escrever UM teste mostrando o comportamento desejado
  - Nome CLARO descrevendo comportamento (não "test1")
  - Testar UMA coisa (se tem "and" no nome → split)
  - Código REAL (sem mocks a menos que inevitável)

VERIFY RED:
  - RODAR o teste
  - CONFIRMAR que falha (não erro, falha)
  - CONFIRMAR que falha pelo motivo certo
  → Passou? Está testando comportamento existente. Corrigir teste.

GREEN:
  - Código MÍNIMO para passar
  - Não adicionar features, não refatorar, não "melhorar"
  → YAGNI: se o teste não pede, não implementar

VERIFY GREEN:
  - RODAR o teste + todos os outros
  - CONFIRMAR que passa
  - CONFIRMAR que outros testes não quebraram
  → Falhou? Corrigir CÓDIGO, não teste.

REFACTOR:
  - SÓ depois de green
  - Remover duplicação, melhorar nomes, extrair helpers
  - Manter testes green

IRON LAW:
  Escreveu código antes do teste? DELETAR. Recomeçar do teste.
  Não manter como "referência". Não "adaptar" enquanto escreve testes.
  Delete = delete.
```

### 5. Systematic Debugging (Aplicável em qualquer Stage)

**Antes:** Bugs eram corrigidos ad-hoc.
**Agora:** 4 fases obrigatórias antes de qualquer fix.

```
FASE 1 — ROOT CAUSE INVESTIGATION (obrigatória antes de qualquer fix):
  1. Ler mensagens de erro COMPLETAMENTE (não pular)
  2. Reproduzir consistentemente (se não reproduz → mais dados)
  3. Checar mudanças recentes (git diff, commits, config)
  4. Em sistemas multi-camada: instrumentar CADA boundary
  5. Trace data flow (onde o valor ruim origina?)

FASE 2 — PATTERN ANALYSIS:
  1. Encontrar exemplos FUNCIONAIS similares no codebase
  2. Comparar contra referência (ler COMPLETAMENTE, não skimmar)
  3. Listar TODAS as diferenças (não assumir "isso não importa")
  4. Entender dependências

FASE 3 — HYPOTHESIS AND TESTING:
  1. Formar UMA hipótese: "X é root cause porque Y"
  2. Testar com a MENOR mudança possível
  3. UMA variável por vez
  → Não funcionou? Nova hipótese. NÃO empilhar fixes.

FASE 4 — IMPLEMENTATION:
  1. Criar test case falhando (TDD)
  2. Implementar UMA correção
  3. Verificar fix
  4. Verificar que nada mais quebrou
```

### 6. Verification Before Completion (Stages 13-14)

**Antes:** "55/55 testes passando" era afirmado.
**Agora:** Claim sem evidência = mentira.

```
GATE FUNCTION (antes de qualquer claim de "pronto"):
  1. IDENTIFICAR: qual comando prova este claim?
  2. RODAR: executar o comando COMPLETO (fresh, nesta mensagem)
  3. LER: output inteiro, exit code, contar falhas
  4. VERIFICAR: output confirma o claim?
     → NÃO: reportar status real com evidência
     → SIM: reportar claim COM evidência
  5. SÓ ENTÃO: fazer o claim

RED FLAGS (parar imediatamente):
  - Usar "should", "probably", "seems to"
  - Expressar satisfação antes de verificação ("Great!", "Done!")
  - Confiar em report de subagente sem verificar diff
  - Verificação parcial
  - "I'm confident" (confiança ≠ evidência)
```

### 7. Parallel Agent Dispatch (Otimização de qualquer Stage)

**Antes:** Subagentes disparados em paralelo sem critério formal.
**Agora:** Critério claro de quando paralelizar.

```
USAR QUANDO:
  - 2+ tasks independentes (sem shared state)
  - Cada problema pode ser entendido sem contexto dos outros
  - Agentes não vão interferir entre si (mesmos arquivos = sequencial)

NÃO USAR QUANDO:
  - Falhas são relacionadas (fix de um pode resolver outro)
  - Precisa entender estado completo do sistema
  - Tasks tocam os mesmos arquivos

CADA AGENTE RECEBE:
  - Scope específico (um arquivo/subsistema)
  - Goal claro (o que fazer)
  - Constraints (o que NÃO tocar)
  - Expected output (o que retornar)

DEPOIS:
  - Ler sumário de cada agente
  - Verificar que fixes não conflitam
  - Rodar suite completa de testes
  - Integrar todas as mudanças
```

---

## Mapeamento para PAGANINI AIOS

Os mesmos padrões se aplicam aos agentes do produto, não só ao desenvolvimento:

| Superpowers Pattern | PAGANINI Equivalente |
|---|---|
| Brainstorming gate | Guardrails gate (nenhuma operação sem validação) |
| Writing plans | Daemon task plans (covenant check steps documentados) |
| Subagent-driven dev | Agent dispatch via Cognitive Router |
| TDD | Eval harness (eval.py nunca modificado pelo LLM) |
| Systematic debugging | Root cause antes de ajustar PDD ou covenant |
| Verification before completion | Confidence score obrigatório em toda resposta |
| Parallel dispatch | Multi-agent queries para perguntas cross-domain |
| Two-stage review | Guardrails (compliance) + Sense (quality) |

---

## Checklist de Sessão

No início de cada sessão que envolve implementação:

```
□ Gate token obtido (gate.py)
□ Brainstorming completo (design aprovado)
□ Plan escrito (bite-sized, paths exatos, código completo)
□ Testes escritos ANTES do código
□ Subagente por task (context crafted, não herdado)
□ Two-stage review (spec + quality)
□ Verificação com evidência (comandos rodados nesta sessão)
□ Knowledge persistido (Stage 17)
```

---

## Onde Este Doc Vive

- **OraCLI:** `/home/node/.openclaw/workspace/REASONING.md`
- **PAGANINI:** `paganini/docs/architecture/reasoning.md` (referência para desenvolvimento)
- **Subagentes:** Recebem seções relevantes via context crafting (não o doc inteiro)

---

*Fusão BMAD-CE + obra/superpowers. Março 2026.*
*Credit: Jesse Vincent (obra) pelo framework Superpowers.*
