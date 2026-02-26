"""
eta_engine.py — ETA prediction using Pathway transforms.

La Poste pattern: JOIN GPS telemetry with order data, compute ETA via
rolling speed windows, detect ETA deviation (actual vs promised delivery).

Transforms:
  - compute_progress_from_coords: GPS → nearest waypoint → route progress (0–1)
  - compute_eta_hours: remaining distance / rolling avg speed (weather-adjusted)
  - compute_remaining_km: total route km × (1 - progress)
  - eta_status: computed ETA vs promised delivery → ON_TIME | AT_RISK | DELAYED
  - build_eta_table: JOIN + tumbling window + ETA computation
"""

import math
import pathway as pw

ROUTE_TOTAL_KM = {
    "delhi_mumbai": 1428.0,
    "chennai_bangalore": 350.0,
    "kolkata_patna": 530.0,
}

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


@pw.udf
def compute_progress_from_coords(
    latitude: float, longitude: float, route_id: str
) -> float:
    """Estimate route progress (0–1) from current GPS position.
    Uses nearest waypoint index as a proxy."""
    waypoints = ROUTE_CORRIDORS.get(route_id, [])
    if not waypoints:
        return 0.5
    min_dist = float("inf")
    nearest_idx = 0
    for i, (wlat, wlon) in enumerate(waypoints):
        d = math.sqrt((latitude - wlat) ** 2 + (longitude - wlon) ** 2)
        if d < min_dist:
            min_dist = d
            nearest_idx = i
    return nearest_idx / max(len(waypoints) - 1, 1)


@pw.udf
def compute_eta_hours(
    route_id: str,
    progress: float,
    avg_speed_kmph: float,
    weather: str,
) -> float:
    """Estimate hours to destination from current position + rolling speed.
    Adjusts for weather (monsoon/fog = +20% time)."""
    total_km = ROUTE_TOTAL_KM.get(route_id, 500.0)
    remaining_km = total_km * (1.0 - max(0.0, min(1.0, progress)))
    if avg_speed_kmph <= 0:
        return 99.0
    weather_factor = 1.2 if "Rain" in weather or "Fog" in weather else 1.0
    effective_speed = avg_speed_kmph / weather_factor
    return round(remaining_km / effective_speed, 2)


@pw.udf
def compute_remaining_km(route_id: str, progress: float) -> float:
    total = ROUTE_TOTAL_KM.get(route_id, 500.0)
    return round(total * (1.0 - max(0.0, min(1.0, progress))), 1)


@pw.udf
def eta_status(
    eta_hours: float,
    promised_eta_str: str,
    current_timestamp: float,
) -> str:
    """Compare computed ETA against promised delivery time.
    Returns: ON_TIME | AT_RISK | DELAYED | UNKNOWN"""
    if not promised_eta_str or eta_hours >= 99.0:
        return "UNKNOWN"
    try:
        from datetime import datetime, timezone
        promised = datetime.fromisoformat(promised_eta_str.replace("Z", "+00:00"))
        if promised.tzinfo is None:
            promised = promised.replace(tzinfo=timezone.utc)
        est_arrival = current_timestamp + (eta_hours * 3600)
        buffer_hours = (promised.timestamp() - est_arrival) / 3600
        if buffer_hours >= 2.0:
            return "ON_TIME"
        elif buffer_hours >= 0:
            return "AT_RISK"
        else:
            return "DELAYED"
    except Exception:
        return "UNKNOWN"


def build_eta_table(co2_table: pw.Table, order_table: pw.Table) -> pw.Table:
    """JOIN GPS telemetry with order data, compute ETA via 10-min tumbling window.

    Pathway dual-stream JOIN (La Poste pattern):
      co2_table (GPS/fuel, 2s cadence) ⋈ order_table (shipments, 60s re-emit)
      → rolling speed → ETA computation → ETA status vs promised delivery
    """
    # Step 1: Compute 10-min tumbling window for rolling average speed
    speed_windowed = co2_table.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(duration=pw.Duration("10m")),
        instance=pw.this.vehicle_id,
    )

    rolling_speed = speed_windowed.reduce(
        vehicle_id=pw.reducers.any(pw.this.vehicle_id),
        route_id=pw.reducers.any(pw.this.route_id),
        avg_speed_kmph=pw.reducers.avg(pw.this.speed_kmph),
        latest_lat=pw.reducers.max(pw.this.latitude),
        latest_lon=pw.reducers.max(pw.this.longitude),
        latest_ts=pw.reducers.max(pw.this.timestamp),
        latest_weather=pw.reducers.any(pw.this.weather),
    )

    # Step 2: JOIN with order stream on vehicle_id
    joined = rolling_speed.join(
        order_table,
        pw.left.vehicle_id == pw.right.vehicle_id,
        how=pw.JoinMode.LEFT,
    ).select(
        vehicle_id=pw.left.vehicle_id,
        route_id=pw.left.route_id,
        avg_speed_kmph=pw.left.avg_speed_kmph,
        latest_lat=pw.left.latest_lat,
        latest_lon=pw.left.latest_lon,
        latest_ts=pw.left.latest_ts,
        latest_weather=pw.left.latest_weather,
        order_id=pw.right.order_id,
        origin=pw.right.origin,
        destination=pw.right.destination,
        cargo_type=pw.right.cargo_type,
        cargo_weight_kg=pw.right.cargo_weight_kg,
        customer=pw.right.customer,
        promised_eta=pw.right.promised_eta,
    )

    # Step 3: Compute route progress from GPS
    with_progress = joined.select(
        *pw.this,
        progress=compute_progress_from_coords(
            pw.this.latest_lat, pw.this.latest_lon, pw.this.route_id
        ),
    )

    # Step 4: Compute ETA
    with_eta = with_progress.select(
        *pw.this,
        eta_hours=compute_eta_hours(
            pw.this.route_id,
            pw.this.progress,
            pw.this.avg_speed_kmph,
            pw.this.latest_weather,
        ),
        remaining_km=compute_remaining_km(pw.this.route_id, pw.this.progress),
    )

    # Step 5: ETA status vs promised delivery
    return with_eta.select(
        *pw.this,
        eta_status=eta_status(
            pw.this.eta_hours,
            pw.this.promised_eta,
            pw.this.latest_ts,
        ),
    )
