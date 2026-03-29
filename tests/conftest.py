"""Paganini AIOS — test configuration."""

import os
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Set test mode
os.environ["PAGANINI_TEST"] = "1"
os.environ["PAGANINI_BASE"] = str(ROOT)
