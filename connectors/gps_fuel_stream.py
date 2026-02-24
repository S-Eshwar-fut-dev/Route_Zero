import time
import json
import math
import random
import os
import threading
import pathway as pw

ROUTES = {
    "delhi_mumbai": [
        (28.6139, 77.2090),
        (27.1767, 78.0081),
        (25.4358, 81.8464),
        (23.1765, 79.9864),
        (22.3072, 73.1812),
        (19.0760, 72.8777),
    ],
    "chennai_bangalore": [
        (13.0827, 80.2707),
        (12.9716, 79.1586),
        (12.8406, 78.1148),
        (12.9716, 77.5946),
    ],
    "kolkata_patna": [
        (22.5726, 88.3639),
        (23.5204, 87.3119),
        (24.7914, 85.0002),
        (25.5941, 85.1376),
    ],
}

VEHICLES = {
    "delhi_mumbai": ["TRK-DL-001", "TRK-DL-002", "TRK-DL-003", "TRK-DL-004"],
    "chennai_bangalore": ["TRK-CH-001", "TRK-CH-002", "TRK-CH-003"],
    "kolkata_patna": ["TRK-KL-001", "TRK-KL-002", "TRK-KL-003"],
}

DEMO_SPIKE_PATH = "/tmp/demo_spike.json"


def _interpolate_route(waypoints: list[tuple], progress: float) -> tuple[float, float]:
    segments = len(waypoints) - 1
    seg_idx = int(progress * segments)
    seg_idx = min(seg_idx, segments - 1)
    local_t = (progress * segments) - seg_idx
    lat_a, lon_a = waypoints[seg_idx]
    lat_b, lon_b = waypoints[seg_idx + 1]
    return (
        lat_a + (lat_b - lat_a) * local_t,
        lon_a + (lon_b - lon_a) * local_t,
    )


def _check_spike_flag(vehicle_id: str) -> bool:
    if not os.path.exists(DEMO_SPIKE_PATH):
        return False
    try:
        with open(DEMO_SPIKE_PATH, "r") as f:
            data = json.load(f)
        return data.get("vehicle_id") == vehicle_id
    except Exception:
        return False


def _consume_spike_flag(vehicle_id: str, counter: int, limit: int = 10) -> bool:
    if counter >= limit:
        try:
            os.remove(DEMO_SPIKE_PATH)
        except Exception:
            pass
        return False
    return True


class TruckTelemetrySource(pw.io.python.ConnectorSubject):
    """Pathway custom connector that emits synthetic truck telemetry every 2 seconds.

    Simulates 10 trucks across 3 Indian logistics routes. Each vehicle progresses
    along its corridor, emitting GPS coordinates, fuel consumption, and speed.
    Supports demo spike mode via /tmp/demo_spike.json.
    """

    def run(self) -> None:
        vehicle_state: dict[str, dict] = {}
        spike_counters: dict[str, int] = {}

        for route_id, vehicle_ids in VEHICLES.items():
            for vid in vehicle_ids:
                vehicle_state[vid] = {
                    "route_id": route_id,
                    "progress": random.uniform(0.0, 0.3),
                    "speed": random.uniform(55.0, 80.0),
                }
                spike_counters[vid] = 0

        demo_mode = os.environ.get("DEMO_MODE", "0") == "1"

        while True:
            for vid, state in vehicle_state.items():
                route_id = state["route_id"]
                waypoints = ROUTES[route_id]

                state["progress"] = (state["progress"] + random.uniform(0.002, 0.006)) % 1.0
                lat, lon = _interpolate_route(waypoints, state["progress"])

                lat += random.uniform(-0.008, 0.008)
                lon += random.uniform(-0.008, 0.008)

                state["speed"] = max(30.0, min(95.0, state["speed"] + random.uniform(-5.0, 5.0)))

                spiked = _check_spike_flag(vid)
                if spiked or (demo_mode and vid == "TRK-DL-001" and spike_counters[vid] < 10):
                    fuel = random.uniform(4.5, 5.5) * 10.0
                    spike_counters[vid] += 1
                    if not _consume_spike_flag(vid, spike_counters[vid]):
                        spike_counters[vid] = 0
                else:
                    if random.random() < 0.04:
                        fuel = random.uniform(3.8, 5.2)
                    else:
                        fuel = random.uniform(1.5, 2.8)

                self.next_json({
                    "vehicle_id": vid,
                    "timestamp": time.time(),
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6),
                    "fuel_consumed_liters": round(fuel, 4),
                    "speed_kmph": round(state["speed"], 2),
                    "route_id": route_id,
                })

            time.sleep(2.0)


def build_telemetry_table() -> pw.Table:
    """Connect to the truck telemetry source and return a typed Pathway table."""
    return pw.io.python.read(
        TruckTelemetrySource(),
        schema=pw.schema_builder(
            columns={
                "vehicle_id": pw.column_definition(dtype=str),
                "timestamp": pw.column_definition(dtype=float),
                "latitude": pw.column_definition(dtype=float),
                "longitude": pw.column_definition(dtype=float),
                "fuel_consumed_liters": pw.column_definition(dtype=float),
                "speed_kmph": pw.column_definition(dtype=float),
                "route_id": pw.column_definition(dtype=str),
            }
        ),
    )
