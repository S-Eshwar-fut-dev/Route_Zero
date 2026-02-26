#!/bin/bash
set -e

echo "========================================"
echo "    GreenPulse v2.0 — Starting"
echo "========================================"

echo ""
echo "[1/3] Starting Pathway pipeline in Docker..."
docker compose -f docker-compose.pathway.yml up -d --build || {
    echo "[!] Docker unavailable — using simulate_pipeline.py fallback"
    python simulate_pipeline.py &
}

echo ""
echo "[2/3] Starting FastAPI server..."
python -m uvicorn rag.api_server:app --port 8000 --reload &

echo ""
echo "[3/3] Starting Next.js dashboard..."
cd frontend && npm run dev
