"use client";

import { useState, useMemo } from "react";
import { useFleet } from "@/lib/FleetContext";

export default function ShipmentsPage() {
    const { vehicles } = useFleet();
    const [filter, setFilter] = useState("All");
    const [selectedShipment, setSelectedShipment] = useState<string | null>(null);

    const shipments = useMemo(() => {
        let list = vehicles.filter(v => v.shipment_id);
        if (filter === "Delayed") list = list.filter(v => v.eta_status === "DELAYED");
        if (filter === "Cold Chain") list = list.filter(v => v.temperature_c !== undefined);
        if (filter === "At Risk") list = list.filter(v => v.temperature_breach || (v.overload_pct && v.overload_pct > 0));
        return list;
    }, [vehicles, filter]);

    const activeShipment = vehicles.find(v => v.vehicle_id === selectedShipment);

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header & Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Active Shipments</h1>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {["All", "Delayed", "Cold Chain", "At Risk"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{
                                background: filter === f ? "#3b82f620" : "#0F172A",
                                border: `1px solid ${filter === f ? "#3b82f6" : "#1e293b"}`,
                                color: filter === f ? "#3b82f6" : "#8b949e",
                                borderRadius: 8, padding: "6px 14px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
                            }}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#0F172A", textAlign: "left" }}>
                            <th style={{ padding: "12px 16px", color: "#8b949e", fontSize: "0.75rem", fontWeight: 600 }}>Shipment ID</th>
                            <th style={{ padding: "12px 16px", color: "#8b949e", fontSize: "0.75rem", fontWeight: 600 }}>Origin → Dest</th>
                            <th style={{ padding: "12px 16px", color: "#8b949e", fontSize: "0.75rem", fontWeight: 600 }}>Cargo</th>
                            <th style={{ padding: "12px 16px", color: "#8b949e", fontSize: "0.75rem", fontWeight: 600 }}>Status</th>
                            <th style={{ padding: "12px 16px", color: "#8b949e", fontSize: "0.75rem", fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.map(s => {
                            const isDelayed = s.eta_status === "DELAYED";
                            const isAtRisk = s.temperature_breach || (s.overload_pct && s.overload_pct > 0);
                            return (
                                <tr key={s.vehicle_id} style={{ borderBottom: "1px solid #1e293b", transition: "background 0.2s" }} className="hover-row">
                                    <td style={{ padding: "14px 16px", color: "#f0f6fc", fontWeight: 600, fontSize: "0.85rem" }}>
                                        {s.shipment_id}
                                        <div style={{ color: "#4b5563", fontSize: "0.68rem", fontWeight: 400 }}>{s.vehicle_id}</div>
                                    </td>
                                    <td style={{ padding: "14px 16px", fontSize: "0.8rem" }}>
                                        <div style={{ color: "#f0f6fc" }}>{s.origin || "Unknown Origin"}</div>
                                        <div style={{ color: "#8b949e" }}>↓ {s.destination || "Unknown Destination"}</div>
                                    </td>
                                    <td style={{ padding: "14px 16px" }}>
                                        <div style={{ color: "#f0f6fc", fontSize: "0.8rem" }}>{s.cargo_type}</div>
                                        {s.temperature_c !== undefined && <div style={{ color: "#00d4ff", fontSize: "0.7rem", fontWeight: 600 }}>Cold Chain ({s.temperature_c}°C)</div>}
                                    </td>
                                    <td style={{ padding: "14px 16px" }}>
                                        <div style={{
                                            background: isAtRisk ? "#ef444415" : isDelayed ? "#f59e0b15" : "rgba(16, 185, 129, 0.15)",
                                            color: isAtRisk ? "#ef4444" : isDelayed ? "#f59e0b" : "#00ff87",
                                            padding: "4px 8px", borderRadius: 4, display: "inline-block", fontSize: "0.7rem", fontWeight: 700
                                        }}>
                                            {isAtRisk ? "AT RISK" : isDelayed ? "DELAYED" : "ON TRACK"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 16px" }}>
                                        <button onClick={() => setSelectedShipment(s.vehicle_id)}
                                            style={{ background: "#0F172A", border: "1px solid #1e293b", color: "#3b82f6", borderRadius: 8, padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                                            Track
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {shipments.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>
                                    No shipments match this filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Tracking Modal */}
            {activeShipment && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
                    <div className="slide-in" style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 16, padding: 32, width: 480, maxWidth: "90%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <div>
                                <h2 style={{ color: "#f0f6fc", margin: "0 0 4px", fontSize: "1.2rem" }}>Shipment {activeShipment.shipment_id}</h2>
                                <div style={{ color: "#8b949e", fontSize: "0.8rem" }}>Vehicle: {activeShipment.vehicle_id}</div>
                            </div>
                            <button onClick={() => setSelectedShipment(null)} style={{ background: "transparent", border: "none", color: "#8b949e", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
                        </div>

                        {/* Timeline */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                            <div style={{ position: "absolute", left: 11, top: 10, bottom: 10, width: 2, background: "#1e293b", zIndex: 0 }} />

                            <div style={{ display: "flex", gap: 16, padding: "12px 0", position: "relative", zIndex: 1 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#00ff87", border: "4px solid #1a2332", flexShrink: 0 }} />
                                <div>
                                    <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "0.9rem" }}>Dispatched</div>
                                    <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>{activeShipment.origin}</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 16, padding: "12px 0", position: "relative", zIndex: 1 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6", border: "4px solid #1a2332", flexShrink: 0 }} />
                                <div>
                                    <div style={{ color: "#f0f6fc", fontWeight: 600, fontSize: "0.9rem" }}>In Transit</div>
                                    <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>Current ETA: {activeShipment.eta_hours?.toFixed(1)} hrs</div>
                                    {activeShipment.eta_status === "DELAYED" && <span style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 600 }}>Delayed by unexpected traffic</span>}
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 16, padding: "12px 0", position: "relative", zIndex: 1 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e293b", border: "4px solid #1a2332", flexShrink: 0 }} />
                                <div>
                                    <div style={{ color: "#4b5563", fontWeight: 600, fontSize: "0.9rem" }}>Delivery Expected</div>
                                    <div style={{ color: "#4b5563", fontSize: "0.75rem" }}>{activeShipment.destination}</div>
                                </div>
                            </div>
                        </div>

                        {activeShipment.temperature_c !== undefined && (
                            <div style={{ marginTop: 24, padding: 16, background: "#0F172A", borderRadius: 8, borderLeft: "3px solid #00d4ff" }}>
                                <div style={{ color: "#8b949e", fontSize: "0.75rem", marginBottom: 4 }}>Last Temp Reading:</div>
                                <div style={{ color: activeShipment.temperature_breach ? "#ef4444" : "#00d4ff", fontSize: "1.2rem", fontWeight: 700 }}>{activeShipment.temperature_c}°C</div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
