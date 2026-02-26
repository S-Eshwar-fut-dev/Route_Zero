"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useFleet, driverName } from "@/lib/FleetContext";
import type { AnomalyEntry } from "@/lib/types";

export default function AlertsPage() {
    const { anomalies, resolvedAnomalies, resolveAnomaly } = useFleet();
    const [tab, setTab] = useState<"active" | "resolved" | "all">("active");
    const [sevFilter, setSevFilter] = useState("All");
    const [toast, setToast] = useState<string | null>(null);
    const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

    const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

    const items: AnomalyEntry[] = tab === "active" ? anomalies
        : tab === "resolved" ? resolvedAnomalies
            : [...anomalies, ...resolvedAnomalies];

    const filtered = sevFilter === "All" ? items
        : items.filter(a => a.severity === sevFilter.toUpperCase());

    const toggleSelection = (id: string) => {
        setSelectedAlerts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkAcknowledge = () => {
        selectedAlerts.forEach(id => resolveAnomaly(id));
        showToast(`✅ ${selectedAlerts.length} alerts acknowledged`);
        setSelectedAlerts([]);
    };

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
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

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Alert Center</h1>
                {anomalies.length > 0 && (
                    <span style={{ background: "#ef4444", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
                        {anomalies.length} active
                    </span>
                )}
            </div>

            {/* Tabs + Filters */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {(["active", "resolved", "all"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            padding: "6px 16px", borderRadius: 8,
                            background: tab === t ? "#00ff8715" : "#111827",
                            border: `1px solid ${tab === t ? "#00ff8733" : "#1e293b"}`,
                            color: tab === t ? "#00ff87" : "#8b949e",
                            fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                            textTransform: "capitalize",
                        }}>
                        {t}
                    </button>
                ))}
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
                    style={{ marginLeft: "auto", background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.78rem", outline: "none" }}>
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical Only</option>
                    <option value="Warning">Warning Only</option>
                    <option value="Info">Info Only</option>
                </select>
            </div>

            {/* Bulk Actions Bar */}
            {selectedAlerts.length > 0 && (
                <div className="slide-in" style={{
                    background: "#0d1421", border: "1px solid #3b82f6", borderRadius: 10,
                    padding: "10px 20px", display: "flex", alignItems: "center", gap: 16,
                    position: "sticky", top: 16, zIndex: 100
                }}>
                    <span style={{ color: "#f0f6fc", fontSize: "0.85rem", fontWeight: 600 }}>{selectedAlerts.length} Selected</span>
                    <button onClick={handleBulkAcknowledge}
                        style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>
                        Acknowledge All
                    </button>
                    <button onClick={() => { showToast(`📱 Driver broadcast sent to ${selectedAlerts.length} vehicles`); setSelectedAlerts([]); }}
                        style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b33", borderRadius: 8, padding: "6px 16px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                        Broadcast Warning
                    </button>
                    <button onClick={() => setSelectedAlerts([])}
                        style={{ background: "transparent", color: "#8b949e", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "0 8px" }}>
                        ×
                    </button>
                </div>
            )}

            {/* Alert Cards */}
            {filtered.length === 0 ? (
                <div style={{
                    background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14,
                    padding: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                }}>
                    <span style={{ fontSize: "2.5rem" }}>✅</span>
                    <span style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 600 }}>All Clear — Fleet operating within SLA</span>
                    <span style={{ color: "#4b5563", fontSize: "0.82rem" }}>No {tab === "active" ? "active" : ""} anomalies detected</span>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map(a => {
                        const isCritical = a.severity === "CRITICAL";
                        const isWarning = a.severity === "WARNING";
                        const isResolved = resolvedAnomalies.some(r => r.id === a.id);

                        let borderColor = isResolved ? "#00ff87" : isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6";
                        if (a.type === "TEMPERATURE_BREACH" && !isResolved) borderColor = "#00d4ff";

                        return (
                            <div key={a.id} className="slide-in" style={{
                                background: "#0d1421",
                                border: "1px solid #1e293b",
                                borderLeft: `4px solid ${borderColor}`,
                                borderRadius: "0 14px 14px 0",
                                padding: "20px 24px",
                                display: "flex",
                                gap: 16
                            }}>
                                {!isResolved && (
                                    <div style={{ paddingTop: 2 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedAlerts.includes(a.id)}
                                            onChange={() => toggleSelection(a.id)}
                                            style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#3b82f6" }}
                                        />
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    {/* Header row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                        <span style={{ fontSize: "1rem" }}>{a.type === "TEMPERATURE_BREACH" ? "❄️" : isCritical ? "🔴" : isWarning ? "🟡" : "ℹ️"}</span>
                                        <span style={{ color: borderColor, fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" }}>
                                            {a.type.replace(/_/g, " ")}
                                        </span>
                                        {isResolved && (
                                            <span style={{ background: "#00ff8715", color: "#00ff87", padding: "2px 8px", borderRadius: 20, fontSize: "0.62rem", fontWeight: 600 }}>
                                                Resolved
                                            </span>
                                        )}
                                        <span style={{ marginLeft: "auto", color: "#4b5563", fontSize: "0.72rem" }}>
                                            {new Date(a.timestamp * 1000).toLocaleString("en-IN")}
                                        </span>
                                    </div>

                                    {/* Vehicle info */}
                                    <div style={{ color: "#f0f6fc", fontSize: "0.85rem", marginBottom: 12 }}>
                                        <strong>{a.vehicle_id}</strong> — Driver: {driverName(a.vehicle_id)}
                                    </div>

                                    {/* Detail */}
                                    <div style={{ background: "#111827", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: "0.78rem", color: "#8b949e" }}>
                                        {a.detail}
                                    </div>

                                    {/* Action Required */}
                                    <div style={{ color: "#4b5563", fontSize: "0.72rem", marginBottom: 16 }}>
                                        <strong style={{ color: "#8b949e" }}>Recommended Action:</strong>{" "}
                                        {a.action_required}
                                    </div>

                                    {/* Action buttons */}
                                    {!isResolved && (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            {a.type === "ETA_CRITICAL_DELAY" && (
                                                <button onClick={() => { resolveAnomaly(a.id); showToast(`📧 Consignee Notified of Delay`); }}
                                                    style={{ background: "#ef444415", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                                    Notify Consignee
                                                </button>
                                            )}
                                            {a.type === "OVERLOAD_VIOLATION" && (
                                                <button onClick={() => { resolveAnomaly(a.id); showToast(`🛑 Offload Order Issued`); }}
                                                    style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                                    Issue Offload Order
                                                </button>
                                            )}
                                            {a.type === "TEMPERATURE_BREACH" && (
                                                <button onClick={() => { resolveAnomaly(a.id); showToast(`🔧 Maintenance Dispatched to Intercept`); }}
                                                    style={{ background: "#00d4ff15", border: "1px solid #00d4ff33", color: "#00d4ff", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                                    Dispatch Maintenance
                                                </button>
                                            )}
                                            <button onClick={() => showToast(`📱 Driver ${driverName(a.vehicle_id)} pinged`)}
                                                style={{ background: "#3b82f615", border: "1px solid #3b82f633", color: "#3b82f6", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                                Contact Driver
                                            </button>
                                            <button onClick={() => { resolveAnomaly(a.id); showToast("✅ Acknowledged"); }}
                                                style={{ background: "#111827", border: "1px solid #1e293b", color: "#8b949e", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                                Mark Resolved
                                            </button>
                                            <Link href={`/fleet/${a.vehicle_id}`}
                                                style={{ background: "#111827", border: "1px solid #1e293b", color: "#8b949e", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, textDecoration: "none" }}>
                                                View Vehicle
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
