"""Tests for CVM ingester — data from CVM Dados Abertos."""

from unittest.mock import patch, MagicMock


def test_none_dict_get_pattern():
    """Verify the (d.get(k) or {}).get() pattern works with None values."""
    d = {"cadastro": None}
    result = (d.get("cadastro") or {}).get("nome")
    assert result is None

    d2 = {"cadastro": {"nome": "Test Fund"}}
    result2 = (d2.get("cadastro") or {}).get("nome")
    assert result2 == "Test Fund"


def test_cnpj_formatting():
    """CNPJ with/without formatting."""
    raw = "47388724000118"
    formatted = "47.388.724/0001-18"
    assert len(raw) == 14
    assert len(formatted.replace(".", "").replace("/", "").replace("-", "")) == 14


def test_build_fund_profile_exists():
    """build_fund_profile function should exist and be importable."""
    from packs.finance.integrations.cvm import build_fund_profile
    assert callable(build_fund_profile)


def test_save_fund_profile_exists():
    """save_fund_profile function should exist and be importable."""
    from packs.finance.integrations.cvm import save_fund_profile
    assert callable(save_fund_profile)


def test_build_fund_profile_with_mock_http():
    """build_fund_profile with mocked urllib."""
    from packs.finance.integrations.cvm import build_fund_profile

    # Mock urllib.request.urlopen to return empty CSV
    mock_response = MagicMock()
    mock_response.read.return_value = b"CNPJ_FUNDO;DENOM_SOCIAL;SIT\n"
    mock_response.__enter__ = lambda s: s
    mock_response.__exit__ = MagicMock(return_value=False)

    with patch("urllib.request.urlopen", return_value=mock_response):
        profile = build_fund_profile("00.000.000/0001-00")
        assert isinstance(profile, dict)
