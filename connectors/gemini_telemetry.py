"""
gemini_telemetry.py — Shared Gemini-powered telemetry generator.

Used by BOTH:
  - connectors/gps_fuel_stream.py (Pathway connector)
  - simulate_pipeline.py (Windows fallback simulator)

Calls Gemini Flash every 4th tick for realistic contextual data.
Uses physics-based interpolation for the other 3 ticks.
Falls back entirely to physics if Gemini API is unavailable.
"""

import json
import math
import os
import random
import time
from datetime import datetime

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import DEMO_SPIKE_PATH

try:
    import google.generativeai as genai
    from dotenv import load_dotenv
    load_dotenv()
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
    _GEMINI_AVAILABLE = True
except Exception:
    _GEMINI_AVAILABLE = False

# ─── Route corridors (shared with route_checker.py) ───
ROUTE_CORRIDORS = {
    "delhi_mumbai": [
        (28.6139, 77.2090), (27.1767, 78.0081), (25.4358, 81.8464),
        (23.1765, 79.9864), (22.3072, 73.1812), (19.0760, 72.8777),
    ],
    "chennai_bangalore": [
        (13.0827, 80.2707), (12.9716, 79.1586),
        (12.8406, 78.1148), (12.9716, 77.5946),
    ],
    "kolkata_patna": [
        (22.5726, 88.3639), (23.5204, 87.3119),
        (24.7914, 85.0002), (25.5941, 85.1376),
    ],
}

VEHICLES_BY_ROUTE = {
    "delhi_mumbai": ["TRK-DL-001", "TRK-DL-002", "TRK-DL-003", "TRK-DL-004"],
    "chennai_bangalore": ["TRK-CH-001", "TRK-CH-002", "TRK-CH-003"],
    "kolkata_patna": ["TRK-KL-001", "TRK-KL-002", "TRK-KL-003"],
}

# Flat vehicle → route mapping
VEHICLE_ROUTE_MAP = {}
for route_id, vids in VEHICLES_BY_ROUTE.items():
    for vid in vids:
        VEHICLE_ROUTE_MAP[vid] = route_id

# ─── Fault profiles (context for Gemini) ───
VEHICLE_FAULTS = {
    "TRK-DL-004": {"fault": "EGR valve fault", "fuel_penalty": 1.20},
    "TRK-CH-002": {"fault": "Exhaust crack", "fuel_penalty": 1.18},
    "TRK-DL-001": {"fault": "Injector drift", "fuel_penalty": 1.05},
}

EMISSION_FACTOR = 2.68  # kg CO₂ per litre diesel (IPCC AR6)

BASELINE_RATES = {  # kg CO₂ per km (historical baseline)
    "delhi_mumbai": 0.94,
    "chennai_bangalore": 0.88,
    "kolkata_patna": 0.91,
}

# ─── Gemini prompt ───
GEMINI_TELEMETRY_PROMPT = """You are a real-time IoT telemetry simulator for Indian freight logistics.
Generate exactly 10 JSON telemetry events for trucks on Indian national highways.

CONTEXT:
- Current time: {current_time} IST
  (6am-10am = Delhi urban congestion, speed 25-40 kmph)
  (10am-6pm = Highway cruise, speed 65-85 kmph)
  (10pm-5am = Night highway, speed 75-95 kmph, better efficiency)
- Season: {season} (Monsoon Jun-Sep: +12% fuel burn, speed -20%)

VEHICLE POSITIONS:
{vehicle_states}

OUTPUT: Return ONLY a JSON array. No markdown, no explanation.
[{{"vehicle_id":"TRK-DL-001","latitude":26.49,"longitude":74.63,"fuel_consumed_liters":2.84,"speed_kmph":72.3,"route_id":"delhi_mumbai","load_status":"LADEN","engine_temp_c":91,"tyre_pressure_psi":38,"cargo_type":"Electronics","weather":"Clear"}}]

Rules:
- fuel_consumed_liters: 1.2-3.5 normal, 3.8-5.5 fault/ghat/congestion
- speed_kmph: 25-45 congestion/ghat, 60-95 highway
- engine_temp_c: 85-95 normal, 96-105 fault
- tyre_pressure_psi: 36-40 normal, 28-35 low
- Return EXACTLY 10 objects. Valid JSON only."""


def _interpolate_route(waypoints, progress):
    """Return (lat, lon) at fraction progress along a route."""
    n = len(waypoints) - 1
    seg = min(int(progress * n), n - 1)
    frac = (progress * n) - seg
    a, b = waypoints[seg], waypoints[seg + 1]
    return (a[0] + frac * (b[0] - a[0]), a[1] + frac * (b[1] - a[1]))


def _get_season():
    month = datetime.now().month
    if 6 <= month <= 9:
        return "Monsoon"
    elif month in [12, 1, 2]:
        return "Winter"
    return "Summer"


def _check_spike(vehicle_id):
    """Check if a demo spike is active for this vehicle."""
    if not os.path.exists(DEMO_SPIKE_PATH):
        return False
    try:
        with open(DEMO_SPIKE_PATH) as f:
            return json.load(f).get("vehicle_id") == vehicle_id
    except Exception:
        return False


def init_vehicle_states():
    """Initialize vehicle positions along their routes. Called once at startup."""
    states = {}
    for route_id, vids in VEHICLES_BY_ROUTE.items():
        waypoints = ROUTE_CORRIDORS[route_id]
        for i, vid in enumerate(vids):
            progress = random.uniform(0.0, 0.3) + i * 0.1
            progress = progress % 1.0
            lat, lon = _interpolate_route(waypoints, progress)
            states[vid] = {
                "route_id": route_id,
                "progress": progress,
                "latitude": lat,
                "longitude": lon,
                "speed": random.uniform(55.0, 80.0),
            }
    return states


def physics_fallback(vehicle_states):
    """Deterministic physics-based telemetry — used when Gemini is unavailable
    or between Gemini calls for rate-limit management."""
    events = []
    for vid, state in vehicle_states.items():
        route_id = state["route_id"]
        waypoints = ROUTE_CORRIDORS[route_id]

        # Advance position
        state["progress"] = (state["progress"] + random.uniform(0.002, 0.005)) % 1.0
        lat, lon = _interpolate_route(waypoints, state["progress"])
        lat += random.uniform(-0.008, 0.008)
        lon += random.uniform(-0.008, 0.008)
        state["latitude"] = lat
        state["longitude"] = lon

        # Speed with momentum
        state["speed"] = max(30.0, min(95.0, state["speed"] + random.uniform(-5.0, 5.0)))

        # Fuel — apply fault penalty if applicable
        is_spike = _check_spike(vid)
        fault = VEHICLE_FAULTS.get(vid, {})
        penalty = fault.get("fuel_penalty", 1.0)

        if is_spike:
            fuel = random.uniform(4.5, 5.5) * 8.0  # massive spike
        elif random.random() < 0.04:
            fuel = random.uniform(3.8, 5.2) * penalty  # occasional high burn
        else:
            fuel = random.uniform(1.5, 2.8) * penalty

        # Engine temp / tyre pressure
        engine_temp = random.uniform(96, 105) if fault else random.uniform(85, 95)
        tyre_psi = random.uniform(28, 35) if random.random() < 0.05 else random.uniform(36, 40)

        events.append({
            "vehicle_id": vid,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "fuel_consumed_liters": round(fuel, 3),
            "speed_kmph": round(state["speed"], 1),
            "route_id": route_id,
            "load_status": "LADEN",
            "engine_temp_c": round(engine_temp, 1),
            "tyre_pressure_psi": round(tyre_psi, 1),
            "cargo_type": "General Freight",
            "weather": "Clear",
        })
    return events


def _parse_gemini_response(text):
    """Extract JSON array from Gemini response, stripping markdown fences."""
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def generate_telemetry_batch(vehicle_states, model, tick):
    """Generate 10 telemetry events.

    Uses Gemini Flash every 4th tick for contextual realism.
    Uses physics_fallback for the other 3 ticks.
    Falls back entirely to physics if Gemini call fails.

    Args:
        vehicle_states: dict of {vehicle_id: {route_id, progress, latitude, longitude, speed}}
        model: google.generativeai.GenerativeModel instance (or None)
        tick: int counter for rate-limiting Gemini calls

    Returns:
        list[dict]: 10 telemetry events
    """
    # Only call Gemini every 4th tick to avoid rate limits
    use_gemini = (model is not None and tick % 4 == 0 and _GEMINI_AVAILABLE)

    if use_gemini:
        try:
            now = datetime.now()
            vehicle_states_str = json.dumps([
                {
                    "vehicle_id": vid,
                    "route_id": s["route_id"],
                    "current_lat": round(s["latitude"], 4),
                    "current_lon": round(s["longitude"], 4),
                    "progress_pct": round(s["progress"] * 100, 1),
                    "known_fault": VEHICLE_FAULTS.get(vid, {}).get("fault", "none"),
                }
                for vid, s in vehicle_states.items()
            ], indent=2)

            prompt = GEMINI_TELEMETRY_PROMPT.format(
                current_time=now.strftime("%H:%M"),
                season=_get_season(),
                vehicle_states=vehicle_states_str,
            )

            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2000,
                ),
            )
            events = _parse_gemini_response(response.text)

            # Update internal states from Gemini coords
            for event in events:
                vid = event.get("vehicle_id")
                if vid in vehicle_states:
                    vehicle_states[vid]["latitude"] = event["latitude"]
                    vehicle_states[vid]["longitude"] = event["longitude"]
                    vehicle_states[vid]["speed"] = event.get("speed_kmph", 65.0)
                    vehicle_states[vid]["progress"] = min(
                        vehicle_states[vid]["progress"] + 0.003, 0.99
                    )

            print(f"  [Gemini] ✓ Generated {len(events)} events")
            return events

        except Exception as e:
            print(f"  [Gemini] Fallback: {type(e).__name__}: {e}")

    # Physics fallback
    return physics_fallback(vehicle_states)


# ─── Standalone test ───
if __name__ == "__main__":
    print("=== Gemini Telemetry Generator — Standalone Test ===\n")
    states = init_vehicle_states()
    model = None
    if _GEMINI_AVAILABLE:
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("[✓] Gemini Flash model loaded")
    else:
        print("[!] Gemini unavailable — using physics fallback only")

    for tick in range(3):
        print(f"\n--- Tick {tick} ---")
        events = generate_telemetry_batch(states, model, tick)
        for e in events:
            print(f"  {e['vehicle_id']}: {e['speed_kmph']} km/h, "
                  f"fuel={e['fuel_consumed_liters']}L, "
                  f"({e['latitude']:.4f}, {e['longitude']:.4f})")
        time.sleep(2)
