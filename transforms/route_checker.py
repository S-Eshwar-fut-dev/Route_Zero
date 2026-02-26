"""
Route Checker Module for GreenPulse.

This module provides the Pathway Dual-Stream UDFs (User Defined Functions)
to compute real-time Haversine distance deviations and estimate CO2 penalties
for freight vehicles moving outside their designated corridors using IPCC AR6 baselines.

Author: S-Eshwar-fut-dev
License: MIT
"""

import math
import logging
from typing import List, Tuple, Dict, Optional
import pathway as pw

# Configure module-level logging for robust error handling
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# --- Constants ---
DEVIATION_THRESHOLD_KM: float = 2.0
CO2_PENALTY_PER_KM_KG: float = 0.4

ROUTE_CORRIDORS: Dict[str, List[Tuple[float, float]]] = {
    "delhi_mumbai": [
        (28.6139, 77.2090),
        (27.1767, 78.0081),
        (19.0760, 72.8777),
    ],
    "chennai_bangalore": [
        (13.0827, 80.2707),
        (12.9716, 77.5946),
    ],
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the great-circle distance in kilometers between two points on a sphere.

    Args:
        lat1 (float): Latitude of origin.
        lon1 (float): Longitude of origin.
        lat2 (float): Latitude of destination.
        lon2 (float): Longitude of destination.

    Returns:
        float: Distance in kilometers.
    """
    R = 6371.0 # Radius of earth in km
    try:
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    except Exception as e:
        logger.error(f"Error calculating Haversine distance: {e}")
        return 0.0

@pw.udf
def check_deviation(lat: float, lon: float, route_id: str) -> str:
    """
    Pathway UDF to evaluate if a vehicle has deviated beyond the allowed threshold.

    Args:
        lat (float): Current live latitude.
        lon (float): Current live longitude.
        route_id (str): The actively assigned transport corridor ID.

    Returns:
        str: Stringified status payload containing the alert type and CO2 penalty.
    """
    try:
        waypoints = ROUTE_CORRIDORS.get(route_id, [])
        if not waypoints:
            return "OK|deviation_km=0.0|extra_co2_kg=0.0"

        dist_km = min(haversine_km(lat, lon, wp_lat, wp_lon) for wp_lat, wp_lon in waypoints)
        
        if dist_km > DEVIATION_THRESHOLD_KM:
            extra_co2 = round(dist_km * CO2_PENALTY_PER_KM_KG, 2)
            logger.warning(f"Route deviation detected on {route_id}. Penalty: {extra_co2}kg CO2")
            return f"ROUTE_DEVIATION_ALERT|deviation_km={dist_km:.2f}|extra_co2_kg={extra_co2}"
        
        return "OK"
    except Exception as e:
        logger.error(f"Failed to check deviation: {e}")
        return "ERROR_CALCULATING_DEVIATION"
