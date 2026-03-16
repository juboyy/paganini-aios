"""Dashboard server entrypoint for paganini up."""
import os
import sys

# Ensure project root is in path
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, root)
os.chdir(root)

from core.config.engine import load_config  # noqa: E402
from core.channels.api import create_app  # noqa: E402

config = load_config()
app = create_app(config)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
