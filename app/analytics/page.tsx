"use client";

import { useState, useMemo } from "react";
import { useFleet } from "@/lib/FleetContext";
import KpiCard from "@/components/KpiCard";
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from "recharts";

const GREEN = ["#10B981", "#00cc6a", "#009950"];

export default function AnalyticsPage() {
    const { vehicles, stats, anomalies } = useFleet();
    const [range] = useState("24h");

    /* 1. Anomaly Distribution Pie */
    const anomalyPie = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const a of anomalies) {
            const key = a.type.replace(/_/g, " ");
            counts[key] = (counts[key] || 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [anomalies]);
    const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#00d4ff", "#a855f7"];

    /* 2. Route Health Score (Synthetic 1-100 score based on anomaly freq) */
    const routeHealth = useMemo(() => {
        const routes: Record<string, { total: number, anomalies: number }> = {};
        for (const v of vehicles) {
            if (!routes[v.route_id]) routes[v.route_id] = { total: 0, anomalies: 0 };
            routes[v.route_id].total++;
        }
        for (const a of anomalies) {
            const v = vehicles.find(x => x.vehicle_id === a.vehicle_id);
            if (v && routes[v.route_id]) routes[v.route_id].anomalies++;
        }
        return Object.entries(routes).map(([r, d]) => {
            const baseScore = 100;
            const deduction = (d.anomalies / (d.total || 1)) * 20; // 20 pts per avg anomaly
            return {
                route: r.replace(/_/g, " "),
                score: Math.max(0, Math.round(baseScore - deduction))
            };
        }).sort((a, b) => b.score - a.score);
    }, [vehicles, anomalies]);

    /* 3. Fine Exposure Tracker (Assuming hypothetical fines for overload vs delay) */
    const fineExposureData = useMemo(() => {
        return vehicles.map(v => {
            const overloadViolation = Math.max(0, (v.overload_pct || 0)) * 50; // $50 per % overload
            const delayPenalty = (v.eta_status === "DELAYED" && v.eta_hours ? v.eta_hours * 100 : 0); // $100 per delayed hour
            return {
                id: v.vehicle_id,
                Overloading: Math.round(overloadViolation),
                Delay: Math.round(delayPenalty),
                Total: Math.round(overloadViolation + delayPenalty)
            };
        }).filter(d => d.Total > 0).sort((a, b) => b.Total - a.Total).slice(0, 5); // top 5 worst offenders
    }, [vehicles]);

    /* 4. CO2 vs Delay Scatter */
    const scatterData = useMemo(() => {
        return vehicles.map(v => ({
            id: v.vehicle_id,
            delay: v.eta_status === "DELAYED" ? (v.eta_hours || 2) : 0,
            co2: v.co2_kg || 0,
        })).filter(d => d.delay > 0 || d.co2 > 50); // Show only delayed or high emission
    }, [vehicles]);

    const activeShipments = vehicles.filter(v => v.shipment_id).length;
    const anomalyRate = vehicles.length > 0 ? ((anomalies.length / vehicles.length) * 100).toFixed(1) : "0";

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Fleet Analytics</h1>
                <span style={{ background: "#0F172A", color: "#8b949e", padding: "4px 12px", borderRadius: 8, fontSize: "0.72rem" }}>
                    Last {range}
                </span>
            </div>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <KpiCard label="Active Shipments" value={activeShipments} unit="" loading={!vehicles.length} />
                <KpiCard label="Fleet Anomaly Rate" value={anomalyRate} unit="%" highlight={parseFloat(anomalyRate) < 15} glow={parseFloat(anomalyRate) < 15} invertColor loading={!vehicles.length}
                    delta={parseFloat(anomalyRate) > 20 ? "High Risk ⚠" : "Optimal ✓"} />
                <KpiCard label="Total CO₂ Saved" value={stats.totalSaved.toFixed(1)} unit="kg" loading={!vehicles.length} />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Anomaly Distribution Pie */}
                <div style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Anomaly Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        {anomalyPie.length > 0 ? (
                            <PieChart>
                                <Pie data={anomalyPie} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={4} minAngle={5}>
                                    {anomalyPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} />
                                <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#8b949e", textTransform: "capitalize" }} />
                            </PieChart>
                        ) : (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#4b5563" }}>No anomalies detected</div>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Route Health Score */}
                <div style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Shipment Health Score by Route
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={routeHealth} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: "#4b5563", fontSize: 10 }} />
                            <YAxis dataKey="route" type="category" tick={{ fill: "#8b949e", fontSize: 9 }} width={100} />
                            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} cursor={{ fill: '#1e293b' }} />
                            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                                {routeHealth.map((entry, i) => (
                                    <Cell key={i} fill={entry.score > 80 ? "#10B981" : entry.score > 50 ? "#f59e0b" : "#ef4444"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Fine Exposure Tracker (Stacked Bar) */}
                <div style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Financial Risk Exposure (USD)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        {fineExposureData.length > 0 ? (
                            <BarChart data={fineExposureData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="id" tick={{ fill: "#8b949e", fontSize: 9 }} />
                                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} unit=" $" width={50} />
                                <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} cursor={{ fill: '#1e293b' }} />
                                <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#8b949e" }} />
                                <Bar dataKey="Overloading" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Delay" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        ) : (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#10B981", fontWeight: 600 }}>No current risk exposure</div>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* CO2 vs Delay Scatter Plot */}
                <div style={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Efficiency vs Delay Correlation
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" dataKey="delay" name="Delay" unit=" hrs" tick={{ fill: "#4b5563", fontSize: 10 }} />
                            <YAxis type="number" dataKey="co2" name="CO₂" unit=" kg" tick={{ fill: "#4b5563", fontSize: 10 }} />
                            <ZAxis type="category" dataKey="id" name="Vehicle" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: "#1a2332", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem", color: "#f0f6fc" }} />
                            <Scatter name="Shipments" data={scatterData} fill="#00d4ff">
                                {scatterData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.delay > 0 ? "#ef4444" : "#10B981"} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
