"""
simulate_pipeline.py - Windows-compatible simulation of the Pathway pipeline.

Writes realistic GPS + fuel telemetry events to fleet_summary.jsonl every 2 seconds
so the FastAPI server and Next.js dashboard can connect and display live data.

Run: python simulate_pipeline.py
"""
import json
import math
import os
import random
import time

from config import TMP_DIR, FLEET_SUMMARY_PATH, DEMO_SPIKE_PATH

# -- Routes (lat/lon corridors) --
ROUTES = {
    "delhi_mumbai":    [(28.6, 77.2), (26.5, 74.5), (24.5, 73.0), (22.0, 72.5), (19.0, 72.8)],
    "chennai_bangalore":[(13.08, 80.27), (12.5, 79.5), (12.3, 78.5), (12.97, 77.59)],
    "kolkata_patna":    [(22.57, 88.36), (23.5, 87.0), (24.5, 85.5), (25.6, 85.1)],
}

VEHICLES = {
    "TRK-DL-001": "delhi_mumbai",
    "TRK-DL-002": "delhi_mumbai",
    "TRK-DL-003": "delhi_mumbai",
    "TRK-DL-004": "delhi_mumbai",
    "TRK-CH-001": "chennai_bangalore",
    "TRK-CH-002": "chennai_bangalore",
    "TRK-CH-003": "chennai_bangalore",
    "TRK-KL-001": "kolkata_patna",
    "TRK-KL-002": "kolkata_patna",
    "TRK-KL-003": "kolkata_patna",
}

BASELINE_RATES = {  # kg CO2 per km (baseline diesel)
    "delhi_mumbai":      0.94,
    "chennai_bangalore": 0.88,
    "kolkata_patna":     0.91,
}

EMISSION_FACTOR = 2.68  # kg CO2 per litre of diesel (IPCC AR6)

# State: progress along route (0.0-1.0)
vehicle_progress = {v: random.random() for v in VEHICLES}


def interpolate_route(waypoints, t):
    """Return lat/lon at fraction t along a route."""
    n = len(waypoints) - 1
    seg = min(int(t * n), n - 1)
    frac = (t * n) - seg
    a, b = waypoints[seg], waypoints[seg + 1]
    return a[0] + frac * (b[0] - a[0]), a[1] + frac * (b[1] - a[1])


def check_spike(vehicle_id: str) -> bool:
    """Returns True if demo_spike.json targets this vehicle."""
    if not os.path.exists(DEMO_SPIKE_PATH):
        return False
    try:
        with open(DEMO_SPIKE_PATH) as f:
            d = json.load(f)
        return d.get("vehicle_id") == vehicle_id
    except Exception:
        return False


def emit_event(vehicle_id: str) -> dict:
    route_id = VEHICLES[vehicle_id]
    waypoints = ROUTES[route_id]

    # Advance progress
    vehicle_progress[vehicle_id] = (vehicle_progress[vehicle_id] + 0.003 + random.uniform(0, 0.002)) % 1.0
    lat, lon = interpolate_route(waypoints, vehicle_progress[vehicle_id])

    # Speed
    is_spike = check_spike(vehicle_id)
    speed = random.uniform(55, 95) if not is_spike else random.uniform(20, 40)

    # Fuel consumption
    base_fuel = random.uniform(2.5, 4.5)
    fuel = base_fuel * (10 if is_spike else 1.0)

    co2_kg = round(fuel * EMISSION_FACTOR, 3)

    # Rate-based CO2 savings (matches co2_engine.py formula)
    rate = BASELINE_RATES.get(route_id, 0.91)
    dist_km = speed * (2 / 3600)  # distance in 2s
    expected_co2 = rate * dist_km
    co2_saved = round(max(0.0, expected_co2 - co2_kg), 4)

    if is_spike or co2_kg > 10.5:
        status = "HIGH_EMISSION_ALERT"
    elif co2_kg > 8.5:
        status = "WARNING"
    else:
        status = "NORMAL"

    return {
        "vehicle_id": vehicle_id,
        "timestamp": round(time.time(), 2),
        "latitude": round(lat + random.uniform(-0.05, 0.05), 6),
        "longitude": round(lon + random.uniform(-0.05, 0.05), 6),
        "fuel_consumed_liters": round(fuel, 3),
        "speed_kmph": round(speed, 1),
        "route_id": route_id,
        "co2_kg": co2_kg,
        "status": status,
        "deviation_status": "OK",
        "co2_saved_kg": co2_saved,
    }


def main():
    print(f"[GreenPulse Simulator] Writing to {FLEET_SUMMARY_PATH}")
    print("[GreenPulse Simulator] 10 trucks | 3 routes | 2s interval - Ctrl+C to stop\n")
    tick = 0
    with open(FLEET_SUMMARY_PATH, "a") as f:
        while True:
            for vehicle_id in VEHICLES:
                event = emit_event(vehicle_id)
                f.write(json.dumps(event) + "\n")
            f.flush()
            tick += 1
            # Clear spike after 15 seconds (~8 ticks)
            if tick % 8 == 0 and os.path.exists(DEMO_SPIKE_PATH):
                os.remove(DEMO_SPIKE_PATH)
                print("[Simulator] Demo spike cleared.")
            print(f"\r[tick {tick:4d}] {time.strftime('%H:%M:%S')} - 10 events written", end="", flush=True)
            time.sleep(2)


if __name__ == "__main__":
    main()
