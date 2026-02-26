import os
import json
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import DEMO_SPIKE_PATH, TMP_DIR
from rag.document_store import load_documents, retrieve
from rag.llm_assistant import answer_query

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_documents()
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[WARNING] GEMINI_API_KEY not set - falling back to cached demo answers.")
    yield


app = FastAPI(title="GreenPulse API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


class SpikeRequest(BaseModel):
    vehicle_id: str


# ── Helpers ──

def _read_jsonl_latest(filepath: str) -> dict[str, dict]:
    """Read a JSONL file and return latest record per vehicle_id."""
    if not os.path.exists(filepath):
        return {}
    try:
        by_vehicle = {}
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line.strip())
                    vid = rec.get("vehicle_id")
                    if vid:
                        by_vehicle[vid] = rec
                except Exception:
                    continue
        return by_vehicle
    except Exception:
        return {}


def _read_fleet_summary() -> list[dict]:
    from config import FLEET_SUMMARY_PATH
    return list(_read_jsonl_latest(FLEET_SUMMARY_PATH).values())


def _read_eta_summary() -> list[dict]:
    eta_path = os.path.join(TMP_DIR, "eta_summary.jsonl")
    return list(_read_jsonl_latest(eta_path).values())


# ── Existing endpoints ──

@app.post("/query")
async def query_endpoint(req: QueryRequest) -> dict:
    """Accept a natural language question, retrieve relevant docs, and return a grounded LLM answer."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    docs = retrieve(req.question)
    result = answer_query(req.question, docs)
    return result


@app.post("/spike")
async def spike_endpoint(req: SpikeRequest) -> dict:
    """Write a spike flag so the pipeline emits 10x fuel for that vehicle."""
    payload = {"vehicle_id": req.vehicle_id, "ts": time.time()}
    try:
        with open(DEMO_SPIKE_PATH, "w") as f:
            json.dump(payload, f)
        return {"status": "spike_set", "vehicle_id": req.vehicle_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not write spike flag: {e}")


# ── NEW: ETA endpoint ──

@app.get("/eta")
async def eta_endpoint() -> dict:
    """Return latest ETA per vehicle from eta_summary.jsonl.
    Frontend polls this every 5s to update ETA display."""
    vehicles = _read_eta_summary()
    return {"vehicles": vehicles}


# ── NEW: Combined fleet intelligence endpoint ──

@app.get("/fleet-intel")
async def fleet_intelligence() -> dict:
    """Combined endpoint: fleet summary + ETAs + active anomalies.
    Powers the Overview page's Resolution Center and ETA badges."""
    fleet = _read_fleet_summary()
    eta_list = _read_eta_summary()

    # Merge ETA data into fleet records
    eta_by_vehicle = {v["vehicle_id"]: v for v in eta_list}
    for vehicle in fleet:
        vid = vehicle.get("vehicle_id")
        if vid in eta_by_vehicle:
            eta = eta_by_vehicle[vid]
            vehicle["eta_hours"] = eta.get("eta_hours", 0)
            vehicle["eta_status"] = eta.get("eta_status", "UNKNOWN")
            vehicle["remaining_km"] = eta.get("remaining_km", 0)
            vehicle["order_id"] = eta.get("order_id", "")
            vehicle["customer"] = eta.get("customer", "")
            vehicle["destination"] = eta.get("destination", "")
            vehicle["avg_speed_kmph_rolling"] = eta.get("avg_speed_kmph", 0)

    delayed = [v for v in fleet if v.get("eta_status") == "DELAYED"]
    at_risk = [v for v in fleet if v.get("eta_status") == "AT_RISK"]
    on_time = [v for v in fleet if v.get("eta_status") == "ON_TIME"]

    return {
        "vehicles": fleet,
        "eta_vehicles": eta_list,
        "summary": {
            "total": len(fleet),
            "delayed": len(delayed),
            "at_risk": len(at_risk),
            "on_time": len(on_time),
        },
    }


# ── Health check ──

@app.get("/health")
async def health() -> dict:
    from rag.document_store import _CHUNKS
    eta_list = _read_eta_summary()
    return {
        "status": "ok",
        "version": "2.0.0",
        "docs_loaded": len(_CHUNKS),
        "eta_vehicles": len(eta_list),
    }
