"""PAGANINI AIOS — Dashboard package.

Provides a FastAPI-based web dashboard for fund operations (MVP).

Entrypoint
----------
Use the ``create_app`` factory to instantiate the application::

    from packages.dashboard.app import create_app
    from packages.kernel.engine import load_config

    config = load_config()
    app = create_app(config)

Then serve with uvicorn::

    uvicorn packages.dashboard.app:app --host 0.0.0.0 --port 8000 --reload

Dependencies
------------
FastAPI and Uvicorn are **optional** and NOT listed in ``pyproject.toml``.
Install them separately::

    pip install fastapi uvicorn[standard]

If they are not installed, ``create_app`` raises a ``RuntimeError`` with
install instructions.

Endpoints
---------
- ``GET /``                   — Single-page HTML dashboard (Tailwind dark theme)
- ``GET /api/health``         — Healthcheck
- ``GET /api/status``         — System overview (chunks, agents, daemons, MetaClaw)
- ``GET /api/agents``         — Agent registry listing with domains
- ``GET /api/daemons``        — Daemon runner status
- ``GET /api/query``          — RAG query endpoint (``?q=…&fund_id=…``)
- ``GET /api/reports``        — Available report templates
- ``POST /api/reports/generate`` — Generate a fund report from a template
- ``GET /api/memory/stats``   — Memory layer statistics
"""
