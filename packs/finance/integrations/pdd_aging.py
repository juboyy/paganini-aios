"""PDD Aging Calculator — Provision for Doubtful Debts by aging bucket.

Calculates provisions based on receivable aging following BACEN guidelines.
7 buckets: 0-30d, 31-60d, 61-90d, 91-120d, 121-150d, 151-180d, >180d.
"""

from dataclasses import dataclass
from typing import Optional


# BACEN-aligned provision rates by aging bucket
DEFAULT_PROVISION_RATES = {
    "0-30d": 0.005,    # 0.5%
    "31-60d": 0.01,    # 1%
    "61-90d": 0.03,    # 3%
    "91-120d": 0.10,   # 10%
    "121-150d": 0.30,  # 30%
    "151-180d": 0.50,  # 50%
    ">180d": 1.00,     # 100%
}


@dataclass
class AgingBucket:
    """A single aging bucket with outstanding and provision amounts."""
    label: str
    outstanding: float
    provision_rate: float

    @property
    def provision_amount(self) -> float:
        return round(self.outstanding * self.provision_rate, 2)

    @property
    def net_amount(self) -> float:
        return round(self.outstanding - self.provision_amount, 2)


@dataclass
class AgingReport:
    """Complete PDD aging report for a fund portfolio."""
    buckets: list[AgingBucket]
    fund_name: str = ""
    report_date: str = ""

    @property
    def total_outstanding(self) -> float:
        return sum(b.outstanding for b in self.buckets)

    @property
    def total_provision(self) -> float:
        return sum(b.provision_amount for b in self.buckets)

    @property
    def weighted_provision_rate(self) -> float:
        total = self.total_outstanding
        if total == 0:
            return 0
        return round(self.total_provision / total, 4)

    @property
    def net_portfolio(self) -> float:
        return round(self.total_outstanding - self.total_provision, 2)

    def to_dict(self) -> dict:
        return {
            "fund_name": self.fund_name,
            "report_date": self.report_date,
            "buckets": [
                {
                    "label": b.label,
                    "outstanding": b.outstanding,
                    "provision_rate": b.provision_rate,
                    "provision_amount": b.provision_amount,
                    "net_amount": b.net_amount,
                }
                for b in self.buckets
            ],
            "totals": {
                "outstanding": self.total_outstanding,
                "provision": self.total_provision,
                "weighted_rate": self.weighted_provision_rate,
                "net_portfolio": self.net_portfolio,
            },
        }


def calculate_aging(
    receivables: dict[str, float],
    custom_rates: Optional[dict[str, float]] = None,
    fund_name: str = "",
) -> AgingReport:
    """Calculate PDD aging from a dict of {bucket_label: outstanding_amount}.
    
    Args:
        receivables: dict mapping aging bucket labels to outstanding amounts
        custom_rates: optional custom provision rates (defaults to BACEN-aligned)
        fund_name: optional fund name for the report
    
    Returns:
        AgingReport with all buckets calculated
    """
    rates = custom_rates or DEFAULT_PROVISION_RATES
    buckets = []

    for label in DEFAULT_PROVISION_RATES:
        outstanding = receivables.get(label, 0)
        rate = rates.get(label, DEFAULT_PROVISION_RATES[label])
        buckets.append(AgingBucket(
            label=label,
            outstanding=outstanding,
            provision_rate=rate,
        ))

    return AgingReport(
        buckets=buckets,
        fund_name=fund_name,
    )


def calculate_covenant_status(
    nav: float,
    cash: float,
    total_receivables: float,
    delinquent_amount: float,
    subordinated_quota: float,
    thresholds: Optional[dict] = None,
) -> dict:
    """Calculate covenant compliance status.
    
    Returns dict with liquidity, subordination, and delinquency ratios
    plus compliance status for each.
    """
    thresholds = thresholds or {
        "liquidity_min": 1.5,
        "subordination_min": 25.0,
        "delinquency_max": 5.0,
    }

    liquidity = round(cash / max(nav * 0.1, 1), 2)  # cash / 10% NAV
    subordination = round((subordinated_quota / max(nav, 1)) * 100, 2)
    delinquency = round((delinquent_amount / max(total_receivables, 1)) * 100, 2)

    return {
        "liquidity": {
            "value": liquidity,
            "threshold": thresholds["liquidity_min"],
            "status": "PASS" if liquidity >= thresholds["liquidity_min"] else "BREACH",
            "unit": "x",
        },
        "subordination": {
            "value": subordination,
            "threshold": thresholds["subordination_min"],
            "status": "PASS" if subordination >= thresholds["subordination_min"] else "BREACH",
            "unit": "%",
        },
        "delinquency": {
            "value": delinquency,
            "threshold": thresholds["delinquency_max"],
            "status": "PASS" if delinquency <= thresholds["delinquency_max"] else "BREACH",
            "unit": "%",
        },
        "overall": "COMPLIANT" if all([
            liquidity >= thresholds["liquidity_min"],
            subordination >= thresholds["subordination_min"],
            delinquency <= thresholds["delinquency_max"],
        ]) else "NON-COMPLIANT",
    }
