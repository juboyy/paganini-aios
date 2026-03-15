"""Tests for packages/modules/ — vertical solution configs."""

import pytest
from packages.modules import list_modules, load_module, get_module_agents, get_module_guardrails


EXPECTED_MODULES = [
    "covenant-monitor",
    "due-diligence",
    "regulatory-watch",
    "risk-scanner",
    "pld-aml",
]


def test_list_modules_returns_all():
    mods = list_modules()
    names = [m["name"] for m in mods]
    for expected in EXPECTED_MODULES:
        assert expected in names, f"Module '{expected}' not found in {names}"


def test_list_modules_have_required_fields():
    mods = list_modules()
    for m in mods:
        assert "name" in m
        assert "version" in m
        assert "description" in m
        assert len(m["description"]) > 10, f"Module {m['name']} has weak description"


@pytest.mark.parametrize("module_name", EXPECTED_MODULES)
def test_load_module_returns_dict(module_name):
    mod = load_module(module_name)
    assert mod is not None, f"Module '{module_name}' could not be loaded"
    assert isinstance(mod, dict)
    assert mod["name"] == module_name


@pytest.mark.parametrize("module_name", EXPECTED_MODULES)
def test_module_has_agents(module_name):
    agents = get_module_agents(module_name)
    assert len(agents) >= 1, f"Module '{module_name}' has no agents"


@pytest.mark.parametrize("module_name", EXPECTED_MODULES)
def test_module_has_guardrails(module_name):
    gates = get_module_guardrails(module_name)
    assert len(gates) >= 1, f"Module '{module_name}' has no guardrails"


def test_load_nonexistent_module():
    assert load_module("nonexistent-module-xyz") is None


def test_covenant_monitor_has_thresholds():
    mod = load_module("covenant-monitor")
    assert "thresholds" in mod
    assert mod["thresholds"]["overcollateralization_warning"] > 1.0


def test_due_diligence_has_scoring():
    mod = load_module("due-diligence")
    assert "scoring" in mod
    weights = mod["scoring"]["weights"]
    total = sum(weights.values())
    assert abs(total - 1.0) < 0.01, f"Scoring weights sum to {total}, expected 1.0"


def test_pld_aml_has_detection_rules():
    mod = load_module("pld-aml")
    assert "detection_rules" in mod
    rules = mod["detection_rules"]
    assert "structuring" in rules
    assert "sanctions_match" in rules
    assert "pep_check" in rules


def test_risk_scanner_has_ifrs9_stages():
    mod = load_module("risk-scanner")
    assert "risk_parameters" in mod
    stages = mod["risk_parameters"]["pdd_stages"]
    assert "stage_1" in stages
    assert "stage_2" in stages
    assert "stage_3" in stages


def test_regulatory_watch_has_rss_feeds():
    mod = load_module("regulatory-watch")
    feeds = mod["inputs"][0]["feeds"]
    feed_names = [f["name"] for f in feeds]
    assert "CVM" in feed_names
    assert "ANBIMA" in feed_names
    assert "BACEN" in feed_names
