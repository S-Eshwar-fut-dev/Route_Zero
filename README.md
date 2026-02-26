<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/leaf.svg" alt="Green Pulse Logo" width="80" height="80">
  
  # � Green Pulse Enterprise
  
  **Intelligent Logistics Orchestration Platform Optimizing Freight Routing, Cold-Chain Compliance, and Real-Time CO₂ Reduction.**
  
  *Built for the [Hackfor Green Earth Hackathon](https://hackforgreenearth.com)*
</div>

<br />

## � The Issue It Solves (The Problem)

The global logistics and heavy freight industry is responsible for over **8% of global greenhouse gas emissions**. Current supply chain management relies on disjointed, reactive systems that fail to address three major systemic failures:

1. **Reactive Cold-Chain Failures:** Billions of dollars in pharmaceuticals and perishable goods are lost annually due to undetected temperature breaches during transit, resulting in massive waste and unnecessary duplicate production cycles (and thus double the carbon footprint).
2. **Invisible Inefficiencies:** Standard GPS tracking only shows location. It does not correlate speed, traffic, payload constraints, and routing to calculate real-time fuel burn or predict localized CO₂ emissions.
3. **Information Silos:** Drivers, dispatchers, and environmental compliance officers operate in separate silos, meaning eco-friendly routing decisions or emergency reroutes are rarely executed fast enough to prevent environmental or financial damage.

## 💡 The Solution (Green Pulse)

**Green Pulse is a proactive logistics command center** that fuses real-time vehicle telemetry, dynamic routing algorithms, and Generative AI into a single "Datadog-style" enterprise dashboard.

We transform raw, unorganized IoT data points from fleets into **Actionable Environmental Intelligence**. By instantly flagging anomalies (e.g., overloading, cold-chain failure, inefficient routing), Green Pulse allows fleet coordinators to act immediately—saving fuel, preserving cargo, and actively reducing the carbon footprint of every shipment.

---

## ✨ Features & Functionalities

### 1. Advanced Telemetry & Anomaly Detection Engine
* **Cold-Chain Monitoring:** Constant analysis of cargo temperature and humidity. Instant critical alerts triggered if conditions breach safe tolerances (-18°C target ±2°C).
* **Load Compliance:** Real-time correlation of vehicle capacity (`vehicle_capacity_kg`) vs. actual payload (`load_weight_kg`). Flags overloaded vehicles that exponentially increase fuel burn and mechanical wear.
* **ETA & Delay Cascading:** Algorithms calculate exact ETA changes based on routing anomalies, triggering "Risk" protocols if a delay threatens the viability of the cargo.

### 2. Live Enterprise Command Center (60/40 Split)
* **CartoDB Dark Matter Visualization:** A highly optimized, green-tinted 60% hero map utilizing `React-Leaflet`. Plots active vehicles as live data points traversing dashed, animated route corridors across India.
* **Live Fleet Tracking & Resolution:** The 40% metrics panel features ultra-dense fleet status tables, on-time delivery progress trackers, and a rapid Resolution Center to instantly acknowledge or escalate active supply chain alerts.

### 3. GreenAI Logistics Co-Pilot
* **Context-Aware Analytics:** Powered by the Google Gemini AI Model.
* Fleet operators can ask natural language questions like: *"Which cold-chain shipments are at risk of spoiling on the Delhi-Mumbai corridor?"* or *"Calculate our fine exposure for all overloaded trucks."*
* GreenAI instantly accesses the live `FleetContext` state and provides natural language summaries, risk assessments, and rerouting suggestions.

### 4. Comprehensive Fleet Analytics
* **Recharts Dashboard:** Fully integrated data visualization suite tracking the "Fleet Anomaly Rate", "Carbon Emission Trends" (hourly histograms), pie charts of anomaly distributions, and a custom Route Health score evaluating the safety of specific freight corridors.
* **Shipment Timeline Modals:** Granular tracking steps breaking down Dispatch → Transit → Delivery Expected phases.

---

## 🏗️ Technical Architecture & Pathway

Green Pulse is designed as a high-performance, edge-ready Next.js application, utilizing a robust functional React architecture optimized for real-time data flow.

### System Pathway (Data Flow)
1. **Real-Time IoT Ingestion (Pathway):** The backend Python data engine uses the **Pathway** (`pw`) streaming framework to ingest high-frequency synthetic OBD-II and GPS telemetry from fleets. Pathway's `ConnectorSubject` streams data point events seamlessly into memory.
2. **Streaming Anomaly Detection (Pathway UDFs):** Utilizing Pathway's unified engine, User-Defined Functions (like the Haversine route deviation checker) calculate real-time drift, overloaded cargo anomalies, and localized CO₂ footprints on the fly, instantly transforming raw coordinates into alerts like `ROUTE_DEVIATION_ALERT`. *(Note: Due to Vercel's 500MB serverless limit, the live Pathway Python backend is temporarily abstracted into mocked frontend contexts for this specific web deployment, but the core architecture is designed around Pathway).*
3. **State Distribution:** The Next.js standard Context API (`useFleet`) picks up the enriched payload objects (Vehicle List + Active Anomalies) to sync the frontend component tree.
4. **Render Layer:** The Enterprise Top Navbar, IndiaMap (Leaflet), Analytics Dashboard, and Alert Center consume the state. State changes immediately trigger CSS animations.
5. **AI Evaluation Layer (GreenAI):** The unified state blob is serialized and injected into the Next.js API Route `/api/query/route.ts` as a hidden `system_prompt`. This gives the Gemini LLM perfect, up-to-the-second knowledge of the entire supply chain.

### Tech Stack
* **Data Streaming Engine:** Pathway (Python real-time anomaly detection)
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **UI/UX:** Vanilla CSS Modules, CSS Variables (Deep Blue `#0F172A`, Muted Cards `#1A2332`, Emerald Precision `#10B981`)
* **Mapping:** `react-leaflet`, `leaflet`, CartoDB Base Maps
* **Data Visualization:** `recharts`
* **Logistics AI:** `@google/genai` (Gemini Flash 2.5 API)
* **Iconography:** `lucide-react`

---

## 📈 Environmental & Business Impact

Green Pulse proves that **sustainability** and **profitability** are exactly the same metric in logistics.

* **Lower Emissions:** By catching overloaded trucks early and dynamically re-routing delayed vehicles, fleets drastically cut down on wasted diesel, lowering direct Scope 1 CO₂ emissions.
* **Zero Spoilage:** 100% visibility on cold-chain metrics prevents the spoilage of food and medicine. Less wasted product means less replacement product needs to be manufactured (cutting Scope 3 emissions).
* **Enterprise Efficiency:** The automated detection engine removes the need for dispatchers to constantly watch dots on a map, allowing them to focus entirely on exception management.

---

## � Getting Started & Installation

To run the Green Pulse Command Center locally:

### 1. Clone the repository
```bash
git clone https://github.com/S-Eshwar-fut-dev/Green_Pulse.git
cd Green_Pulse
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory. You must provide a valid Gemini API key for the GreenAI Assistant to function.
```env
# Gemini API Key for the GreenAI Co-Pilot Assistant
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. The live telemetry engine will automatically start broadcasting simulated logistics data upon load.

---

## 🗺️ Project Roadmap (Future Pathway)

While fully functional as a prototype, the roadmap for scaling Green Pulse into a production logistics platform includes:

1. **Hardware IoT Integration:** Replacing the simulated `FleetContext` with live WebSocket connections to physical OBD-II telematics devices and cellular BLE temperature sensors inside shipping containers.
2. **Blockchain Compliance:** Writing temperature history logs to an immutable ledger for strict pharmaceutical compliance (FDA/EMA standards) upon delivery.
3. **Automated Rerouting:** Allowing the Gemini AI agent to actually execute API calls to the driver's native dispatch app, automatically changing their route if a massive delay is detected ahead.
4. **Scope 3 Carbon Auditing:** Exporting automated PDF reports mapping exact fuel burn and emissions data for corporate sustainability auditing.

---

<p align="center">
  <b>Green Pulse</b> — Empowering the Supply Chain to heal the Earth. <br/>
  <i>Engineered for the Hackfor Green Earth Hackathon.</i>
</p>
