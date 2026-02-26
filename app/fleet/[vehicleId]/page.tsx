"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useFleet, driverName } from "@/lib/FleetContext";
import KpiCard from "@/components/KpiCard";
import VehicleEmissionsChart from "@/components/VehicleEmissionsChart";
import { postQuery } from "@/lib/api";

const IndiaMap = dynamic(() => import("@/components/IndiaMap"), { ssr: false });

export default function VehicleDetailPage() {
    const params = useParams();
    const vehicleId = params.vehicleId as string;
    const { vehicles, vehicleHistory } = useFleet();

    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
    const history = vehicleHistory.get(vehicleId) ?? [];

    const [insight, setInsight] = useState<string | null>(null);
    const [insightLoading, setInsightLoading] = useState(false);

    async function fetchInsight() {
        setInsightLoading(true);
        try {
            const r = await postQuery(`Give a brief analysis of vehicle ${vehicleId} current emissions, efficiency and status`);
            setInsight(r.answer);
        } catch {
            setInsight(`**${vehicleId}** is currently operating on the ${vehicle?.route_id?.replace(/_/g, "–")} corridor. CO₂ output is ${vehicle?.co2_kg?.toFixed(2)} kg with fuel consumption at ${vehicle?.fuel_consumed_liters?.toFixed(2)} L.`);
        } finally {
            setInsightLoading(false);
        }
    }

    useEffect(() => { fetchInsight(); }, [vehicleId]);

    const sc = vehicle?.status === "HIGH_EMISSION_ALERT" ? "#ef4444" : vehicle?.status === "WARNING" ? "#f59e0b" : "#00ff87";
    const efficiency = vehicle && vehicle.fuel_consumed_liters > 0
        ? ((vehicle.speed_kmph * (2 / 60)) / vehicle.fuel_consumed_liters).toFixed(2) : "—";

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Back + Header */}
            <div>
                <Link href="/fleet" style={{ color: "#8b949e", textDecoration: "none", fontSize: "0.78rem" }}>← Fleet List</Link>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{vehicleId}</h1>
                    {vehicle && (
                        <>
                            <span style={{
                                background: `${sc}15`, color: sc, padding: "3px 10px",
                                borderRadius: 20, fontSize: "0.68rem", fontWeight: 600,
                            }}>
                                {vehicle.status.replace(/_/g, " ")}
                            </span>
                            <span style={{
                                background: "#111827", color: "#8b949e", padding: "3px 10px",
                                borderRadius: 20, fontSize: "0.68rem",
                            }}>
                                {vehicle.route_id.replace(/_/g, " → ")}
                            </span>
                        </>
                    )}
                </div>
                {vehicle && (
                    <p style={{ color: "#4b5563", fontSize: "0.78rem", margin: "4px 0 0" }}>
                        Driver: {driverName(vehicleId)}
                    </p>
                )}
            </div>

            {/* KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <KpiCard label="Current CO₂ Rate" value={vehicle?.co2_kg?.toFixed(2) ?? "—"} unit="kg" loading={!vehicle} />
                <KpiCard label="Fuel Consumed" value={vehicle?.fuel_consumed_liters?.toFixed(2) ?? "—"} unit="L" loading={!vehicle} />
                <KpiCard label="CO₂ Saved" value={vehicle?.co2_saved_kg?.toFixed(2) ?? "—"} unit="kg" highlight invertColor loading={!vehicle}
                    delta={vehicle && vehicle.co2_saved_kg > 0 ? `+${vehicle.co2_saved_kg.toFixed(2)} saved` : undefined} />
                <KpiCard label="Efficiency" value={efficiency} unit="km/L" loading={!vehicle} />
            </div>

            {/* Emissions chart */}
            <VehicleEmissionsChart history={history} />

            {/* Bottom row: Health + Mini Map */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16 }}>
                {/* Vehicle Health */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20 }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Vehicle Health
                    </h3>
                    {vehicle ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Health pills */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {[
                                    { label: "Engine Temp", ok: vehicle.co2_kg < 10, good: "Normal", bad: "Warning" },
                                    { label: "Tyre Pressure", ok: vehicle.speed_kmph < 90, good: "Optimal", bad: "Low" },
                                ].map(h => (
                                    <span key={h.label} style={{
                                        background: h.ok ? "#00ff8710" : "#ef444415",
                                        color: h.ok ? "#00ff87" : "#ef4444",
                                        border: `1px solid ${h.ok ? "#00ff8733" : "#ef444433"}`,
                                        padding: "5px 14px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
                                    }}>
                                        {h.label}: {h.ok ? h.good : h.bad}
                                    </span>
                                ))}
                            </div>

                            {/* Fuel bar */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ color: "#8b949e", fontSize: "0.72rem" }}>Fuel Level</span>
                                    <span style={{ color: "#f0f6fc", fontSize: "0.72rem", fontWeight: 600 }}>
                                        {Math.round(Math.min(100, (vehicle.fuel_consumed_liters / 5) * 100))}%
                                    </span>
                                </div>
                                <div style={{ height: 8, background: "#111827", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", borderRadius: 4,
                                        width: `${Math.min(100, (vehicle.fuel_consumed_liters / 5) * 100)}%`,
                                        background: vehicle.fuel_consumed_liters > 4 ? "#ef4444" : vehicle.fuel_consumed_liters > 2.5 ? "#f59e0b" : "#00ff87",
                                        transition: "width 0.3s ease",
                                    }} />
                                </div>
                            </div>

                            {/* Maintenance info */}
                            <div style={{ background: "#111827", borderRadius: 10, padding: 14 }}>
                                <div style={{ color: "#8b949e", fontSize: "0.68rem", textTransform: "uppercase", marginBottom: 8 }}>Maintenance Notes</div>
                                <div style={{ color: "#f0f6fc", fontSize: "0.78rem" }}>Last service: Jan 15, 2026</div>
                                <div style={{ color: "#4b5563", fontSize: "0.72rem", marginTop: 4 }}>Next scheduled: Feb 28, 2026</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: "#4b5563", fontSize: "0.82rem" }}>Loading health data…</div>
                    )}
                </div>

                {/* Mini Map */}
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #1e293b" }}>
                    {vehicle ? (
                        <IndiaMap
                            vehicles={[vehicle]}
                            singleRoute={vehicle.route_id}
                            singleVehicle
                            height="100%"
                        />
                    ) : (
                        <div style={{ height: "100%", background: "#0d1421", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#4b5563" }}>Loading map…</span>
                        </div>
                    )}
                </div>
            </div>

            {/* GreenAI Insights */}
            <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ color: "#f0f6fc", margin: 0, fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        💡 GreenAI Analysis
                    </h3>
                    <button onClick={fetchInsight} disabled={insightLoading}
                        style={{ marginLeft: "auto", background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "4px 12px", color: "#8b949e", fontSize: "0.72rem", cursor: "pointer" }}>
                        {insightLoading ? "Loading…" : "Regenerate"}
                    </button>
                </div>
                {insightLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: 16, borderRadius: 4, background: "linear-gradient(90deg, #111827 25%, #1e293b 50%, #111827 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", width: `${100 - i * 15}%` }} />
                        ))}
                    </div>
                ) : (
                    <div style={{ color: "#f0f6fc", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {insight}
                    </div>
                )}
            </div>
        </div>
    );
}
