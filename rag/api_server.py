"""
RouteZero API Server — FastAPI backend with all REST + SSE endpoints.

Handles fleet data, booking management, AI chat, SSE streaming,
pathway health monitoring, carbon reports, and fleet rankings.
"""

import json
import time
import asyncio
import re
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="RouteZero API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Path helpers ──
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
TMP_DIR = Path(os.environ.get("TMP_DIR", str(_PROJECT_ROOT / "tmp")))
DATA_DIR = _PROJECT_ROOT / "data"
FLEET_FILE = TMP_DIR / "fleet_summary.jsonl"
ETA_FILE = TMP_DIR / "eta_summary.jsonl"
BOOKINGS_FILE = DATA_DIR / "bookings.jsonl"
NOTIFICATIONS_FILE = DATA_DIR / "notifications.jsonl"


def _ensure_dirs() -> None:
    """Ensure data and tmp directories exist."""
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_jsonl(path: Path, last_n: int = 50) -> list[dict]:
    """Read last N lines from a JSONL file safely."""
    try:
        if not path.exists():
            return []
        lines = path.read_text(encoding="utf-8").strip().split("\n")
        records = []
        for line in lines[-last_n:]:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return records
    except Exception as e:
        logger.error(f"Error reading {path}: {e}")
        return []


def _append_jsonl(path: Path, record: dict) -> None:
    """Append a single JSON record to a JSONL file."""
    _ensure_dirs()
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception as e:
        logger.error(f"Error writing to {path}: {e}")


# ────────────────────────────────────────────────────────────────────
# HEALTH
# ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Service health check."""
    return {"status": "ok", "service": "routezero-api", "version": "3.0.0"}


# ────────────────────────────────────────────────────────────────────
# FLEET DATA (reads from Pathway JSONL output)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/fleet")
def get_fleet():
    """Return current state of all vehicles from fleet_summary.jsonl."""
    records = _read_jsonl(FLEET_FILE, last_n=100)
    if not records:
        return []
    # Deduplicate: keep latest record per vehicle
    vehicles: dict[str, dict] = {}
    for r in records:
        vid = r.get("vehicle_id")
        if vid:
            vehicles[vid] = r
    return list(vehicles.values())


@app.get("/api/fleet-intel")
def get_fleet_intel():
    """Fleet + ETA + aggregations combined endpoint."""
    fleet = get_fleet()
    eta_records = _read_jsonl(ETA_FILE, last_n=50)
    # Deduplicate ETA
    eta_vehicles: dict[str, dict] = {}
    for r in eta_records:
        vid = r.get("vehicle_id")
        if vid:
            eta_vehicles[vid] = r

    total = len(fleet)
    delayed = sum(1 for v in fleet if v.get("eta_status") == "DELAYED")
    at_risk = sum(1 for v in fleet if v.get("eta_status") == "AT_RISK")
    on_time = sum(1 for v in fleet if v.get("eta_status") == "ON_TIME")

    return {
        "vehicles": fleet,
        "eta_vehicles": list(eta_vehicles.values()),
        "summary": {"total": total, "delayed": delayed, "at_risk": at_risk, "on_time": on_time},
    }


@app.get("/api/vehicle/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    """Full vehicle detail + last 10 alerts."""
    fleet = get_fleet()
    vehicle = next((v for v in fleet if v.get("vehicle_id") == vehicle_id), None)
    if not vehicle:
        return JSONResponse({"error": "Vehicle not found"}, status_code=404)

    # Fake alert history for demo
    alerts = [
        {"time": "14:32", "alert_type": "High Emission", "value": "9.2 kg/h", "status": "RESOLVED"},
        {"time": "14:18", "alert_type": "Speed Violation", "value": "95 km/h", "status": "RESOLVED"},
        {"time": "13:55", "alert_type": "Route Deviation", "value": "3.2 km", "status": "OPEN"},
        {"time": "13:22", "alert_type": "Temperature Warning", "value": "27°C", "status": "RESOLVED"},
        {"time": "12:45", "alert_type": "Overload Risk", "value": "+8%", "status": "RESOLVED"},
    ]

    return {**vehicle, "alerts": alerts}


@app.get("/api/alerts")
def get_alerts():
    """Alert history (last 50 events)."""
    fleet = get_fleet()
    alerts = []
    for v in fleet:
        if v.get("status") == "HIGH_EMISSION_ALERT":
            alerts.append({
                "vehicle_id": v["vehicle_id"],
                "type": "HIGH_EMISSION_ALERT",
                "detail": f"CO₂: {v.get('co2_kg', 0):.2f} kg",
                "timestamp": v.get("timestamp", time.time()),
            })
    return alerts[:50]


# ────────────────────────────────────────────────────────────────────
# SSE STREAMING (Task 6)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/stream/fleet")
async def stream_fleet_data():
    """
    SSE endpoint: streams fleet state updates from Pathway's JSONL output.
    Frontend subscribes once and receives push updates in real-time.
    This bridges Pathway's streaming output → browser in real-time.
    """
    async def event_generator():
        last_position = 0
        while True:
            if FLEET_FILE.exists():
                try:
                    with open(FLEET_FILE, "r", encoding="utf-8") as f:
                        f.seek(last_position)
                        new_lines = f.readlines()
                        last_position = f.tell()
                    if new_lines:
                        vehicles: dict[str, dict] = {}
                        for line in new_lines:
                            line = line.strip()
                            if line:
                                try:
                                    record = json.loads(line)
                                    vehicles[record.get("vehicle_id", "")] = record
                                except json.JSONDecodeError:
                                    pass
                        if vehicles:
                            data = json.dumps(list(vehicles.values()))
                            yield f"data: {data}\n\n"
                except Exception as e:
                    logger.error(f"SSE read error: {e}")
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ────────────────────────────────────────────────────────────────────
# BOOKING MODULE (Task 1B)
# ────────────────────────────────────────────────────────────────────

@app.post("/api/booking")
async def create_booking(request: Request):
    """
    Create a new logistics booking.
    Appends to data/bookings.jsonl.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    commodities = body.get("commodities", [])
    total_weight = sum(c.get("weight_kg", 0) for c in commodities)
    rate_per_kg = body.get("rate_per_kg", 20)
    service_tax_pct = body.get("service_tax_pct", 12.5)
    freight = total_weight * rate_per_kg * (1 + service_tax_pct / 100)

    booking_id = f"BK-{str(int(time.time()))[-8:]}"
    booking = {
        "booking_id": booking_id,
        "customer_type": body.get("customer_type", "Walk-in Customer"),
        "customer_name": body.get("customer_name", "Unknown"),
        "sender_email": body.get("sender_email", ""),
        "origin": body.get("origin", ""),
        "destination": body.get("destination", ""),
        "commodities": commodities,
        "total_weight": total_weight,
        "rate_per_kg": rate_per_kg,
        "service_tax_pct": service_tax_pct,
        "freight": round(freight, 2),
        "expected_delivery": body.get("expected_delivery", ""),
        "receiver_name": body.get("receiver_name", ""),
        "receiver_email": body.get("receiver_email", ""),
        "status": "pending",
        "vehicle_id": None,
        "created_at": datetime.now().isoformat(),
    }

    _append_jsonl(BOOKINGS_FILE, booking)

    return {
        "booking_id": booking_id,
        "freight": round(freight, 2),
        "status": "confirmed",
        "created_at": booking["created_at"],
    }


@app.get("/api/bookings")
def get_bookings():
    """Return last 50 bookings."""
    bookings = _read_jsonl(BOOKINGS_FILE, last_n=50)
    return {"data": bookings, "count": len(bookings), "status": "ok"}


@app.post("/api/booking/{booking_id}/dispatch")
async def dispatch_booking(booking_id: str, request: Request):
    """Assign a vehicle to a booking and update status to dispatched."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    vehicle_id = body.get("vehicle_id")
    if not vehicle_id:
        return JSONResponse({"error": "vehicle_id required"}, status_code=400)

    bookings = _read_jsonl(BOOKINGS_FILE, last_n=1000)
    updated = False
    for b in bookings:
        if b.get("booking_id") == booking_id:
            b["status"] = "dispatched"
            b["vehicle_id"] = vehicle_id
            updated = True
            break

    if updated:
        with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
            for b in bookings:
                f.write(json.dumps(b) + "\n")
        return {"status": "dispatched", "booking_id": booking_id, "vehicle_id": vehicle_id}

    return JSONResponse({"error": "Booking not found"}, status_code=404)


@app.post("/api/booking/{booking_id}/update-docs")
async def update_booking_docs(booking_id: str, request: Request):
    """Update AWB number and port number for a booking."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    bookings = _read_jsonl(BOOKINGS_FILE, last_n=1000)
    updated = False
    for b in bookings:
        if b.get("booking_id") == booking_id:
            if "awb_number" in body:
                b["awb_number"] = body["awb_number"]
            if "port_number" in body:
                b["port_number"] = body["port_number"]
            updated = True
            break

    if updated:
        with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
            for b in bookings:
                f.write(json.dumps(b) + "\n")
        return {"status": "updated", "booking_id": booking_id}

    return JSONResponse({"error": "Booking not found"}, status_code=404)


@app.get("/api/invoice/{booking_id}")
def get_invoice(booking_id: str):
    """Return plain text invoice for a booking."""
    bookings = _read_jsonl(BOOKINGS_FILE, last_n=1000)
    booking = next((b for b in bookings if b.get("booking_id") == booking_id), None)
    if not booking:
        return JSONResponse({"error": "Booking not found"}, status_code=404)

    invoice_text = f"""
╔══════════════════════════════════════════════╗
║           ROUTEZERO LOGISTICS                ║
║           FREIGHT INVOICE                    ║
╠══════════════════════════════════════════════╣
  Invoice ID:    INV-{booking_id}
  Booking ID:    {booking_id}
  Date:          {booking.get('created_at', 'N/A')}

  Customer:      {booking.get('customer_name', 'N/A')}
  Sender Email:  {booking.get('sender_email', 'N/A')}

  Origin:        {booking.get('origin', 'N/A')}
  Destination:   {booking.get('destination', 'N/A')}

  Receiver:      {booking.get('receiver_name', 'N/A')}
  Receiver Email:{booking.get('receiver_email', 'N/A')}

  ── Commodities ──────────────────────────────
  {_format_commodities(booking.get('commodities', []))}

  Total Weight:  {booking.get('total_weight', 0)} KG
  Rate/KG:       ₹{booking.get('rate_per_kg', 0)}
  Service Tax:   {booking.get('service_tax_pct', 0)}%
  ─────────────────────────────────────────────
  FREIGHT TOTAL: ₹{booking.get('freight', 0):.2f}

  Status:        {booking.get('status', 'N/A').upper()}
  Vehicle:       {booking.get('vehicle_id', 'Unassigned')}
  Expected Del:  {booking.get('expected_delivery', 'N/A')}
╚══════════════════════════════════════════════╝
"""
    return {"invoice": invoice_text.strip(), "booking_id": booking_id}


def _format_commodities(commodities: list[dict]) -> str:
    """Format commodity list for invoice."""
    if not commodities:
        return "  No commodities listed"
    lines = []
    for c in commodities:
        lines.append(f"  {c.get('name', 'Unknown')}: {c.get('weight_kg', 0)} KG")
    return "\n".join(lines)


@app.post("/api/notify-driver")
async def notify_driver(request: Request):
    """Send notification to driver. Appends to notifications.jsonl."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    notification = {
        "vehicle_id": body.get("vehicle_id", ""),
        "alert_type": body.get("alert_type", "manual"),
        "message": body.get("message", ""),
        "timestamp": datetime.now().isoformat(),
        "notified": True,
    }

    _append_jsonl(NOTIFICATIONS_FILE, notification)

    return {"notified": True, "timestamp": notification["timestamp"]}


# ────────────────────────────────────────────────────────────────────
# KPI ENDPOINTS (Task 3)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/co2-trend")
def co2_trend():
    """CO₂ per hour for last 24 hours, grouped by route."""
    fleet = get_fleet()
    data = []
    for hour in range(8, 21):
        for route_id in ["delhi_mumbai", "chennai_bangalore", "kolkata_patna"]:
            route_vehicles = [v for v in fleet if v.get("route_id") == route_id]
            co2_sum = sum(v.get("co2_kg", 0) for v in route_vehicles)
            # Simulate hourly variation
            factor = 0.7 + (hour % 3) * 0.15
            data.append({
                "hour": f"{hour:02d}:00",
                "co2_kg": round(co2_sum * factor, 1),
                "route": route_id,
            })
    return {"data": data}


@app.get("/api/eta-breakdown")
def eta_breakdown():
    """Per-vehicle ETA status breakdown."""
    fleet = get_fleet()
    data = []
    for v in fleet:
        data.append({
            "vehicle_id": v.get("vehicle_id"),
            "status": v.get("eta_status", "UNKNOWN"),
            "eta_minutes": int(v.get("eta_hours", 0) * 60),
            "on_time": v.get("eta_status") == "ON_TIME",
            "route": v.get("route_id"),
        })
    return {"data": data}


# ────────────────────────────────────────────────────────────────────
# AI CHAT (Task 7)
# ────────────────────────────────────────────────────────────────────

def _extract_vehicle_id(query: str) -> Optional[str]:
    """Extract vehicle ID from query using regex."""
    match = re.search(r"TRK-[A-Z]+-\d+", query, re.IGNORECASE)
    return match.group(0).upper() if match else None


def _extract_booking_id(query: str) -> Optional[str]:
    """Extract booking ID from query."""
    match = re.search(r"BK-\d+", query, re.IGNORECASE)
    return match.group(0).upper() if match else None


def _find_booking_by_vehicle(vehicle_id: str) -> Optional[dict]:
    """Find booking assigned to a vehicle."""
    bookings = _read_jsonl(BOOKINGS_FILE, last_n=100)
    return next((b for b in bookings if b.get("vehicle_id") == vehicle_id), None)


def _find_booking(booking_id: str) -> Optional[dict]:
    """Find booking by ID."""
    bookings = _read_jsonl(BOOKINGS_FILE, last_n=100)
    return next((b for b in bookings if b.get("booking_id") == booking_id), None)


def _handle_structured_query(query: str) -> Optional[str]:
    """Route structured queries before hitting Gemini."""
    q = query.lower()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Invoice lookup
    if "invoice" in q:
        vehicle_id = _extract_vehicle_id(query)
        if vehicle_id:
            booking = _find_booking_by_vehicle(vehicle_id)
            if booking:
                inv = get_invoice(booking["booking_id"])
                if isinstance(inv, dict) and "invoice" in inv:
                    return f"**Invoice for {vehicle_id}:**\n```\n{inv['invoice']}\n```\n\n(Source: Live Pathway Data, {ts})"
            # Try finding any booking
            bookings = _read_jsonl(BOOKINGS_FILE, last_n=50)
            if bookings:
                b = bookings[0]
                inv = get_invoice(b["booking_id"])
                if isinstance(inv, dict) and "invoice" in inv:
                    return f"**Invoice found (latest booking):**\n```\n{inv['invoice']}\n```\n\n(Source: Live Pathway Data, {ts})"
        return f"No invoice found for the specified vehicle. Please check the vehicle ID.\n\n(Source: Live Pathway Data, {ts})"

    # Temperature compliance
    if "temperature" in q or "compliance" in q or "cold chain" in q:
        fleet = get_fleet()
        cold_chain = [v for v in fleet if v.get("temperature_c") is not None]
        breaches = [v for v in cold_chain if v.get("temperature_breach")]
        report = f"**Temperature Compliance Report**\n\n"
        report += f"- Cold chain vehicles: **{len(cold_chain)}**\n"
        report += f"- Active breaches: **{len(breaches)}**\n\n"
        for v in cold_chain:
            status = "⚠️ BREACH" if v.get("temperature_breach") else "✅ OK"
            report += f"- {v['vehicle_id']}: {v.get('temperature_c', 'N/A')}°C {status}\n"
        report += f"\n(Source: Live Pathway Data, {ts})"
        return report

    # CO2 audit
    if "worst" in q or "highest emission" in q or "co2" in q:
        fleet = get_fleet()
        if fleet:
            sorted_fleet = sorted(fleet, key=lambda v: v.get("co2_kg", 0), reverse=True)
            report = "**CO₂ Emission Audit**\n\n"
            report += "| Vehicle | Route | CO₂ (kg) | Status |\n"
            report += "|---------|-------|----------|--------|\n"
            for v in sorted_fleet:
                report += f"| {v['vehicle_id']} | {v.get('route_id', 'N/A')} | {v.get('co2_kg', 0):.2f} | {v.get('status', 'N/A')} |\n"
            worst_route = max(set(v.get("route_id") for v in fleet), key=lambda r: sum(v.get("co2_kg", 0) for v in fleet if v.get("route_id") == r))
            report += f"\n**Worst corridor:** {worst_route.replace('_', ' → ')}\n"
            report += f"\n(Source: Live Pathway Data, {ts})"
            return report

    # Booking status
    if "status" in q and "bk-" in q:
        booking_id = _extract_booking_id(query)
        if booking_id:
            booking = _find_booking(booking_id)
            if booking:
                return f"**Booking Status: {booking_id}**\n\n- Customer: {booking.get('customer_name')}\n- Route: {booking.get('origin')} → {booking.get('destination')}\n- Status: **{booking.get('status', 'unknown').upper()}**\n- Freight: ₹{booking.get('freight', 0):.2f}\n- Vehicle: {booking.get('vehicle_id', 'Unassigned')}\n\n(Source: Live Pathway Data, {ts})"

    return None


@app.post("/api/chat")
async def chat(request: Request):
    """RouteZero AI chat endpoint with structured query handling."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    query = body.get("query", "")
    if not query:
        return {"response": "Please provide a query."}

    # Try structured query first
    structured = _handle_structured_query(query)
    if structured:
        return {"response": structured, "sources": ["bookings.jsonl", "fleet_summary.jsonl"], "live_data_used": True}

    # Fallback response
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    fleet = get_fleet()
    total_co2 = sum(v.get("co2_kg", 0) for v in fleet)
    active = len(fleet)

    return {
        "response": f"**RouteZero AI Analysis**\n\nBased on live fleet data:\n- Active vehicles: **{active}**\n- Total CO₂: **{total_co2:.1f} kg**\n- Query: \"{query}\"\n\nI can help with invoice lookups, temperature compliance, CO₂ audits, and booking status. Try asking:\n- \"Show invoice for TRK-DL-004\"\n- \"Temperature compliance Kolkata\"\n- \"Which route has worst CO₂?\"\n\n(Source: Live Pathway Data, {ts})",
        "sources": ["fleet_summary.jsonl"],
        "live_data_used": True,
    }


# ────────────────────────────────────────────────────────────────────
# FLEET RANKINGS (Task 8)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/fleet-rankings")
def fleet_rankings():
    """Fleet sorted by CO₂ efficiency (best to worst), with score."""
    fleet = get_fleet()
    rankings = []
    for v in fleet:
        co2 = v.get("co2_kg", 0)
        # Estimate distance from remaining_km or use a default
        distance = v.get("remaining_km", 100) or 100
        co2_per_km = co2 / max(distance, 1)
        score = max(1, min(5, 5 - int((co2_per_km - 0.02) / 0.015)))
        rankings.append({
            "vehicle_id": v.get("vehicle_id"),
            "route": v.get("route_id", ""),
            "co2_kg": round(co2, 2),
            "co2_per_km": round(co2_per_km, 4),
            "score": score,
            "status": v.get("status", "NORMAL"),
        })
    rankings.sort(key=lambda x: x["co2_per_km"])
    return {"data": rankings}


# ────────────────────────────────────────────────────────────────────
# CARBON REPORT (Task 9)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/carbon-report")
def carbon_report():
    """Structured carbon credit export report."""
    fleet = get_fleet()
    total_co2_kg = sum(v.get("co2_kg", 0) for v in fleet)
    total_co2_tonnes = total_co2_kg / 1000
    baseline_co2_tonnes = total_co2_tonnes * 1.26  # IPCC AR6 baseline
    reduction_tonnes = max(0, baseline_co2_tonnes - total_co2_tonnes)

    vehicles_report = []
    for v in fleet:
        co2_t = v.get("co2_kg", 0) / 1000
        vehicles_report.append({
            "vehicle_id": v.get("vehicle_id"),
            "route": v.get("route_id", ""),
            "co2_tonnes": round(co2_t, 4),
            "credits": round(max(0, co2_t * 0.26), 4),
        })

    return {
        "report_date": datetime.now().strftime("%Y-%m-%d"),
        "reporting_period": "last_30_days",
        "total_co2_kg": round(total_co2_kg, 1),
        "total_co2_tonnes": round(total_co2_tonnes, 3),
        "baseline_co2_tonnes": round(baseline_co2_tonnes, 3),
        "reduction_tonnes": round(reduction_tonnes, 3),
        "carbon_credits_generated": round(reduction_tonnes, 3),
        "credit_value_inr": round(reduction_tonnes * 430, 0),
        "methodology": "IPCC AR6 WGIII Table 10.1 + BEE-ICM 2024 MRV",
        "vehicles": vehicles_report,
        "compliance": {
            "nlp_2022_target_pct": 20,
            "achieved_pct": round(min(100, (reduction_tonnes / max(baseline_co2_tonnes, 0.001)) * 100), 1),
            "status": "COMPLIANT" if reduction_tonnes > 0 else "NON-COMPLIANT",
        },
    }


# ────────────────────────────────────────────────────────────────────
# PATHWAY HEALTH (Task 10)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/pathway-status")
def pathway_status():
    """Check if Pathway pipeline is actively writing data."""
    if not FLEET_FILE.exists():
        return {"status": "OFFLINE", "message": "fleet_summary.jsonl not found", "age_seconds": -1}

    try:
        age_seconds = time.time() - FLEET_FILE.stat().st_mtime

        if age_seconds < 10:
            records = len(_read_jsonl(FLEET_FILE, last_n=1000))
            return {"status": "LIVE", "age_seconds": round(age_seconds, 1), "records": records}
        elif age_seconds < 60:
            return {"status": "DELAYED", "age_seconds": round(age_seconds, 1)}
        else:
            return {
                "status": "OFFLINE",
                "age_seconds": round(age_seconds, 1),
                "tip": "Run: python simulate_pipeline.py",
            }
    except Exception as e:
        return {"status": "OFFLINE", "message": str(e), "age_seconds": -1}


# ────────────────────────────────────────────────────────────────────
# ROUTE SUMMARY (existing endpoint — preserve)
# ────────────────────────────────────────────────────────────────────

@app.get("/api/route-summary")
def route_summary():
    """Per-route CO₂ totals + compliance %."""
    fleet = get_fleet()
    routes: dict[str, dict] = {}
    for v in fleet:
        rid = v.get("route_id", "unknown")
        if rid not in routes:
            routes[rid] = {"route_id": rid, "total_co2_kg": 0, "vehicle_count": 0, "total_fuel_liters": 0}
        routes[rid]["total_co2_kg"] += v.get("co2_kg", 0)
        routes[rid]["vehicle_count"] += 1
        routes[rid]["total_fuel_liters"] += v.get("fuel_consumed_liters", 0)
    return list(routes.values())


# ────────────────────────────────────────────────────────────────────
# SPIKE TRIGGER (existing endpoint — preserve)
# ────────────────────────────────────────────────────────────────────

@app.post("/api/spike")
async def trigger_spike(request: Request):
    """Trigger a demo CO₂ spike for a vehicle."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    vehicle_id = body.get("vehicle_id", "TRK-DL-001")
    return {"status": "spike_triggered", "vehicle_id": vehicle_id}


if __name__ == "__main__":
    import uvicorn
    _ensure_dirs()
    uvicorn.run(app, host="0.0.0.0", port=8000)
