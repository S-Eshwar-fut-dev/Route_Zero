"""
simulate_pipeline.py — Windows-compatible simulation of the Pathway pipeline.

v2.0: Uses Gemini-powered telemetry (shared with Pathway connector),
computes ETA predictions, and writes both fleet_summary.jsonl and eta_summary.jsonl.

Run: python simulate_pipeline.py
"""
import json
import math
import os
import random
import time

from config import TMP_DIR, FLEET_SUMMARY_PATH, DEMO_SPIKE_PATH

# Import shared telemetry generator
from connectors.gemini_telemetry import (
    generate_telemetry_batch,
    init_vehicle_states,
    EMISSION_FACTOR,
    BASELINE_RATES,
    ROUTE_CORRIDORS,
    VEHICLE_ROUTE_MAP,
    _check_spike,
)

# ── ETA computation (mirrors transforms/eta_engine.py) ──
ROUTE_TOTAL_KM = {
    "delhi_mumbai": 1428.0,
    "chennai_bangalore": 350.0,
    "kolkata_patna": 530.0,
}

# ── Order context (mirrors connectors/order_stream.py) ──
SHIPMENT_ORDERS = {
    "TRK-DL-001": {"order_id": "ORD-7842", "origin": "Delhi NCR",
                    "destination": "Mumbai JNPT", "cargo": "Electronics",
                    "weight_kg": 18400, "customer": "Reliance Retail",
                    "promised_eta": "2026-02-26T06:00:00"},
    "TRK-DL-002": {"order_id": "ORD-7843", "origin": "Gurgaon",
                    "destination": "Pune Chakan", "cargo": "Auto Parts",
                    "weight_kg": 22000, "customer": "Maruti Suzuki",
                    "promised_eta": "2026-02-26T08:00:00"},
    "TRK-DL-003": {"order_id": "ORD-7844", "origin": "Noida",
                    "destination": "Ahmedabad", "cargo": "Textiles",
                    "weight_kg": 15000, "customer": "Raymond Ltd",
                    "promised_eta": "2026-02-26T10:00:00"},
    "TRK-DL-004": {"order_id": "ORD-7845", "origin": "Faridabad",
                    "destination": "Mumbai Bhiwandi", "cargo": "Chemicals",
                    "weight_kg": 24000, "customer": "Tata Chemicals",
                    "promised_eta": "2026-02-26T12:00:00"},
    "TRK-CH-001": {"order_id": "ORD-7846", "origin": "Chennai Port",
                    "destination": "Bangalore Whitefield", "cargo": "FMCG",
                    "weight_kg": 12000, "customer": "ITC Limited",
                    "promised_eta": "2026-02-25T18:00:00"},
    "TRK-CH-002": {"order_id": "ORD-7847", "origin": "Sriperumbudur",
                    "destination": "Hosur", "cargo": "Auto Components",
                    "weight_kg": 19500, "customer": "Ashok Leyland",
                    "promised_eta": "2026-02-25T20:00:00"},
    "TRK-CH-003": {"order_id": "ORD-7848", "origin": "Ambattur",
                    "destination": "Electronic City", "cargo": "Pharma",
                    "weight_kg": 8000, "customer": "Cipla Ltd",
                    "promised_eta": "2026-02-25T16:00:00"},
    "TRK-KL-001": {"order_id": "ORD-7849", "origin": "Kolkata Dock",
                    "destination": "Patna Warehousing", "cargo": "Steel Coils",
                    "weight_kg": 25000, "customer": "Tata Steel",
                    "promised_eta": "2026-02-26T04:00:00"},
    "TRK-KL-002": {"order_id": "ORD-7850", "origin": "Howrah",
                    "destination": "Gaya", "cargo": "Cement",
                    "weight_kg": 20000, "customer": "UltraTech",
                    "promised_eta": "2026-02-26T06:00:00"},
    "TRK-KL-003": {"order_id": "ORD-7851", "origin": "Salt Lake",
                    "destination": "Patna City", "cargo": "Consumer Goods",
                    "weight_kg": 14000, "customer": "Flipkart",
                    "promised_eta": "2026-02-26T02:00:00"},
}

# ── Rolling speed buffer for ETA (10-minute window) ──
speed_history: dict[str, list[float]] = {vid: [] for vid in VEHICLE_ROUTE_MAP}
MAX_SPEED_HISTORY = 300  # 300 readings × 2s = 10 minutes


def compute_progress(lat, lon, route_id):
    """Estimate route completion (0-1) from GPS position."""
    waypoints = ROUTE_CORRIDORS.get(route_id, [])
    if not waypoints:
        return 0.5
    min_dist = float("inf")
    nearest_idx = 0
    for i, (wlat, wlon) in enumerate(waypoints):
        d = math.sqrt((lat - wlat) ** 2 + (lon - wlon) ** 2)
        if d < min_dist:
            min_dist = d
            nearest_idx = i
    return nearest_idx / max(len(waypoints) - 1, 1)


def compute_eta(route_id, progress, avg_speed, weather="Clear"):
    """Compute ETA in hours from current position."""
    total_km = ROUTE_TOTAL_KM.get(route_id, 500.0)
    remaining = total_km * (1.0 - max(0.0, min(1.0, progress)))
    if avg_speed <= 0:
        return 99.0
    weather_factor = 1.2 if "Rain" in weather or "Fog" in weather else 1.0
    return round(remaining / (avg_speed / weather_factor), 2)


def eta_status(eta_hours, promised_eta_str):
    """Compare ETA to promised delivery time."""
    if not promised_eta_str or eta_hours >= 99.0:
        return "UNKNOWN"
    try:
        from datetime import datetime, timezone
        promised = datetime.fromisoformat(promised_eta_str)
        if promised.tzinfo is None:
            promised = promised.replace(tzinfo=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        est_arrival = now.timestamp() + (eta_hours * 3600)
        buffer_hours = (promised.timestamp() - est_arrival) / 3600
        if buffer_hours >= 2.0:
            return "ON_TIME"
        elif buffer_hours >= 0:
            return "AT_RISK"
        else:
            return "DELAYED"
    except Exception:
        return "UNKNOWN"


def main():
    print(f"[GreenPulse v2.0 Simulator] Writing to {FLEET_SUMMARY_PATH}")
    print("[GreenPulse v2.0] Gemini telemetry + ETA engine | 10 trucks | 3 routes | 2s interval\n")

    # Initialize Gemini model
    model = None
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("[✓] Gemini Flash loaded — contextual telemetry active")
    except Exception as e:
        print(f"[!] Gemini unavailable ({e}) — using physics fallback")

    vehicle_states = init_vehicle_states()
    eta_path = os.path.join(TMP_DIR, "eta_summary.jsonl")
    tick = 0

    with open(FLEET_SUMMARY_PATH, "a") as f_fleet, \
         open(eta_path, "a") as f_eta:

        while True:
            ts = time.time()
            events = generate_telemetry_batch(vehicle_states, model, tick)

            for event in events:
                vid = event["vehicle_id"]
                route_id = event["route_id"]

                # Apply demo spike on top
                is_spike = _check_spike(vid)
                if is_spike:
                    event["fuel_consumed_liters"] = round(
                        event["fuel_consumed_liters"] * 8.0, 3
                    )

                # CO₂ computation (IPCC)
                fuel = event["fuel_consumed_liters"]
                co2_kg = round(fuel * EMISSION_FACTOR, 3)

                # CO₂ savings vs baseline
                rate = BASELINE_RATES.get(route_id, 0.91)
                speed = event["speed_kmph"]
                dist_km = speed * (2 / 3600)
                expected_co2 = rate * dist_km
                co2_saved = round(max(0.0, expected_co2 - co2_kg), 4)

                # Status
                if is_spike or co2_kg > 10.5:
                    status = "HIGH_EMISSION_ALERT"
                elif co2_kg > 8.5:
                    status = "WARNING"
                else:
                    status = "NORMAL"

                # ── Fleet record ──
                fleet_record = {
                    "vehicle_id": vid,
                    "timestamp": round(ts, 2),
                    "latitude": event["latitude"],
                    "longitude": event["longitude"],
                    "fuel_consumed_liters": round(fuel, 3),
                    "speed_kmph": round(speed, 1),
                    "route_id": route_id,
                    "co2_kg": co2_kg,
                    "status": status,
                    "deviation_status": "OK",
                    "co2_saved_kg": co2_saved,
                    "load_status": event.get("load_status", "LADEN"),
                    "engine_temp_c": event.get("engine_temp_c", 91),
                    "tyre_pressure_psi": event.get("tyre_pressure_psi", 38),
                    "cargo_type": event.get("cargo_type", "General Freight"),
                    "weather": event.get("weather", "Clear"),
                }
                f_fleet.write(json.dumps(fleet_record) + "\n")

                # ── ETA computation ──
                speed_history[vid].append(speed)
                if len(speed_history[vid]) > MAX_SPEED_HISTORY:
                    speed_history[vid] = speed_history[vid][-MAX_SPEED_HISTORY:]

                avg_speed = sum(speed_history[vid]) / len(speed_history[vid])
                progress = compute_progress(
                    event["latitude"], event["longitude"], route_id
                )
                eta_hours = compute_eta(
                    route_id, progress, avg_speed,
                    event.get("weather", "Clear"),
                )
                remaining_km = round(
                    ROUTE_TOTAL_KM.get(route_id, 500) * (1 - progress), 1
                )

                order = SHIPMENT_ORDERS.get(vid, {})
                status_eta = eta_status(eta_hours, order.get("promised_eta", ""))

                eta_record = {
                    "vehicle_id": vid,
                    "route_id": route_id,
                    "avg_speed_kmph": round(avg_speed, 1),
                    "progress": round(progress, 3),
                    "eta_hours": eta_hours,
                    "remaining_km": remaining_km,
                    "eta_status": status_eta,
                    "order_id": order.get("order_id", ""),
                    "origin": order.get("origin", ""),
                    "destination": order.get("destination", ""),
                    "cargo_type": order.get("cargo", ""),
                    "cargo_weight_kg": order.get("weight_kg", 0),
                    "customer": order.get("customer", ""),
                    "promised_eta": order.get("promised_eta", ""),
                    "timestamp": round(ts, 2),
                }
                f_eta.write(json.dumps(eta_record) + "\n")

            f_fleet.flush()
            f_eta.flush()
            tick += 1

            # Clear spike after ~15 seconds (8 ticks)
            if tick % 8 == 0 and os.path.exists(DEMO_SPIKE_PATH):
                os.remove(DEMO_SPIKE_PATH)
                print("\n[Simulator] Demo spike cleared.")

            gemini_tag = "Gemini" if (tick - 1) % 4 == 0 and model else "Physics"
            print(f"\r[tick {tick:4d}] {time.strftime('%H:%M:%S')} — "
                  f"10 fleet + 10 ETA events [{gemini_tag}]", end="", flush=True)
            time.sleep(2)


if __name__ == "__main__":
    main()
