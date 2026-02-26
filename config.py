import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Docker: TMP_DIR=/app/tmp (set in docker-compose.pathway.yml)
# Windows host: defaults to ./tmp relative to project root
TMP_DIR = os.environ.get("TMP_DIR", os.path.join(BASE_DIR, "tmp"))
os.makedirs(TMP_DIR, exist_ok=True)

FLEET_SUMMARY_PATH = os.path.join(TMP_DIR, "fleet_summary.jsonl")
ETA_SUMMARY_PATH = os.path.join(TMP_DIR, "eta_summary.jsonl")
DEMO_SPIKE_PATH = os.path.join(TMP_DIR, "demo_spike.json")
