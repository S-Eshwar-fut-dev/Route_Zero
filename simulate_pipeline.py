"""
simulate_pipeline.py
Writes demo fleet + ETA data to ./tmp/ for the SSE endpoint and
FleetContext to consume. Run this when Pathway is not available.

Usage:
    python simulate_pipeline.py
"""

import json
import time
import random
import os
from pathlib import Path

TMP_DIR = Path(os.environ.get("TMP_DIR", "./tmp"))

VEHICLES = [
    {"vehicle_id": "TRK-DL-001", "route_id": "delhi_mumbai", "lat": 27.18, "lng": 78.01, "cargo": "Electronics"},
    {"vehicle_id": "TRK-DL-002", "route_id": "delhi_mumbai", "lat": 26.22, "lng": 78.18, "cargo": "Auto Parts"},
    {"vehicle_id": "TRK-DL-003", "route_id": "delhi_mumbai", "lat": 23.26, "lng": 77.41, "cargo": "Textiles"},
    {"vehicle_id": "TRK-DL-004", "route_id": "delhi_mumbai", "lat": 22.31, "lng": 73.18, "cargo": "Chemicals"},
    {"vehicle_id": "TRK-CB-005", "route_id": "chennai_bangalore", "lat": 12.92, "lng": 79.13, "cargo": "FMCG"},
    {"vehicle_id": "TRK-CB-006", "route_id": "chennai_bangalore", "lat": 12.52, "lng": 78.21, "cargo": "Auto Components"},
    {"vehicle_id": "TRK-CB-007", "route_id": "chennai_bangalore", "lat": 12.84, "lng": 78.11, "cargo": "Pharma"},
    {"vehicle_id": "TRK-KP-008", "route_id": "kolkata_patna", "lat": 23.68, "lng": 86.97, "cargo": "Steel Coils"},
    {"vehicle_id": "TRK-KP-009", "route_id": "kolkata_patna", "lat": 24.79, "lng": 85.00, "cargo": "Cement"},
    {"vehicle_id": "TRK-KP-010", "route_id": "kolkata_patna", "lat": 25.10, "lng": 85.14, "cargo": "Consumer Goods"},
]


def generate_record(v: dict) -> dict:
    speed = random.uniform(40, 85)
    fuel = random.uniform(2.0, 4.5)
    co2 = fuel * 2.62
    status = random.choices(
        ["NORMAL", "WARNING", "HIGH_EMISSION_ALERT"],
        weights=[75, 18, 7],
    )[0]
    eta_status = random.choices(
        ["ON_TIME", "AT_RISK", "DELAYED"],
        weights=[65, 25, 10],
    )[0]

    record = {
        "vehicle_id": v["vehicle_id"],
        "timestamp": time.time(),
        "latitude": v["lat"] + random.uniform(-0.05, 0.05),
        "longitude": v["lng"] + random.uniform(-0.05, 0.05),
        "fuel_consumed_liters": round(fuel, 2),
        "speed_kmph": round(speed, 1),
        "route_id": v["route_id"],
        "co2_kg": round(co2, 2),
        "status": status,
        "deviation_status": "OK" if status != "HIGH_EMISSION_ALERT" else "DEVIATED",
        "co2_saved_kg": round(random.uniform(0.1, 0.8), 2),
        "load_status": "LADEN",
        "engine_temp_c": round(random.uniform(85, 105), 1),
        "tyre_pressure_psi": random.randint(34, 42),
        "cargo_type": v["cargo"],
        "weather": random.choice(["Clear", "Haze", "Rain", "Fog"]),
        "eta_hours": round(random.uniform(1.0, 8.0), 1),
        "eta_status": eta_status,
        "remaining_km": random.randint(50, 600),
    }

    # Add temperature for cold chain vehicles
    if v["cargo"] == "Pharma":
        record["temperature_c"] = round(random.uniform(-20, 5), 1)
        record["temperature_breach"] = record["temperature_c"] > -12

    return record


def main():
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    fleet_file = TMP_DIR / "fleet_summary.jsonl"
    eta_file = TMP_DIR / "eta_summary.jsonl"

    print(f"[SimPipeline] Writing to {fleet_file} and {eta_file}")
    print("[SimPipeline] Press Ctrl+C to stop\n")

    cycle = 0
    while True:
        cycle += 1
        records = [generate_record(v) for v in VEHICLES]

        # Write fleet records
        with open(fleet_file, "a", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r) + "\n")

        # Write ETA records
        with open(eta_file, "a", encoding="utf-8") as f:
            for r in records:
                eta_record = {
                    "vehicle_id": r["vehicle_id"],
                    "eta_hours": r["eta_hours"],
                    "eta_status": r["eta_status"],
                    "remaining_km": r["remaining_km"],
                    "timestamp": r["timestamp"],
                }
                f.write(json.dumps(eta_record) + "\n")

        print(f"  [{cycle}] Wrote {len(records)} records  (CO₂ avg: {sum(r['co2_kg'] for r in records) / len(records):.1f} kg)")

        # Truncate files if too large (keep last 500 lines)
        for fpath in [fleet_file, eta_file]:
            try:
                lines = fpath.read_text(encoding="utf-8").strip().split("\n")
                if len(lines) > 500:
                    fpath.write_text("\n".join(lines[-200:]) + "\n", encoding="utf-8")
            except Exception:
                pass

        time.sleep(2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[SimPipeline] Stopped.")
