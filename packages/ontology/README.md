# FIDC Domain Ontology — PAGANINI AIOS

Knowledge graph schema for the FIDC domain.

## Entity Types

- `Regulação` — CVM resolutions, articles, ofícios circulares
- `Fundo` — FIDC types (Padronizado, NP, Infra, ESG, etc.)
- `Cota` — Sênior, Mezanino, Subordinada (with hierarchy)
- `Ativo` — Direitos creditórios, tipos de recebíveis
- `Participante` — Administrador, Custodiante, Gestor, Cedente, Sacado
- `Processo` — Onboarding, cessão, liquidação, waterfall
- `Risco` — Crédito, mercado, liquidez, operacional, legal
- `Relatório` — CADOC 3040, ICVM 489, COFIs, informe mensal
- `Covenant` — Cláusulas contratuais com trigger events
- `Contabilidade` — IFRS9, PDD, PCE, provisão

## Relation Types

- `regula` — Regulação → Fundo/Processo
- `compoe` — Cota → Fundo
- `subordinada_a` — Cota → Cota
- `origina` — Cedente → Ativo
- `deve` — Sacado → Ativo
- `custodia` — Custodiante → Ativo
- `reporta` — Relatório → Fundo/Regulação
- `monitora` — Covenant → Fundo
- `provisiona` — PDD → Ativo
