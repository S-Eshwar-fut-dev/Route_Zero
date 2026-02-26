"""
GreenPulse v2 — La Poste pattern implemented with Pathway.

DUAL-STREAM ARCHITECTURE:
  Stream 1: GPS/Fuel telemetry (Gemini-generated, 10 trucks)
  Stream 2: Order data (shipment context, 10 orders)

TRANSFORMS:
  1. Filter invalid GPS coordinates (India bounds: 8-37°N, 68-97°E)
  2. Route deviation detection (segment-based haversine)
  3. CO₂ computation (IPCC factor, per event)
  4. Live metrics (per-event CO₂ + baseline savings)
  5. JOIN: telemetry ⋈ orders on vehicle_id
  6. ETA prediction (10-min rolling speed window + remaining distance)
  7. Tumbling windows: 5-min vehicle + fleet aggregates
  8. Sliding windows: 30-min anomaly detection

OUTPUTS:
  fleet_summary.jsonl  — live vehicle metrics (existing, frontend reads this)
  eta_summary.jsonl    — ETA and order status (NEW, frontend ETA display)
  vehicle_window.jsonl — 5-min vehicle aggregates
  fleet_window.jsonl   — 5-min fleet aggregates
  sliding_metrics.jsonl — 30-min anomaly windows
"""

import os
import pathway as pw
from dotenv import load_dotenv

from config import FLEET_SUMMARY_PATH, ETA_SUMMARY_PATH, TMP_DIR
from connectors.gps_fuel_stream import build_telemetry_table
from connectors.order_stream import build_order_table
from transforms.co2_engine import (
    build_co2_table,
    build_tumbling_windows,
    build_sliding_windows,
    build_live_metrics,
)
from transforms.route_checker import add_deviation_alerts
from transforms.eta_engine import build_eta_table

load_dotenv()


@pw.udf
def is_valid_gps(lat: float, lon: float) -> bool:
    """Filter out invalid GPS readings (0,0) and coords outside India bounds."""
    if lat == 0.0 and lon == 0.0:
        return False
    return (8.0 <= lat <= 37.0) and (68.0 <= lon <= 97.0)


def run_pipeline() -> None:
    """Entry point for the GreenPulse v2 Pathway streaming pipeline.

    Dual-stream architecture:
      Stream 1 (GPS/fuel) → filter → deviation → CO₂ → live metrics
      Stream 2 (orders)   ─────────────────────────┐
                                                    ├─→ ETA engine (JOIN)
      CO₂ table  ──────────────────────────────────┘
    """
    # STREAM 1: GPS/Fuel telemetry (Gemini-powered)
    telemetry = build_telemetry_table()

    # FILTER: Remove invalid GPS (La Poste pattern step 1)
    valid_telemetry = telemetry.filter(
        is_valid_gps(pw.this.latitude, pw.this.longitude)
    )

    # STREAM 2: Order data (shipment context)
    orders = build_order_table()

    # TRANSFORM 1: Route deviation detection
    with_deviation = add_deviation_alerts(valid_telemetry)

    # TRANSFORM 2: CO₂ computation (IPCC factor)
    co2_table = build_co2_table(with_deviation)

    # TRANSFORM 3: Live per-event metrics
    live_metrics = build_live_metrics(co2_table)

    # TRANSFORM 4: ETA engine (JOIN telemetry ⋈ orders + rolling speed)
    eta_table = build_eta_table(co2_table, orders)

    # TRANSFORM 5: Tumbling windows (5-min vehicle + fleet aggregates)
    vehicle_window, fleet_window = build_tumbling_windows(co2_table)

    # TRANSFORM 6: Sliding windows (30-min anomaly detection)
    sliding_metrics = build_sliding_windows(co2_table)

    # ── OUTPUTS ──
    pw.io.jsonlines.write(live_metrics, FLEET_SUMMARY_PATH)
    pw.io.jsonlines.write(eta_table, ETA_SUMMARY_PATH)
    pw.io.jsonlines.write(
        vehicle_window, os.path.join(TMP_DIR, "vehicle_window.jsonl")
    )
    pw.io.jsonlines.write(
        fleet_window, os.path.join(TMP_DIR, "fleet_window.jsonl")
    )
    pw.io.jsonlines.write(
        sliding_metrics, os.path.join(TMP_DIR, "sliding_metrics.jsonl")
    )

    pw.run()


if __name__ == "__main__":
    run_pipeline()
