# QMD — Quarto Markdown Documentation & Reporting

## Role in PAGANINI AIOS

QMD (Quarto Markdown) is the documentation and reporting engine for PAGANINI AIOS.
It generates professional-grade financial reports from structured data.

## Why QMD

- Markdown-native: agents write markdown, QMD renders to PDF/HTML/DOCX
- Parameterized: same template, different fund data
- Reproducible: every report is version-controlled and re-renderable
- Multi-format: PDF for regulators, HTML for dashboard, DOCX for clients
- Code execution: embedded Python/R chunks for live calculations

## Report Types

| Report | Format | Frequency | Recipient |
|--------|--------|-----------|-----------|
| Informe Mensal | PDF | Monthly | CVM |
| CADOC 3040 | XML + PDF | As required | BACEN |
| ICVM 489 | PDF | Quarterly | Cotistas |
| COFIs | PDF | Monthly | Internal |
| Due Diligence Report | PDF | Per cedente | Gestão |
| Impact Assessment | HTML | Per regulation | Compliance |
| Fund Performance | HTML | Monthly | Cotistas (Slack) |
| Audit Package | PDF bundle | Annually | Auditor |

## Template Structure

```
packages/reporting/
├── templates/
│   ├── informe-mensal.qmd      # CVM monthly report
│   ├── cadoc-3040.qmd          # BACEN regulatory
│   ├── icvm-489.qmd            # Financial statements
│   ├── cofis.qmd               # Accounting reports
│   ├── due-diligence.qmd       # DD report template
│   ├── impact-assessment.qmd   # Regulatory impact
│   ├── fund-performance.qmd    # Cotista performance
│   └── audit-package.qmd       # Annual audit bundle
├── partials/
│   ├── header.qmd              # Standard header with fund info
│   ├── disclaimer.qmd          # Legal disclaimer
│   └── signatures.qmd          # Digital signatures block
└── styles/
    ├── paganini.scss            # Brand styling
    └── regulatory.scss          # Formal regulatory styling
```

## Integration with Agents

```python
# Reporting agent generates QMD
def generate_informe_mensal(fund_id, period):
    # 1. Gather data
    fund = fund.info(fund_id)
    carteira = fund.carteira(fund_id)
    metrics = calculate_monthly_metrics(carteira, period)
    
    # 2. Render QMD template with data
    report = qmd.render(
        template="informe-mensal.qmd",
        params={
            "fund": fund,
            "period": period,
            "metrics": metrics,
            "carteira": carteira
        },
        format="pdf"
    )
    
    # 3. Store immutably
    save_report(report, fund_id, period, type="informe-mensal")
    
    # 4. Submit to CVM (if auto-submission enabled)
    if fund.auto_submit:
        submit_to_cvm(report)
    
    return report
```

## CLI

```bash
# Generate specific report
paganini report informe-mensal --fund alpha --period 2026-02

# Generate all monthly reports
paganini report monthly --all-funds

# Preview report (HTML)
paganini report preview --template due-diligence.qmd --params params.json

# Batch render audit package
paganini report audit-package --fund alpha --year 2025
```

## Configuration

```yaml
# config.yaml addition
qmd:
  enabled: true
  quarto_path: auto           # auto-detect or specify
  output_dir: runtime/reports/
  templates_dir: packages/reporting/templates/
  default_format: pdf
  brand:
    logo: assets/paganini-logo.png
    colors:
      primary: "#1a1a2e"
      accent: "#e94560"
  signatures:
    digital: true
    provider: ICP-Brasil       # Brazilian digital certificate standard
```
