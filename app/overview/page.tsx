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

    const [driverDrawer, setDriverDrawer] = useState(false);

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
                        const t = vehicles.find(v => v.status === "NORMAL") || vehicles[0];
                        if (t) { await postSpike(t.vehicle_id); showToast(`⚠️ Synthetic Anomaly injected into ${t.vehicle_id}`); }
                    }}
                    style={{
                        background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b",
                        borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: "0.78rem",
                        cursor: "pointer",
                    }}
                >
                    ⚡ Inject Risk Spike
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
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #1e293b", position: "relative" }}>
                    <IndiaMap
                        vehicles={vehicles}
                        onVehicleClick={setSelectedVehicleId}
                        selectedVehicleId={selectedVehicleId}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <KpiCard
                        label="On-Time Deliveries"
                        value={`${stats.onTimeCount}/${stats.vehicleCount}`}
                        unit="vehicles"
                        loading={isLoading}
                        highlight={stats.delayedCount === 0}
                        glow={stats.delayedCount === 0}
                        delta={stats.delayedCount > 0 ? `⚠ ${stats.delayedCount} delayed` : "All on schedule"}
                    />
                    <KpiCard label="Active Anomalies" value={anomalies.length.toString()} unit="critical" loading={isLoading}
                        highlight={anomalies.length > 0}
                        delta={anomalies.length > 0 ? "Requires action" : "All clear"}
                        invertColor={anomalies.length > 0} />
                    <KpiCard label="Shipments At Risk" value={stats.alertCount.toString()} unit="loads" loading={isLoading}
                        delta={`${stats.alertCount} conditions out of SLA`} />
                    <KpiCard label="CO₂ Saved (Secondary)" value={stats.totalSaved.toFixed(1)} unit="kg"
                        loading={isLoading}
                        delta={`+${stats.totalSaved.toFixed(1)} vs baseline`} />
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

                {/* Shipment Health / Anomalies Panel */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 12px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Shipment Health
                    </h3>
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {anomalies.length === 0 ? (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <span style={{ fontSize: "1.5rem" }}>✅</span>
                                <span style={{ color: "#4b5563", fontSize: "0.78rem" }}>All Cargo Conditions Nominal</span>
                            </div>
                        ) : (
                            anomalies.slice(0, 8).map(a => {
                                const isCritical = a.severity === "CRITICAL";
                                const isWarning = a.severity === "WARNING";
                                const isBlue = a.type === "TEMPERATURE_BREACH";

                                const baseColor = isBlue ? "#00d4ff" : isCritical ? "#ef4444" : "#f59e0b";
                                const bgColor = `${baseColor}08`;

                                return (
                                    <div key={a.id} className="slide-in" style={{
                                        background: bgColor,
                                        borderLeft: `3px solid ${baseColor}`,
                                        borderRadius: "0 8px 8px 0",
                                        padding: "10px 12px",
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ color: baseColor, fontSize: "0.65rem", fontWeight: 700 }}>
                                                {a.type.replace(/_/g, " ")}
                                            </span>
                                            <span style={{ color: "#4b5563", fontSize: "0.62rem" }}>
                                                {new Date(a.timestamp * 1000).toLocaleTimeString("en-IN")}
                                            </span>
                                        </div>
                                        <div style={{ color: "#f0f6fc", fontSize: "0.72rem", marginBottom: 6 }}>
                                            <strong>{a.vehicle_id}</strong>: {a.detail}
                                        </div>
                                        <div style={{ color: "#8b949e", fontSize: "0.65rem", fontStyle: "italic", marginBottom: 8 }}>
                                            Next Best Action: {a.action_required}
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                onClick={() => { resolveAnomaly(a.id); showToast("📍 Acknowledged event"); }}
                                                style={{ background: "#00ff8715", border: "1px solid #00ff8733", color: "#00ff87", borderRadius: 6, padding: "3px 8px", fontSize: "0.62rem", fontWeight: 600, cursor: "pointer" }}
                                            >
                                                Acknowledge
                                            </button>
                                            <button
                                                onClick={() => { setSelectedVehicleId(a.vehicle_id); setDriverDrawer(true); }}
                                                style={{ background: `${baseColor}15`, border: `1px solid ${baseColor}33`, color: baseColor, borderRadius: 6, padding: "3px 8px", fontSize: "0.62rem", fontWeight: 600, cursor: "pointer" }}
                                            >
                                                Contact Driver
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

            {/* Sliding Drawer: Driver Notification */}
            {driverDrawer && selectedVehicle && (
                <div style={{
                    position: "fixed", bottom: 0, left: 64, right: 0, height: 280,
                    background: "#0a0f1a", borderTop: "1px solid #1e293b",
                    zIndex: 1000, boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
                    display: "flex", flexDirection: "column", animation: "slide-up 0.3s ease-out"
                }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h3 style={{ color: "#f0f6fc", margin: 0, fontSize: "1.1rem" }}>Driver Action Required</h3>
                            <p style={{ color: "#8b949e", margin: "4px 0 0", fontSize: "0.8rem" }}>
                                {driverName(selectedVehicle.vehicle_id)} — {selectedVehicle.vehicle_id}
                            </p>
                        </div>
                        <button onClick={() => setDriverDrawer(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
                    </div>
                    <div style={{ padding: 24, display: "flex", gap: 24, flex: 1 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Notification Context</label>
                            <textarea
                                defaultValue={`URGENT: ${selectedVehicle.vehicle_id}\n\nPlease check your load immediately. Telemetry indicates a potential issue affecting cargo health or compliance. Acknowledge this message once inspected.`}
                                style={{
                                    width: "100%", height: "120px", background: "#111827", border: "1px solid #1e293b",
                                    borderRadius: 8, color: "#f0f6fc", padding: 12, fontSize: "0.85rem", resize: "none"
                                }}
                            />
                        </div>
                        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
                            <button
                                onClick={() => { showToast("📲 SMS Dispatched to Driver"); setDriverDrawer(false); }}
                                style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "12px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                            >
                                Dispatch via SMS
                            </button>
                            <button
                                onClick={() => { showToast("🟢 WhatsApp Message Sent"); setDriverDrawer(false); }}
                                style={{ background: "#10b981", color: "#fff", border: "none", padding: "12px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                            >
                                Dispatch via WhatsApp
                            </button>
                            <button
                                onClick={() => { showToast("📞 Calling Driver..."); setDriverDrawer(false); }}
                                style={{ background: "transparent", color: "#f0f6fc", border: "1px solid #374151", padding: "12px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                            >
                                Initiate Voice Call
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
