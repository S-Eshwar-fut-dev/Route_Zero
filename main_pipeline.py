import os
import sys
import json
import time
import pathway as pw
from dotenv import load_dotenv

from connectors.gps_fuel_stream import build_telemetry_table
from transforms.co2_engine import (
    build_co2_table,
    build_tumbling_windows,
    build_sliding_windows,
    build_live_metrics,
)
from transforms.route_checker import add_deviation_alerts

load_dotenv()

FLEET_SUMMARY_PATH = "/tmp/fleet_summary.jsonl"


def run_pipeline() -> None:
    """Entry point for the GreenPulse Pathway streaming pipeline.

    Wires together: telemetry → deviation check → CO₂ engine →
    tumbling/sliding windows → live output files.
    """
    telemetry = build_telemetry_table()

    telemetry_with_deviation = add_deviation_alerts(telemetry)

    co2_table = build_co2_table(telemetry_with_deviation)

    live_metrics = build_live_metrics(co2_table)

    vehicle_window, fleet_window = build_tumbling_windows(co2_table)

    pw.io.jsonlines.write(
        live_metrics,
        FLEET_SUMMARY_PATH,
    )

    pw.io.jsonlines.write(
        fleet_window,
        "/tmp/fleet_window.jsonl",
    )

    pw.io.jsonlines.write(
        vehicle_window,
        "/tmp/vehicle_window.jsonl",
    )

    pw.run()


if __name__ == "__main__":
    run_pipeline()
