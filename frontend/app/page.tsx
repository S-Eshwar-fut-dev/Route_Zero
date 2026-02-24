"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import MetricsPanel from "@/components/MetricsPanel";
import RollingChart from "@/components/RollingChart";
import ChatBox from "@/components/ChatBox";
import AnomalyLog from "@/components/AnomalyLog";
import Sidebar from "@/components/Sidebar";
import { fetchFleet } from "@/lib/api";
import type { VehicleEvent, AnomalyEntry } from "@/lib/types";

const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<VehicleEvent[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("All");
  const [budget, setBudget] = useState(3400);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    const data = await fetchFleet();
    if (!data.length) return;

    const filtered = selectedRoute === "All" ? data : data.filter(v => v.route_id === selectedRoute);
    setVehicles(filtered);

    const newAnomalies: AnomalyEntry[] = [];
    for (const v of filtered) {
      if (v.status === "HIGH_EMISSION_ALERT") {
        newAnomalies.push({
          id: `${v.vehicle_id}-${v.timestamp}`,
          timestamp: v.timestamp,
          vehicle_id: v.vehicle_id,
          type: "HIGH_EMISSION_ALERT",
          detail: `CO₂: ${v.co2_kg?.toFixed(2)} kg | Fuel: ${v.fuel_consumed_liters?.toFixed(2)} L`,
        });
      }
      if (v.deviation_status && !v.deviation_status.startsWith("OK")) {
        const parts = v.deviation_status.split("|");
        newAnomalies.push({
          id: `${v.vehicle_id}-dev-${v.timestamp}`,
          timestamp: v.timestamp,
          vehicle_id: v.vehicle_id,
          type: "ROUTE_DEVIATION_ALERT",
          detail: parts.slice(1).join(" | "),
        });
      }
    }
    if (newAnomalies.length) {
      setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 50));
    }
  }, [selectedRoute]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #30363d", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#00ff87", letterSpacing: "-0.01em" }}>🌿 GreenPulse</span>
        <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>Real-Time Carbon Intelligence · Indian Logistics · Powered by Pathway</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff87", display: "inline-block", boxShadow: "0 0 6px #00ff87" }} />
          <span style={{ color: "#00ff87", fontSize: "0.75rem", fontWeight: 600 }}>LIVE</span>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gridTemplateRows: "auto", gap: 0 }}>
        {/* Sidebar */}
        <aside style={{ padding: 16, borderRight: "1px solid #30363d", minHeight: "calc(100vh - 53px)" }}>
          <Sidebar
            selectedRoute={selectedRoute}
            budget={budget}
            onRouteChange={setSelectedRoute}
            onBudgetChange={setBudget}
          />
        </aside>

        {/* Main content */}
        <main style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Top row: Map + Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: 340 }}>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #30363d" }}>
              <FleetMap vehicles={vehicles} />
            </div>
            <MetricsPanel vehicles={vehicles} />
          </div>

          {/* Chart row */}
          <RollingChart />

          {/* Bottom row: Chat + Anomaly Log */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, height: 420 }}>
            <ChatBox />
            <AnomalyLog anomalies={anomalies} />
          </div>
        </main>
      </div>
    </div>
  );
}
