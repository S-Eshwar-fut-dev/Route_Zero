"use client";

import { useState, useMemo } from "react";
import { useFleet } from "@/lib/FleetContext";
import KpiCard from "@/components/KpiCard";
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const GREEN = ["#00ff87", "#00cc6a", "#009950"];

export default function AnalyticsPage() {
    const { vehicles, stats, vehicleHistory } = useFleet();
    const [range] = useState("24h");

    /* CO₂ by route */
    const routeData = useMemo(() => {
        const map: Record<string, { co2: number; saved: number }> = {};
        for (const v of vehicles) {
            const r = v.route_id;
            if (!map[r]) map[r] = { co2: 0, saved: 0 };
            map[r].co2 += v.co2_kg ?? 0;
            map[r].saved += v.co2_saved_kg ?? 0;
        }
        return Object.entries(map).map(([route, d]) => ({
            route: route.replace(/_/g, " → "),
            co2: parseFloat(d.co2.toFixed(2)),
            saved: parseFloat(d.saved.toFixed(2)),
        }));
    }, [vehicles]);

    /* Vehicle efficiency ranking */
    const effData = useMemo(() => {
        return vehicles
            .map(v => ({
                id: v.vehicle_id,
                eff: v.fuel_consumed_liters > 0 ? parseFloat(((v.speed_kmph * (2 / 60)) / v.fuel_consumed_liters).toFixed(2)) : 0,
            }))
            .sort((a, b) => b.eff - a.eff);
    }, [vehicles]);

    /* Pie data for saved */
    const pieData = routeData.map((d, i) => ({ name: d.route, value: Math.max(0, d.saved) }));

    const complianceData = [
        { route: "Delhi → Mumbai", pct: 82, target: 20, remaining: "312 kg" },
        { route: "Chennai → Bangalore", pct: 70, target: 20, remaining: "498 kg" },
        { route: "Kolkata → Patna", pct: 90, target: 20, remaining: "124 kg" },
    ];

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Fleet Analytics</h1>
                <span style={{ background: "#111827", color: "#8b949e", padding: "4px 12px", borderRadius: 8, fontSize: "0.72rem" }}>
                    Last {range}
                </span>
            </div>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <KpiCard label="Total CO₂ Emitted" value={stats.totalCo2.toFixed(1)} unit="kg" loading={!vehicles.length} />
                <KpiCard label="Total CO₂ Saved" value={stats.totalSaved.toFixed(1)} unit="kg" highlight glow invertColor loading={!vehicles.length} />
                <KpiCard label="Fleet Efficiency vs Target" value={stats.avgEfficiency.toFixed(2)} unit="km/L"
                    delta={stats.avgEfficiency > 3.5 ? "On track ✓" : "Below target ⚠"} loading={!vehicles.length} />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* CO₂ by Route */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        CO₂ by Route
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={routeData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="route" tick={{ fill: "#4b5563", fontSize: 9 }} />
                            <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} unit=" kg" width={48} />
                            <Tooltip contentStyle={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} />
                            <Bar dataKey="co2" fill="#00ff87" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Vehicle Efficiency Ranking */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Vehicle Efficiency Ranking
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={effData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} unit=" km/L" />
                            <YAxis dataKey="id" type="category" tick={{ fill: "#8b949e", fontSize: 9 }} width={80} />
                            <Tooltip contentStyle={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} />
                            <Bar dataKey="eff" radius={[0, 6, 6, 0]}>
                                {effData.map((_, i) => (
                                    <Cell key={i} fill={i < 3 ? "#00ff87" : i < 7 ? "#f59e0b" : "#ef4444"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* CO₂ Saved Pie */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        CO₂ Saved Breakdown
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" paddingAngle={3}>
                                {pieData.map((_, i) => <Cell key={i} fill={GREEN[i % GREEN.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }} />
                            <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#8b949e" }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* NLP Compliance */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
                    <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        NLP 2022 Compliance Status
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {complianceData.map(c => (
                            <div key={c.route}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ color: "#f0f6fc", fontSize: "0.78rem" }}>{c.route}</span>
                                    <span style={{ color: c.pct >= 80 ? "#00ff87" : "#f59e0b", fontSize: "0.72rem", fontWeight: 600 }}>{c.pct}%</span>
                                </div>
                                <div style={{ height: 8, background: "#111827", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", borderRadius: 4,
                                        width: `${c.pct}%`,
                                        background: c.pct >= 80 ? "#00ff87" : "#f59e0b",
                                        transition: "width 0.3s ease",
                                    }} />
                                </div>
                                <div style={{ color: "#4b5563", fontSize: "0.65rem", marginTop: 4 }}>{c.remaining} CO₂ reduction remaining</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
