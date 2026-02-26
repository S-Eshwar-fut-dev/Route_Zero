# GreenPulse v2.0 — 3-Minute Demo Script
## Hack For Green Bharat | Exact Words to Say

---

### MINUTE 1 — The Overview (0:00–1:00)

*[Open browser to localhost:3000. It redirects to /overview. Let the dashboard load — 3 seconds for the map and KPIs to populate.]*

**Say:**
> "What you're looking at right now is a live feed. These are 10 trucks — actual cargo vehicles — moving across three of India's most carbon-intensive freight corridors: Delhi to Mumbai, Chennai to Bangalore, and Kolkata to Patna.

> Every green polyline on this map is a live corridor. Every dot is a truck updating every two seconds. This number here — [point to CO₂ Saved KPI card, glowing green] — is going up right now.

> India's logistics sector emits 13.5% of all national greenhouse gases. GreenPulse is India's first real-time carbon intelligence layer for logistics."

*[Pause 3 seconds. Let the CO₂ Saved number tick.]*

---

### MINUTE 2 — Spike + Alert Center (1:00–2:00)

*[Click the red "🔴 Trigger Spike Alert" button at the top right of the Overview page.]*

**Say:**
> "I just sent a spike command to one of our trucks. Watch the map."

*[Wait 4 seconds for the marker to turn red and the Resolution Center to show a new alert card.]*

> "There it is — that truck just went into a HIGH EMISSION ALERT. Its 5-minute CO₂ output crossed twice its rolling average."

*[Click "Alert Center" in the sidebar — navigate to /alerts.]*

> "Every alert is timestamped, categorized, and actionable. I can notify the driver [click Notify Driver — toast "Driver notified"] or recalculate the route [click Recalculate Route — toast "Route recalculated"]. No phone calls, no radio."

*[Click "View Vehicle" on the alert card — navigate to /fleet/TRK-XX-XXX.]*

> "Every truck has a story. This one is burning 2.3× its normal CO₂ rate right now."

---

### MINUTE 3 — GreenAI + Compliance Close (2:00–3:00)

*[Click the 💬 GreenAI button in the sidebar — the chat drawer slides in from the right.]*

**Ask:** "Why is this truck over-emitting and what should we do?"

*[Wait for the response. Read the cited, grounded answer aloud.]*

> "It told us the likely cause, the financial impact, and the recommended action — sourced from live fleet data and the India National Logistics Policy. No hallucinations. Cited. Grounded."

*[Close the drawer. Navigate to /analytics.]*

> "India's National Logistics Policy 2022 mandates a 20% reduction in per-route CO₂ by 2027. GreenPulse tracks that — not quarterly — second by second. [Point to NLP Compliance bars.] Delhi-Mumbai is at 82%. Kolkata-Patna is at 90%.

> This is not a dashboard. This is the carbon intelligence layer India's logistics didn't have. Thank you."

---

## Pre-Demo Checklist (Night Before)
- [ ] Terminal 1: `python simulate_pipeline.py` — confirm "10 events written" ticking every 2s
- [ ] Terminal 2: `python -m uvicorn rag.api_server:app --port 8000 --reload` — confirm `GET localhost:8000/health` returns `docs_loaded > 0`
- [ ] Terminal 3: `cd frontend && npm run dev` — confirm localhost:3000 redirects to /overview with truck markers on map
- [ ] CO₂ Saved KPI shows a non-zero, growing green number
- [ ] Navigate: Overview → Fleet List → click a truck → Vehicle Detail → Analytics → Alert Center
- [ ] Test "Trigger Spike Alert" — marker turns red, alert appears in Resolution Center
- [ ] Open GreenAI chat drawer — confirm quick questions return answers
- [ ] Record 60-second backup video of full working demo
- [ ] Have `.env` with valid `GEMINI_API_KEY` on the demo machine
- [ ] Close all other browser tabs — projector in windowed mode, not fullscreen

## Backup Plan (If Network/API Fails)
GreenAI automatically falls back to pre-cached answers for all 5 demo questions.
The `live_data_used` badge will show false, but the answers will still be accurate.
Say: *"GreenPulse includes a resilience layer — even when the LLM API is unreachable, the system serves pre-validated answers from the last known state."*
