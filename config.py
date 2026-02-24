import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = os.path.join(BASE_DIR, "tmp")
os.makedirs(TMP_DIR, exist_ok=True)

FLEET_SUMMARY_PATH = os.path.join(TMP_DIR, "fleet_summary.jsonl")
DEMO_SPIKE_PATH = os.path.join(TMP_DIR, "demo_spike.json")
