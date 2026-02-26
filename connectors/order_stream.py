"""
order_stream.py — Second Pathway connector (La Poste dual-stream pattern).

Emits one shipment order per vehicle. Re-emits every 60 seconds to ensure
Pathway JOIN produces results (streaming tables need activity).
"""

import time
import os
import sys
import pathway as pw

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

SHIPMENT_ORDERS = {
    "TRK-DL-001": {
        "order_id": "ORD-7842", "origin": "Delhi NCR",
        "destination": "Mumbai JNPT", "cargo_type": "Electronics",
        "cargo_weight_kg": 18400, "cargo_value_inr": 4200000,
        "promised_eta": "2026-02-26T06:00:00", "customer": "Reliance Retail",
    },
    "TRK-DL-002": {
        "order_id": "ORD-7843", "origin": "Gurgaon",
        "destination": "Pune Chakan", "cargo_type": "Auto Parts",
        "cargo_weight_kg": 22000, "cargo_value_inr": 850000,
        "promised_eta": "2026-02-26T08:00:00", "customer": "Maruti Suzuki",
    },
    "TRK-DL-003": {
        "order_id": "ORD-7844", "origin": "Noida",
        "destination": "Ahmedabad", "cargo_type": "Textiles",
        "cargo_weight_kg": 15000, "cargo_value_inr": 620000,
        "promised_eta": "2026-02-26T10:00:00", "customer": "Raymond Ltd",
    },
    "TRK-DL-004": {
        "order_id": "ORD-7845", "origin": "Faridabad",
        "destination": "Mumbai Bhiwandi", "cargo_type": "Chemicals",
        "cargo_weight_kg": 24000, "cargo_value_inr": 1100000,
        "promised_eta": "2026-02-26T12:00:00", "customer": "Tata Chemicals",
    },
    "TRK-CH-001": {
        "order_id": "ORD-7846", "origin": "Chennai Port",
        "destination": "Bangalore Whitefield", "cargo_type": "FMCG",
        "cargo_weight_kg": 12000, "cargo_value_inr": 950000,
        "promised_eta": "2026-02-25T18:00:00", "customer": "ITC Limited",
    },
    "TRK-CH-002": {
        "order_id": "ORD-7847", "origin": "Sriperumbudur",
        "destination": "Hosur", "cargo_type": "Auto Components",
        "cargo_weight_kg": 19500, "cargo_value_inr": 720000,
        "promised_eta": "2026-02-25T20:00:00", "customer": "Ashok Leyland",
    },
    "TRK-CH-003": {
        "order_id": "ORD-7848", "origin": "Ambattur",
        "destination": "Electronic City", "cargo_type": "Pharma",
        "cargo_weight_kg": 8000, "cargo_value_inr": 3400000,
        "promised_eta": "2026-02-25T16:00:00", "customer": "Cipla Ltd",
    },
    "TRK-KL-001": {
        "order_id": "ORD-7849", "origin": "Kolkata Dock",
        "destination": "Patna Warehousing", "cargo_type": "Steel Coils",
        "cargo_weight_kg": 25000, "cargo_value_inr": 1800000,
        "promised_eta": "2026-02-26T04:00:00", "customer": "Tata Steel",
    },
    "TRK-KL-002": {
        "order_id": "ORD-7850", "origin": "Howrah",
        "destination": "Gaya", "cargo_type": "Cement",
        "cargo_weight_kg": 20000, "cargo_value_inr": 400000,
        "promised_eta": "2026-02-26T06:00:00", "customer": "UltraTech",
    },
    "TRK-KL-003": {
        "order_id": "ORD-7851", "origin": "Salt Lake",
        "destination": "Patna City", "cargo_type": "Consumer Goods",
        "cargo_weight_kg": 14000, "cargo_value_inr": 560000,
        "promised_eta": "2026-02-26T02:00:00", "customer": "Flipkart",
    },
}


class OrderStreamSource(pw.io.python.ConnectorSubject):
    """Second Pathway connector — emits order data for the dual-stream JOIN.

    Re-emits all orders every 60 seconds so the streaming JOIN always
    has data to match against (Pathway requires both sides to be active).
    """

    def run(self) -> None:
        while True:
            for vehicle_id, order in SHIPMENT_ORDERS.items():
                self.next_json({
                    "vehicle_id": vehicle_id,
                    "order_id": order["order_id"],
                    "origin": order["origin"],
                    "destination": order["destination"],
                    "cargo_type": order["cargo_type"],
                    "cargo_weight_kg": float(order["cargo_weight_kg"]),
                    "cargo_value_inr": float(order.get("cargo_value_inr", 0)),
                    "promised_eta": order.get("promised_eta", ""),
                    "customer": order["customer"],
                    "order_status": "IN_TRANSIT",
                    "event_time": time.time(),
                })
            # Re-emit every 60 seconds to keep the stream alive for JOIN
            time.sleep(60)


def build_order_table() -> pw.Table:
    """Connect to order stream and return a typed Pathway table."""
    return pw.io.python.read(
        OrderStreamSource(),
        schema=pw.schema_builder(columns={
            "vehicle_id": pw.column_definition(dtype=str),
            "order_id": pw.column_definition(dtype=str),
            "origin": pw.column_definition(dtype=str),
            "destination": pw.column_definition(dtype=str),
            "cargo_type": pw.column_definition(dtype=str),
            "cargo_weight_kg": pw.column_definition(dtype=float),
            "cargo_value_inr": pw.column_definition(dtype=float),
            "promised_eta": pw.column_definition(dtype=str),
            "customer": pw.column_definition(dtype=str),
            "order_status": pw.column_definition(dtype=str),
            "event_time": pw.column_definition(dtype=float),
        }),
    )
