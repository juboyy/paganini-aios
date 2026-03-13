# PinchTab — Browser Automation Layer

## Role in PAGANINI AIOS

PinchTab provides headless Chrome automation for agents that need web interaction:
- Regulatory Watch: scrape CVM/ANBIMA/BACEN portals
- Due Diligence: extract judicial records, media mentions
- Market Data: scrape sources without API
- Dashboard: generate screenshots for reports

## Why PinchTab (not Moltis browser)

- Token-efficient: ~800 tokens per page (accessibility tree) vs ~5-10K (screenshots)
- Headless: no display required on server
- Snapshot-based: structured data extraction, not pixel analysis
- Multi-tab: parallel scraping for batch operations

## Architecture

```
Agent (via RLM REPL)
    ↓
pinchtab.navigate(url)
pinchtab.snapshot()        → accessibility tree (structured)
pinchtab.screenshot()      → PNG (visual evidence for audit)
pinchtab.click(ref)        → interact with page elements
pinchtab.extract(selector) → extract specific data
```

## Integration with Moltis

PinchTab runs as a sidecar process in the tmux session:

```
tmux session: paganini
├── ...
├── 7:pinchtab   ← PinchTab server (port 9867)
└── ...
```

Agents access via HTTP API: `http://localhost:9867`

## Use Cases

### Regulatory Watch
```python
# In RLM REPL
tabs = pinchtab.open("https://www.gov.br/cvm/pt-br/assuntos/normas")
snapshot = pinchtab.snapshot(tabs[0])
new_regulations = extract_new_publications(snapshot)
for reg in new_regulations:
    impact = llm(f"Analyze impact of {reg} on fund {fund_id}")
```

### Due Diligence
```python
# Judicial search
pinchtab.navigate(f"https://esaj.tjsp.jus.br/cpopg/search?q={cnpj}")
results = pinchtab.snapshot()
processes = parse_judicial_results(results)
```

### Evidence Collection
```python
# Screenshot for audit trail
screenshot = pinchtab.screenshot(full_page=True)
save_to_trace(screenshot, operation_id=op_id, type="regulatory_evidence")
```

## Configuration

```yaml
# config.yaml addition
pinchtab:
  enabled: true
  port: 9867
  chrome_bin: auto           # auto-detect or specify path
  headless: true
  timeout_ms: 30000
  max_tabs: 10
  screenshot_dir: runtime/screenshots/
```
