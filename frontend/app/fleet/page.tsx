"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useFleet } from "@/lib/FleetContext";
import type { VehicleEvent } from "@/lib/types";

type SortKey = "vehicle_id" | "route_id" | "status" | "co2_kg" | "fuel_consumed_liters" | "speed_kmph" | "co2_saved_kg";

export default function FleetPage() {
    const { vehicles, stats } = useFleet();
    const [search, setSearch] = useState("");
    const [routeFilter, setRouteFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortKey, setSortKey] = useState<SortKey>("vehicle_id");
    const [sortAsc, setSortAsc] = useState(true);

    const filtered = useMemo(() => {
        let list = [...vehicles];
        if (search) list = list.filter(v => v.vehicle_id.toLowerCase().includes(search.toLowerCase()));
        if (routeFilter !== "All") list = list.filter(v => v.route_id === routeFilter);
        if (statusFilter !== "All") list = list.filter(v => v.status === statusFilter);
        list.sort((a, b) => {
            const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
            if (typeof av === "string") return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
            return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
        return list;
    }, [vehicles, search, routeFilter, statusFilter, sortKey, sortAsc]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(true); }
    }

    function statusColor(s: VehicleEvent["status"]) {
        if (s === "HIGH_EMISSION_ALERT") return "#ef4444";
        if (s === "WARNING") return "#f59e0b";
        return "#00ff87";
    }

    const efficiency = (v: VehicleEvent) => v.fuel_consumed_liters > 0 ? ((v.speed_kmph * (2 / 60)) / v.fuel_consumed_liters).toFixed(2) : "—";

    const headerStyle = (key: SortKey): React.CSSProperties => ({
        padding: "10px 12px", textAlign: "left" as const, color: sortKey === key ? "#00ff87" : "#8b949e",
        fontSize: "0.68rem", textTransform: "uppercase" as const, letterSpacing: "0.06em",
        cursor: "pointer", borderBottom: "1px solid #1e293b", fontWeight: 600, whiteSpace: "nowrap" as const,
        userSelect: "none" as const,
    });

    return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Fleet Management</h1>
                <span style={{ background: "#00ff8715", color: "#00ff87", padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600 }}>
                    {stats.vehicleCount} vehicles
                </span>
                <span style={{ marginLeft: "auto", color: "#4b5563", fontSize: "0.72rem" }}>
                    Updated every 2s · {new Date().toLocaleTimeString("en-IN")}
                </span>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search vehicle ID…"
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 14px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none", width: 200 }}
                />
                <select value={routeFilter} onChange={e => setRouteFilter(e.target.value)}
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none" }}>
                    <option value="All">All Routes</option>
                    <option value="delhi_mumbai">Delhi → Mumbai</option>
                    <option value="chennai_bangalore">Chennai → Bangalore</option>
                    <option value="kolkata_patna">Kolkata → Patna</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none" }}>
                    <option value="All">All Status</option>
                    <option value="NORMAL">Normal</option>
                    <option value="WARNING">Warning</option>
                    <option value="HIGH_EMISSION_ALERT">Alert</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={headerStyle("vehicle_id")} onClick={() => toggleSort("vehicle_id")}>
                                Vehicle {sortKey === "vehicle_id" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("route_id")} onClick={() => toggleSort("route_id")}>
                                Route {sortKey === "route_id" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("status")} onClick={() => toggleSort("status")}>
                                Status {sortKey === "status" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("co2_kg")} onClick={() => toggleSort("co2_kg")}>
                                CO₂ (kg) {sortKey === "co2_kg" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("fuel_consumed_liters")} onClick={() => toggleSort("fuel_consumed_liters")}>
                                Fuel (L) {sortKey === "fuel_consumed_liters" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("speed_kmph")} onClick={() => toggleSort("speed_kmph")}>
                                Speed {sortKey === "speed_kmph" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={{ ...headerStyle("co2_kg"), cursor: "default", color: "#8b949e" }}>Efficiency</th>
                            <th style={headerStyle("co2_saved_kg")} onClick={() => toggleSort("co2_saved_kg")}>
                                CO₂ Saved {sortKey === "co2_saved_kg" && (sortAsc ? "↑" : "↓")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(v => {
                            const sc = statusColor(v.status);
                            const isAlert = v.status === "HIGH_EMISSION_ALERT";
                            return (
                                <tr key={v.vehicle_id}>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", borderLeft: `3px solid ${sc}` }}>
                                        <Link href={`/fleet/${v.vehicle_id}`} style={{ color: "#f0f6fc", textDecoration: "none", fontWeight: 600, fontSize: "0.82rem" }}>
                                            {v.vehicle_id}
                                        </Link>
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#8b949e", fontSize: "0.78rem" }}>
                                        {v.route_id.replace(/_/g, " → ")}
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                            <span style={{
                                                width: 8, height: 8, borderRadius: "50%", background: sc,
                                                animation: isAlert ? "pulse-red 1.5s ease-out infinite" : "none",
                                            }} />
                                            <span style={{ color: sc, fontSize: "0.72rem", fontWeight: 600 }}>
                                                {v.status === "HIGH_EMISSION_ALERT" ? "ALERT" : v.status === "WARNING" ? "WARN" : "OK"}
                                            </span>
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#f0f6fc", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                        {v.co2_kg?.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#8b949e", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                        {v.fuel_consumed_liters?.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#8b949e", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                        {v.speed_kmph?.toFixed(0)} km/h
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#8b949e", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                        {efficiency(v)} km/L
                                    </td>
                                    <td style={{ padding: "12px", borderBottom: "1px solid #1e293b0a", color: "#00ff87", fontSize: "0.82rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                        {v.co2_saved_kg?.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div style={{
                background: "#0d1421", border: "1px solid #1e293b", borderRadius: 10,
                padding: "10px 20px", display: "flex", gap: 24,
                fontSize: "0.75rem", color: "#8b949e",
            }}>
                <span>Fleet total: <strong style={{ color: "#f0f6fc" }}>{stats.totalCo2.toFixed(1)} kg</strong> CO₂</span>
                <span>Fuel: <strong style={{ color: "#f0f6fc" }}>{stats.totalFuel.toFixed(1)} L</strong></span>
                <span>Saved: <strong style={{ color: "#00ff87" }}>{stats.totalSaved.toFixed(1)} kg</strong> today</span>
            </div>
        </div>
    );
}
