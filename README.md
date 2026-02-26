# 🌿 GreenPulse — Real-Time Carbon Intelligence for India's Logistics

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Pathway](https://img.shields.io/badge/Streaming-Pathway-green)](https://pathway.com)
[![Gemini 1.5 Pro](https://img.shields.io/badge/AI-Gemini%201.5%20Pro-orange?logo=google)](https://deepmind.google/gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **India's first real-time carbon ledger for freight logistics.** GreenPulse streams GPS telemetry from trucks, computes CO₂ in real time using IPCC AR6 emission factors, predicts ETA delays before they happen, and lets fleet operators ask natural-language questions about their fleet's carbon footprint — answered by Gemini 1.5 Pro with citations from India's NLP 2022 policy.

**Built for Hack For Green Bharat 2026.**

---

## 📸 Demo

| Fleet Map (Live) | Rolling Emissions Chart | GreenAI Chat |
|:---:|:---:|:---:|
| Dark map, 3 corridors, ghost path predictions | 30-min sliding window per route | Gemini answers with NLP 2022 citations |

> 🔴 `HIGH_EMISSION_ALERT` fires when a truck's 5-minute CO₂ exceeds 2× its rolling average  
> 🟡 `DELAYED` ghost paths turn red when ETA confidence drops below threshold  
> ❄️ Cold-chain breach detection triggers at -18°C SLA violation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│   GPS Telemetry (5-min tumbling)  +  Order Stream (real-time)   │
└──────────────────┬──────────────────────────┬───────────────────┘
                   │                          │
                   ▼                          ▼
         ┌─────────────────────────────────────────┐
         │     Pathway Streaming Engine (Docker)    │
         │  • Dual-stream JOIN (telemetry + orders) │
         │  • 5-min tumbling windows (alerts)       │
         │  • 30-min sliding windows (trends)       │
         │  • IPCC AR6 CO₂ computation per vehicle  │
         │  • ETA engine with ghost path projection │
         └──────────────────┬──────────────────────┘
                            │ writes to ./tmp/ (shared volume)
                            ▼
                 ┌─────────────────────┐
                 │   FastAPI Backend    │
                 │  • /api/fleet        │
                 │  • /api/fleet-intel  │
                 │  • /api/chat (RAG)   │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Next.js Dashboard   │
                 │  • Fleet map (Leaflet)│
                 │  • Metrics panel     │
                 │  • Rolling chart     │
                 │  • GreenAI chat UI   │
                 └─────────────────────┘
```

**Key architectural decision:** Pathway runs in a Docker container (WSL2 backend), while FastAPI and Next.js run natively on Windows. A shared `./tmp/` volume bridges them — same pattern as the La Poste EU reference implementation.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (for Pathway pipeline)
- Gemini API key ([get one free](https://aistudio.google.com))

### 1. Clone & configure

```bash
git clone https://github.com/S-Eshwar-fut-dev/greenpulse.git
cd greenpulse
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start Pathway pipeline (Docker)

```bash
docker compose -f docker-compose.pathway.yml up --build
# Pathway begins writing to ./tmp/fleet_summary.jsonl
```

### 3. Start FastAPI backend

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn rag.api_server:app --port 8000 --reload
```

### 4. Start Next.js frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### ⚡ One-command start (Windows)

```bash
start.bat
```

### 🔁 Fallback (no Docker needed)

```bash
python simulate_pipeline.py
# Writes identical data to ./tmp/ — full demo works without Docker
```

## ⚙️ Development Setup & Makefile

To run the Green Pulse Command Center locally under the new containerized architecture:

### 1. Clone the repository
```bash
git clone https://github.com/S-Eshwar-fut-dev/Green_Pulse.git
cd Green_Pulse
```

### 2. Install Dependencies (Frontend)
```bash
cd frontend
npm install
```

### 3. Environment Variables Reference
Create a `.env.local` file in the `frontend` directory. Ensure the following keys are populated:
* `GEMINI_API_KEY`: Strictly required for the GreenAI Co-Pilot to analyze natural language queries.
* `PATHWAY_REST_ENDPOINT`: (Optional) Override local Pathway container IP if deploying remotely.

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📁 Project Structure

```
greenpulse/
├── 📄 README.md
├── 📄 requirements.txt
├── 📄 .env.example
├── 📄 config.py                    # Path resolution (Docker-aware)
├── 📄 main_pipeline.py             # Pathway streaming pipeline entry
├── 📄 simulate_pipeline.py         # Windows-compatible demo fallback
├── 📄 start.bat                    # Windows one-command launcher
├── 📄 start.sh                     # Linux/Mac launcher
├── 📄 docker-compose.pathway.yml   # Pathway Docker container only
├── 📄 Dockerfile.pathway           # Minimal Pathway image
│
├── 📂 connectors/                  # Pathway data sources
│   ├── telemetry_source.py         # GPS telemetry stream
│   └── order_source.py             # Order management stream
│
├── 📂 transforms/                  # Pathway computation graph
│   ├── co2_engine.py               # IPCC AR6 emission factor logic
│   ├── eta_engine.py               # ETA prediction with ghost paths
│   ├── window_aggregations.py      # 5-min tumbling + 30-min sliding
│   └── alert_logic.py              # HIGH_EMISSION_ALERT thresholds
│
├── 📂 rag/                         # FastAPI + RAG backend
│   ├── api_server.py               # FastAPI app + all endpoints
│   ├── retriever.py                # BM25 document retrieval
│   ├── gemini_client.py            # Gemini 1.5 Pro integration
│   └── fleet_reader.py             # JSONL fleet state reader
│
├── 📂 data/                        # Policy & compliance documents
│   ├── nlp_2022_summary.txt        # India National Logistics Policy 2022
│   ├── ipcc_ar6_factors.txt        # IPCC AR6 emission factors
│   └── bee_icm_guidelines.txt      # BEE India Carbon Market guidelines
│
├── 📂 frontend/                    # Next.js 14 dashboard
│   ├── 📄 package.json
│   ├── 📄 next.config.js
│   ├── 📂 app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Main dashboard
│   │   └── api/
│   │       ├── fleet/route.ts      # Fleet data proxy
│   │       └── chat/route.ts       # GreenAI chat proxy
│   ├── 📂 components/
│   │   ├── FleetMap.tsx            # Leaflet map with corridors + ghost paths
│   │   ├── MetricsPanel.tsx        # CO₂ stats + alert counters
│   │   ├── RollingChart.tsx        # Recharts rolling emissions chart
│   │   └── GreenAIChat.tsx         # Gemini chat interface
│   └── 📂 lib/
│       └── types.ts                # Shared TypeScript interfaces
│
└── 📂 tmp/                         # Runtime data (gitignored)
    ├── fleet_summary.jsonl         # Written by Pathway / simulate_pipeline.py
    └── eta_summary.jsonl           # ETA predictions
```

## ⚡ Key Features

### 🔴 Real-Time Alerts
- `HIGH_EMISSION_ALERT` fires when a truck's 5-minute CO₂ average exceeds 2× its 30-minute rolling baseline
- Cold-chain temperature breach detection (SLA: -18°C for frozen cargo)
- Alert history tracked per vehicle

### 🗺️ Live Fleet Intelligence
- 3 real freight corridors: **Delhi–Mumbai (NH48)**, **Chennai–Bangalore (NH44)**, **Kolkata–Patna (NH19)**
- Ghost path predictions: dashed lines show predicted route to destination, turning red when ETA is `DELAYED`
- Live CO₂ intensity coloring (green → amber → red) per truck marker

### 🤖 GreenAI Co-Pilot
- Ask: *"Why is truck TRK_003 over-emitting on the Delhi–Mumbai corridor?"*
- Get: Grounded answer citing NLP 2022 compliance targets + IPCC AR6 factors + live fleet data
- Powered by Gemini 1.5 Pro with BM25 retrieval from policy documents

### 📊 Compliance Dashboard
- Per-route NLP 2022 compliance bars (e.g., Delhi–Mumbai: 82%)
- 30-minute rolling emissions chart per corridor
- Fleet-wide CO₂ summary with trend indicators

---

## 🔬 Emission Calculation

GreenPulse uses **IPCC AR6 Working Group III (2022)** emission factors:

```python
# Base factor: 0.89 kg CO₂ per km (heavy freight, diesel)
# Load multiplier: 1.0 (empty) → 1.4 (full load)
# Speed efficiency: optimal at 60–80 km/h; penalty above 90 km/h

co2_kg = distance_km × base_factor × load_multiplier × speed_efficiency_factor
```

Cold-chain vehicles apply an additional **refrigeration load factor (1.25×)** per ASHRAE standard.

---

## 📊 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/fleet` | GET | Current state of all vehicles |
| `/api/fleet-intel` | GET | Fleet + ETA + window aggregations |
| `/api/route-summary` | GET | Per-route CO₂ totals + compliance % |
| `/api/chat` | POST | GreenAI query (body: `{"query": "..."}`) |
| `/api/alerts` | GET | Alert history (last 50 events) |

---

## 🏭 Routes & Corridors

| Route | Corridor | Distance | Vehicles |
|-------|----------|----------|---------|
| `delhi_mumbai` | NH48 — Delhi → Agra → Jabalpur → Vadodara → Mumbai | ~1,400 km | TRK_001, TRK_002, TRK_003, TRK_004 |
| `chennai_bangalore` | NH44 — Chennai → Vellore → Krishnagiri → Bangalore | ~350 km | TRK_005, TRK_006, TRK_007 |
| `kolkata_patna` | NH19 — Kolkata → Asansol → Gaya → Patna | ~580 km | TRK_008, TRK_009, TRK_010 |

---

## 🧪 Demo Script

1. Start the stack (`start.bat` or Docker + FastAPI + Next.js manually)
2. Open `http://localhost:3000`
3. Watch the map — ghost paths update every 2 seconds
4. Trigger a demo spike: `python -c "import simulate_pipeline; simulate_pipeline.trigger_spike('TRK_003')"`
5. Observe `HIGH_EMISSION_ALERT` on the map + metrics panel
6. Ask GreenAI: *"Which route has the worst NLP 2022 compliance and why?"*

---

## 📈 Business Model

| Stream | Description | Pricing |
|--------|-------------|---------|
| **Fleet SaaS** | Per-fleet carbon intelligence dashboard | ₹8,000–25,000/month |
| **Carbon MRV** | Verified carbon credit generation (BEE-ICM ready) | 2% of credits issued |
| **Compliance API** | Real-time CO₂ data for 3PLs, insurers, NLP auditors | Enterprise licensing |

**Market:** $180B India logistics by 2030 (IBEF) · ₹430–680/tonne carbon credits (BEE-ICM 2024)

---

## 🛣️ Roadmap

- [x] **v1.0** — Core telemetry pipeline, IPCC CO₂ computation, Gemini RAG chat
- [x] **v2.0** — Dual-stream ETA engine, ghost path predictions, cold-chain monitoring, Docker containerization
- [ ] **2026 Q3** — Live pilot with 3 fleet operators on NH48; BEE-ICM MRV certification
- [ ] **2027** — 500+ vehicle support; DFC rail carbon integration
- [ ] **2028** — Full Scope 3 supply chain ledger; India Carbon Market integration

---

## 🔧 Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
DEMO_MODE=0          # Set to 1 to use pre-recorded demo data
TMP_DIR=./tmp        # Override for Docker volume path
LOG_LEVEL=INFO
```

---

## 📚 Data Sources & Citations

- **IPCC AR6 WGIII (2022)** — Emission factors for road freight transport
- **India National Logistics Policy 2022 (NLP 2022)** — Ministry of Commerce & Industry
- **BEE India Carbon Market (ICM) Guidelines 2024** — Bureau of Energy Efficiency
- **IBEF India Logistics Report 2023** — India Brand Equity Foundation
- **La Poste × Pathway** — Reference architecture for dual-stream logistics pipelines

---

## 🤝 Contributing

Contributions welcome. Please open an issue before submitting a PR for significant changes.

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---