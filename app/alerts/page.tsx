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

    const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

    const items: AnomalyEntry[] = tab === "active" ? anomalies
        : tab === "resolved" ? resolvedAnomalies
            : [...anomalies, ...resolvedAnomalies];

    const filtered = sevFilter === "All" ? items
        : items.filter(a => (sevFilter === "Critical" && a.type === "HIGH_EMISSION_ALERT") ||
            (sevFilter === "Warning" && a.type === "ROUTE_DEVIATION_ALERT"));

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
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical Only</option>
                    <option value="Warning">Warning Only</option>
                </select>
            </div>

            {/* Alert Cards */}
            {filtered.length === 0 ? (
                <div style={{
                    background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14,
                    padding: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                }}>
                    <span style={{ fontSize: "2.5rem" }}>✅</span>
                    <span style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 600 }}>All Clear — Fleet operating normally</span>
                    <span style={{ color: "#4b5563", fontSize: "0.82rem" }}>No {tab === "active" ? "active" : ""} anomalies detected</span>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map(a => {
                        const isHigh = a.type === "HIGH_EMISSION_ALERT";
                        const isResolved = resolvedAnomalies.some(r => r.id === a.id);
                        const borderColor = isResolved ? "#00ff87" : isHigh ? "#ef4444" : "#f59e0b";
                        return (
                            <div key={a.id} className="slide-in" style={{
                                background: "#0d1421",
                                border: "1px solid #1e293b",
                                borderLeft: `4px solid ${borderColor}`,
                                borderRadius: "0 14px 14px 0",
                                padding: "20px 24px",
                            }}>
                                {/* Header row */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontSize: "1rem" }}>{isHigh ? "🔴" : "🟡"}</span>
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

                                {/* Possible causes */}
                                <div style={{ color: "#4b5563", fontSize: "0.72rem", marginBottom: 16 }}>
                                    <strong style={{ color: "#8b949e" }}>Possible causes:</strong>{" "}
                                    {isHigh ? "Injector fault · Excessive idling · Overloading" : "GPS drift · Unplanned detour · Road construction"}
                                </div>

                                {/* Action buttons */}
                                {!isResolved && (
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => showToast(`📱 Driver ${driverName(a.vehicle_id)} notified`)}
                                            style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                            Notify Driver
                                        </button>
                                        <button onClick={() => { resolveAnomaly(a.id); showToast("📍 Route recalculated"); }}
                                            style={{ background: "#00ff8715", border: "1px solid #00ff8733", color: "#00ff87", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                            Recalculate Route
                                        </button>
                                        <button onClick={() => { resolveAnomaly(a.id); showToast("✅ Marked as resolved"); }}
                                            style={{ background: "#111827", border: "1px solid #1e293b", color: "#8b949e", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                                            Mark Resolved
                                        </button>
                                        <Link href={`/fleet/${a.vehicle_id}`}
                                            style={{ background: "#111827", border: "1px solid #1e293b", color: "#3b82f6", borderRadius: 8, padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, textDecoration: "none" }}>
                                            View Vehicle
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
