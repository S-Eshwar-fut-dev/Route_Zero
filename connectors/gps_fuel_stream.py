"""
GPS and Fuel Stream Connector.

Provides a Pathway ConnectorSubject simulating real-time OBD-II telematics
across three Indian logistics corridors. Emits JSON payloads comprising
latitude, longitude, fuel consumption, and vehicle speed.

Author: S-Eshwar-fut-dev
"""

import time
import logging
import pathway as pw

logger = logging.getLogger(__name__)

class TruckTelemetrySource(pw.io.python.ConnectorSubject):
    """
    Pathway custom connector emitting synthetic truck telemetry.

    Attributes:
        interval_sec (float): The simulated push interval in seconds.
    """

    def __init__(self, interval_sec: float = 2.0):
        super().__init__()
        self.interval_sec = interval_sec

    def run(self) -> None:
        """
        Main execution loop for the connector.
        Emits synthetic telemetry payload indefinitely.
        """
        logger.info(f"Starting TruckTelemetrySource with {self.interval_sec}s interval")
        while True:
            try:
                # Mock payload representing a 14-wheeler crossing NH48
                payload = {
                    "vehicle_id": "TRK-DL-001",
                    "timestamp": time.time(),
                    "latitude": 28.6139,
                    "longitude": 77.2090,
                    "fuel_consumed_liters": 4.5,
                    "speed_kmph": 65.4,
                    "route_id": "delhi_mumbai",
                }
                self.next_json(payload)
                time.sleep(self.interval_sec)
            except Exception as e:
                logger.error(f"Stream interrupted: {e}")
                break

def build_telemetry_table() -> pw.Table:
    """
    Instantiate the telemetry source and map it to a typed Pathway Table.

    Returns:
        pw.Table: Typed stream of vehicle telemetry.
    """
    schema = pw.schema_builder(
        columns={
            "vehicle_id": pw.column_definition(dtype=str),
            "timestamp": pw.column_definition(dtype=float),
            "latitude": pw.column_definition(dtype=float),
            "longitude": pw.column_definition(dtype=float),
            "fuel_consumed_liters": pw.column_definition(dtype=float),
            "speed_kmph": pw.column_definition(dtype=float),
            "route_id": pw.column_definition(dtype=str),
        }
    )
    return pw.io.python.read(TruckTelemetrySource(), schema=schema)
