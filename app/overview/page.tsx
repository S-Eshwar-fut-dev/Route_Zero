"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useFleet, driverName } from "@/lib/FleetContext";
import KpiCard from "@/components/KpiCard";
import FleetAvgChart from "@/components/FleetAvgChart";
import { postSpike } from "@/lib/api";

const IndiaMap = dynamic(() => import("@/components/IndiaMap"), { ssr: false });

export default function OverviewPage() {
    const { vehicles, vehicleHistory, anomalies, stats, resolveAnomaly, selectedVehicleId, setSelectedVehicleId, etaVehicles } = useFleet();
    const isLoading = vehicles.length === 0;

    /* ── ETA lookup map ── */
    const etaMap = new Map(etaVehicles.map(e => [e.vehicle_id, e]));

    /* ── Fleet average trend data ── */
    const [trendData, setTrendData] = useState<{ time: string; co2: number }[]>([]);
    useEffect(() => {
        if (!vehicles.length) return;
        const avgCo2 = vehicles.reduce((s, v) => s + (v.co2_kg ?? 0), 0) / vehicles.length;
        const ts = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setTrendData(prev => [...prev, { time: ts, co2: parseFloat(avgCo2.toFixed(3)) }].slice(-30));
    }, [vehicles]);

    /* ── Toast ── */
    const [toast, setToast] = useState<string | null>(null);
    const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

    /* ── Selected vehicle detail ── */
    const selectedVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId);
    const selectedHistory = selectedVehicleId ? (vehicleHistory.get(selectedVehicleId) ?? []).slice(-20) : [];

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                        Carbon Intelligence — India Freight Corridors
                    </h1>
                    <p style={{ color: "#4b5563", fontSize: "0.78rem", margin: "4px 0 0" }}>
                        Live · {stats.vehicleCount} vehicles · 3 routes · Updated 2s
                    </p>
                </div>
                {/* Demo spike button */}
                <button
                    onClick={async () => {
                        const targets = vehicles.filter(v => v.status !== "HIGH_EMISSION_ALERT");
                        const t = targets.length ? targets[Math.floor(Math.random() * targets.length)] : vehicles[0];
                        if (t) { await postSpike(t.vehicle_id); showToast(`⚠️ Spike sent to ${t.vehicle_id}`); }
                    }}
                    style={{
                        background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444",
                        borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: "0.78rem",
                        cursor: "pointer",
                    }}
                >
                    🔴 Trigger Spike Alert
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className="slide-in" style={{
                    position: "fixed", top: 64, right: 24, zIndex: 2000,
                    background: "#0d1421", border: "1px solid #1e293b",
                    borderRadius: 10, padding: "10px 20px",
                    color: "#f0f6fc", fontSize: "0.82rem",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}>
                    {toast}
                </div>
            )}

            {/* ═══ ROW 1: Map + KPIs ═══ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, height: "55vh", minHeight: 360 }}>
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #1e293b" }}>
                    <IndiaMap
                        vehicles={vehicles}
                        onVehicleClick={setSelectedVehicleId}
                        selectedVehicleId={selectedVehicleId}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <KpiCard label="Total CO₂ Emitted" value={stats.totalCo2.toFixed(1)} unit="kg" loading={isLoading} />
                    <KpiCard label="Fleet Avg Efficiency" value={stats.avgEfficiency.toFixed(2)} unit="km/L" loading={isLoading}
                        delta={stats.avgEfficiency > 3.5 ? "+12% above avg" : "-8% below avg"} />
                    <KpiCard label="CO₂ Saved Today" value={stats.totalSaved.toFixed(1)} unit="kg" highlight glow
                        loading={isLoading} invertColor
                        delta={stats.totalSaved > 0 ? `+${stats.totalSaved.toFixed(1)} saved` : "Accumulating…"} />
                    <KpiCard
                        label="On-Time Deliveries"
                        value={`${stats.onTimeCount}/${stats.vehicleCount}`}
                        unit="vehicles"
                        loading={isLoading}
                        highlight={stats.delayedCount === 0}
                        glow={stats.delayedCount === 0}
                        delta={stats.delayedCount > 0 ? `⚠ ${stats.delayedCount} delayed` : "All on schedule"}
                    />
                </div>
            </div>

            {/* ═══ ROW 2: Fleet Trend ═══ */}
            <FleetAvgChart data={trendData} />

            {/* ═══ ROW 3: Deep Dive ═══ */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", gap: 16, minHeight: 340 }}>

                {/* Active Vehicles Panel */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 12px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Active Vehicles
                    </h3>
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        {vehicles.map(v => {
                            const color = v.status === "HIGH_EMISSION_ALERT" ? "#ef4444" : v.status === "WARNING" ? "#f59e0b" : "#00ff87";
                            const active = selectedVehicleId === v.vehicle_id;
                            return (
                                <button
                                    key={v.vehicle_id}
                                    onClick={() => setSelectedVehicleId(v.vehicle_id)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        padding: "8px 10px", borderRadius: 8,
                                        background: active ? "#00ff8710" : "transparent",
                                        border: "none",
                                        borderLeft: active ? "3px solid #00ff87" : "3px solid transparent",
                                        cursor: "pointer", textAlign: "left",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    <div style={{
                                        width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0,
                                        animation: v.status === "HIGH_EMISSION_ALERT" ? "pulse-red 1.5s ease-out infinite" : "none"
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ color: "#f0f6fc", fontSize: "0.78rem", fontWeight: 600 }}>{v.vehicle_id}</span>
                                            {(() => {
                                                const eta = v.eta_status || etaMap.get(v.vehicle_id)?.eta_status;
                                                if (!eta || eta === "UNKNOWN") return null;
                                                const etaColor = eta === "ON_TIME" ? "#00ff87" : eta === "AT_RISK" ? "#f59e0b" : "#ef4444";
                                                const etaBg = eta === "ON_TIME" ? "#00ff8715" : eta === "AT_RISK" ? "#f59e0b15" : "#ef444415";
                                                return (
                                                    <span style={{
                                                        background: etaBg, color: etaColor,
                                                        padding: "1px 6px", borderRadius: 10,
                                                        fontSize: "0.55rem", fontWeight: 700,
                                                        lineHeight: "1.4",
                                                    }}>
                                                        {eta.replace(/_/g, " ")}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div style={{ color: "#4b5563", fontSize: "0.65rem" }}>
                                            {v.route_id.replace(/_/g, " → ")}
                                            {(() => {
                                                const etaEntry = etaMap.get(v.vehicle_id);
                                                if (etaEntry && etaEntry.eta_hours < 99) {
                                                    return ` · ETA: ${etaEntry.eta_hours}h`;
                                                }
                                                return "";
                                            })()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Vehicle Detail Panel */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {selectedVehicle ? (
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ color: "#f0f6fc", margin: 0, fontSize: "1rem", fontWeight: 700 }}>{selectedVehicle.vehicle_id}</h3>
                                    <p style={{ color: "#8b949e", fontSize: "0.75rem", margin: "2px 0 0" }}>
                                        Driver: {driverName(selectedVehicle.vehicle_id)} · {selectedVehicle.route_id.replace(/_/g, " → ")}
                                    </p>
                                </div>
                                <span style={{
                                    marginLeft: "auto",
                                    background: selectedVehicle.status === "HIGH_EMISSION_ALERT" ? "#ef444422" : selectedVehicle.status === "WARNING" ? "#f59e0b22" : "#00ff8715",
                                    color: selectedVehicle.status === "HIGH_EMISSION_ALERT" ? "#ef4444" : selectedVehicle.status === "WARNING" ? "#f59e0b" : "#00ff87",
                                    padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600,
                                }}>
                                    {selectedVehicle.status.replace(/_/g, " ")}
                                </span>
                            </div>

                            {/* KPI strip */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                                <div style={{ background: "#111827", borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ color: "#4b5563", fontSize: "0.62rem", textTransform: "uppercase" }}>CO₂</div>
                                    <div style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 700 }}>{selectedVehicle.co2_kg?.toFixed(2)}<span style={{ color: "#4b5563", fontSize: "0.7rem" }}> kg</span></div>
                                </div>
                                <div style={{ background: "#111827", borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ color: "#4b5563", fontSize: "0.62rem", textTransform: "uppercase" }}>FUEL</div>
                                    <div style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 700 }}>{selectedVehicle.fuel_consumed_liters?.toFixed(2)}<span style={{ color: "#4b5563", fontSize: "0.7rem" }}> L</span></div>
                                </div>
                                <div style={{ background: "#111827", borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ color: "#4b5563", fontSize: "0.62rem", textTransform: "uppercase" }}>SPEED</div>
                                    <div style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 700 }}>{selectedVehicle.speed_kmph?.toFixed(0)}<span style={{ color: "#4b5563", fontSize: "0.7rem" }}> km/h</span></div>
                                </div>
                            </div>

                            {/* Health indicators */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {[
                                    { label: "Engine", ok: selectedVehicle.co2_kg < 10, good: "Normal", bad: "Warning" },
                                    { label: "Tyres", ok: selectedVehicle.speed_kmph < 90, good: "Optimal", bad: "Check" },
                                    { label: "Fuel", ok: selectedVehicle.fuel_consumed_liters < 4, good: "Good", bad: "High Use" },
                                ].map(h => (
                                    <span key={h.label} style={{
                                        background: h.ok ? "#00ff8710" : "#ef444415",
                                        color: h.ok ? "#00ff87" : "#ef4444",
                                        border: `1px solid ${h.ok ? "#00ff8733" : "#ef444433"}`,
                                        padding: "3px 10px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 600,
                                    }}>
                                        {h.label}: {h.ok ? h.good : h.bad}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span style={{ fontSize: "2rem" }}>🚛</span>
                            <span style={{ color: "#4b5563", fontSize: "0.82rem" }}>Click a vehicle to see details</span>
                        </div>
                    )}
                </div>

                {/* Resolution Center */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 12px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Resolution Center
                    </h3>
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {anomalies.length === 0 ? (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <span style={{ fontSize: "1.5rem" }}>✅</span>
                                <span style={{ color: "#4b5563", fontSize: "0.78rem" }}>All Systems Nominal</span>
                            </div>
                        ) : (
                            anomalies.slice(0, 8).map(a => {
                                const isHigh = a.type === "HIGH_EMISSION_ALERT";
                                return (
                                    <div key={a.id} className="slide-in" style={{
                                        background: isHigh ? "#ef444408" : "#f59e0b08",
                                        borderLeft: `3px solid ${isHigh ? "#ef4444" : "#f59e0b"}`,
                                        borderRadius: "0 8px 8px 0",
                                        padding: "10px 12px",
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ color: isHigh ? "#ef4444" : "#f59e0b", fontSize: "0.65rem", fontWeight: 700 }}>
                                                {a.type.replace(/_/g, " ")}
                                            </span>
                                            <span style={{ color: "#4b5563", fontSize: "0.62rem" }}>
                                                {new Date(a.timestamp * 1000).toLocaleTimeString("en-IN")}
                                            </span>
                                        </div>
                                        <div style={{ color: "#f0f6fc", fontSize: "0.72rem", marginBottom: 8 }}>
                                            <strong>{a.vehicle_id}</strong>: {a.detail}
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                onClick={() => { resolveAnomaly(a.id); showToast("📍 Route recalculated"); }}
                                                style={{ background: "#00ff8715", border: "1px solid #00ff8733", color: "#00ff87", borderRadius: 6, padding: "3px 8px", fontSize: "0.62rem", fontWeight: 600, cursor: "pointer" }}
                                            >
                                                Recalculate
                                            </button>
                                            <button
                                                onClick={() => showToast(`📱 Driver ${driverName(a.vehicle_id)} notified`)}
                                                style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b", borderRadius: 6, padding: "3px 8px", fontSize: "0.62rem", fontWeight: 600, cursor: "pointer" }}
                                            >
                                                Notify Driver
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* ETA Delay Alerts */}
                        {vehicles.filter(v => (v.eta_status || etaMap.get(v.vehicle_id)?.eta_status) === "DELAYED").map(v => {
                            const etaEntry = etaMap.get(v.vehicle_id);
                            return (
                                <div key={`eta-${v.vehicle_id}`} className="slide-in" style={{
                                    background: "#ef444408",
                                    borderLeft: "3px solid #ef4444",
                                    borderRadius: "0 8px 8px 0",
                                    padding: "10px 12px",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ color: "#ef4444", fontSize: "0.65rem", fontWeight: 700 }}>ETA DELAY</span>
                                    </div>
                                    <div style={{ color: "#f0f6fc", fontSize: "0.72rem", marginBottom: 6 }}>
                                        <strong>{v.vehicle_id}</strong> — behind schedule{etaEntry?.customer ? ` to ${etaEntry.customer}` : ""}
                                        {etaEntry?.eta_hours ? ` (ETA: ${etaEntry.eta_hours}h)` : ""}
                                    </div>
                                    <button
                                        onClick={() => showToast(`📱 Driver ${driverName(v.vehicle_id)} notified about delay`)}
                                        style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b", borderRadius: 6, padding: "3px 8px", fontSize: "0.62rem", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Notify Driver
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    {anomalies.length > 0 && (
                        <a href="/alerts" style={{ color: "#00ff87", fontSize: "0.72rem", textAlign: "center", marginTop: 8, textDecoration: "none" }}>
                            View Full Alert Details →
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
