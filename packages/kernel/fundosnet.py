"""PAGANINI AIOS — FundosNET document scraper.

Interfaces with CVM's FundosNET system to search and download
regulatory documents for investment funds registered in Brazil.

Note: All CNPJ values used here are anonymised (XX.XXX.XXX/0001-XX).
Do NOT embed real CNPJ numbers in this module.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_FUNDOSNET_BASE = "https://fnet.bmfbovespa.com.br/fnet/publico"
_CVM_PESQUISA_URL = (
    "https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosCVM"
)

_DEFAULT_TIMEOUT = 30  # seconds


def search_documents(
    cnpj: str,
    tipo: str = "REGULAMENTO",
    *,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    timeout: int = _DEFAULT_TIMEOUT,
) -> list[dict[str, Any]]:
    """Search FundosNET for documents associated with a given fund CNPJ.

    Args:
        cnpj: Fund CNPJ string (digits only or formatted, e.g. ``XXXXXXXXXXXXXX``).
        tipo: Document category. Common values: ``REGULAMENTO``, ``INFORME_MENSAL``,
              ``FATO_RELEVANTE``. Defaults to ``REGULAMENTO``.
        data_inicio: Optional start date filter in ``DD/MM/YYYY`` format.
        data_fim: Optional end date filter in ``DD/MM/YYYY`` format.
        timeout: HTTP request timeout in seconds.

    Returns:
        List of document metadata dicts returned by FundosNET, each containing
        keys such as ``id``, ``tipo``, ``dataEntrega``, ``nomeArquivo``,
        ``situacao``.  Returns an empty list when no documents are found or when
        the service is unreachable.
    """
    # Normalise CNPJ: strip punctuation, keep only digits
    cnpj_digits = "".join(c for c in cnpj if c.isdigit())

    payload: dict[str, Any] = {
        "cnpjFundo": cnpj_digits,
        "tipoDocumento": tipo,
        "situacao": "A",  # Active documents only
        "numeroPagina": 1,
        "quantidadeRegistros": 50,
    }
    if data_inicio:
        payload["dataInicio"] = data_inicio
    if data_fim:
        payload["dataFim"] = data_fim

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                _CVM_PESQUISA_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()

        # FundosNET returns {"listaDocumentos": [...], "total": N}
        docs = data.get("listaDocumentos", [])
        logger.info(
            "FundosNET search: cnpj=%s tipo=%s → %d result(s)",
            cnpj_digits,
            tipo,
            len(docs),
        )
        return docs

    except httpx.HTTPStatusError as exc:
        logger.warning("FundosNET HTTP error: %s", exc)
        return []
    except httpx.RequestError as exc:
        logger.warning("FundosNET request error: %s", exc)
        return []
    except Exception as exc:  # noqa: BLE001
        logger.warning("FundosNET unexpected error: %s", exc)
        return []


def download_regulamento(
    cnpj: str,
    save_dir: str | Path,
    *,
    timeout: int = _DEFAULT_TIMEOUT,
) -> Path | None:
    """Download the most recent fund regulation document from FundosNET.

    Searches for ``REGULAMENTO`` documents for the given fund CNPJ, picks the
    most recent one, and downloads its PDF to ``save_dir``.

    Args:
        cnpj: Fund CNPJ (digits only or formatted).
        save_dir: Directory where the downloaded PDF should be saved.
        timeout: HTTP request timeout in seconds.

    Returns:
        :class:`~pathlib.Path` to the saved file, or ``None`` if no document
        was found or the download failed.
    """
    save_path = Path(save_dir)
    save_path.mkdir(parents=True, exist_ok=True)

    docs = search_documents(cnpj, tipo="REGULAMENTO", timeout=timeout)
    if not docs:
        logger.info("No REGULAMENTO found for cnpj=%s", cnpj)
        return None

    # Sort by delivery date descending; fall back to list order
    def _sort_key(d: dict) -> str:
        return d.get("dataEntrega", "") or ""

    docs_sorted = sorted(docs, key=_sort_key, reverse=True)
    doc = docs_sorted[0]

    doc_id = doc.get("id") or doc.get("idDocumento")
    filename = doc.get("nomeArquivo") or f"regulamento_{doc_id}.pdf"
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"

    download_url = f"{_FUNDOSNET_BASE}/exibirDocumento.do?id={doc_id}"

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(download_url, follow_redirects=True)
            resp.raise_for_status()

        dest = save_path / filename
        dest.write_bytes(resp.content)
        logger.info("Downloaded regulamento → %s (%d bytes)", dest, len(resp.content))
        return dest

    except httpx.HTTPStatusError as exc:
        logger.warning("FundosNET download HTTP error: %s", exc)
        return None
    except httpx.RequestError as exc:
        logger.warning("FundosNET download request error: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("FundosNET download unexpected error: %s", exc)
        return None
