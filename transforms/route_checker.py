import math
import pathway as pw

ROUTE_CORRIDORS: dict[str, list[tuple[float, float]]] = {
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

DEVIATION_THRESHOLD_KM = 2.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two GPS points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _min_distance_to_corridor(lat: float, lon: float, route_id: str) -> float:
    """Return the minimum Haversine distance (km) from a GPS point to any corridor segment."""
    waypoints = ROUTE_CORRIDORS.get(route_id, [])
    if not waypoints:
        return 0.0
    return min(haversine_km(lat, lon, wp_lat, wp_lon) for wp_lat, wp_lon in waypoints)


@pw.udf
def check_deviation(lat: float, lon: float, route_id: str) -> str:
    """Return ROUTE_DEVIATION_ALERT if the vehicle is >2 km off its expected corridor.

    Extra CO₂ from deviation is estimated at 0.4 kg per km of detour.
    """
    dist_km = _min_distance_to_corridor(lat, lon, route_id)
    if dist_km > DEVIATION_THRESHOLD_KM:
        extra_co2 = round(dist_km * 0.4, 3)
        return f"ROUTE_DEVIATION_ALERT|deviation_km={dist_km:.2f}|extra_co2_kg={extra_co2}"
    return "OK"


def add_deviation_alerts(table: pw.Table) -> pw.Table:
    """Append a deviation_status column to the telemetry table."""
    return table.select(
        *pw.this,
        deviation_status=check_deviation(pw.this.latitude, pw.this.longitude, pw.this.route_id),
    )
