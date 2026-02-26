"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useFleet } from "@/lib/FleetContext";
import type { VehicleEvent } from "@/lib/types";

type SortKey = "vehicle_id" | "route_id" | "status" | "eta_hours" | "load_weight_kg" | "temperature_c" | "co2_saved_kg";

export default function FleetPage() {
    const { vehicles, stats } = useFleet();
    const [search, setSearch] = useState("");
    const [routeFilter, setRouteFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [cargoFilter, setCargoFilter] = useState("All");
    const [sortKey, setSortKey] = useState<SortKey>("vehicle_id");
    const [sortAsc, setSortAsc] = useState(true);

    const filtered = useMemo(() => {
        let list = [...vehicles];
        if (search) list = list.filter(v => v.vehicle_id.toLowerCase().includes(search.toLowerCase()) || (v.shipment_id && v.shipment_id.toLowerCase().includes(search.toLowerCase())));
        if (routeFilter !== "All") list = list.filter(v => v.route_id === routeFilter);
        if (statusFilter !== "All") list = list.filter(v => v.status === statusFilter);

        if (cargoFilter !== "All") {
            if (cargoFilter === "Cold Chain") list = list.filter(v => v.temperature_c !== undefined);
            else if (cargoFilter === "Heavy Freight") list = list.filter(v => v.container_size_ft === 40);
            else if (cargoFilter === "Hazmat") list = list.filter(v => v.cargo_type?.toLowerCase().includes("chemical"));
        }

        list.sort((a, b) => {
            let av = a[sortKey] ?? 0;
            let bv = b[sortKey] ?? 0;

            // Special handling for nested or derived sort values if needed
            // (Standard numeric/string comparison works for most new fields)

            if (typeof av === "string") return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
            return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
        return list;
    }, [vehicles, search, routeFilter, statusFilter, cargoFilter, sortKey, sortAsc]);

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
                    placeholder="Search vehicle or shipment ID…"
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 14px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none", width: 240 }}
                />
                <select value={routeFilter} onChange={e => setRouteFilter(e.target.value)}
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none" }}>
                    <option value="All">All Routes</option>
                    <option value="delhi_mumbai">Delhi → Mumbai</option>
                    <option value="chennai_bangalore">Chennai → Bangalore</option>
                    <option value="kolkata_patna">Kolkata → Patna</option>
                </select>
                <select value={cargoFilter} onChange={e => setCargoFilter(e.target.value)}
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none" }}>
                    <option value="All">All Cargo Types</option>
                    <option value="Cold Chain">Cold Chain</option>
                    <option value="Heavy Freight">Heavy Freight</option>
                    <option value="Hazmat">Hazmat</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 12px", color: "#f0f6fc", fontSize: "0.82rem", outline: "none" }}>
                    <option value="All">All Status</option>
                    <option value="NORMAL">Normal</option>
                    <option value="WARNING">Warning</option>
                    <option value="HIGH_EMISSION_ALERT">Critical Alert</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                    <thead>
                        <tr style={{ background: "#111827" }}>
                            <th style={headerStyle("vehicle_id")} onClick={() => toggleSort("vehicle_id")}>
                                Shipment {sortKey === "vehicle_id" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("route_id")} onClick={() => toggleSort("route_id")}>
                                Route & ETA {sortKey === "route_id" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("status")} onClick={() => toggleSort("status")}>
                                Condition {sortKey === "status" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("load_weight_kg")} onClick={() => toggleSort("load_weight_kg")}>
                                Load / Capacity {sortKey === "load_weight_kg" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={headerStyle("temperature_c")} onClick={() => toggleSort("temperature_c")}>
                                Temp (°C) {sortKey === "temperature_c" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th style={{ ...headerStyle("vehicle_id"), cursor: "default", color: "#8b949e" }}>
                                Consignee
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(v => {
                            const sc = statusColor(v.status);
                            const isAlert = v.status === "HIGH_EMISSION_ALERT";
                            const riskBorder = v.temperature_breach ? "#00d4ff" : isAlert ? "#ef4444" : v.status === "WARNING" ? "#f59e0b" : "#1e293b0a";

                            return (
                                <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #1e293b", transition: "background 0.2s" }} className="hover-row">
                                    <td style={{ padding: "14px 12px", borderLeft: `3px solid ${riskBorder}` }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <Link href={`/fleet/${v.vehicle_id}`} style={{ color: "#f0f6fc", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}>
                                                {v.vehicle_id}
                                            </Link>
                                            <span style={{ color: "#8b949e", fontSize: "0.72rem" }}>{v.shipment_id || "Unassigned"}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <span style={{ color: "#8b949e", fontSize: "0.78rem" }}>{v.route_id.replace(/_/g, " → ")}</span>
                                            {v.eta_hours != null && (
                                                <span style={{
                                                    color: v.eta_status === "DELAYED" ? "#ef4444" : v.eta_status === "AT_RISK" ? "#f59e0b" : "#00ff87",
                                                    fontSize: "0.72rem", fontWeight: 600
                                                }}>
                                                    ETA: {v.eta_hours.toFixed(1)}h {v.eta_status === "DELAYED" && " (DELAYED)"}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc, animation: isAlert ? "pulse-red 1.5s ease-out infinite" : "none" }} />
                                                <span style={{ color: sc, fontSize: "0.72rem", fontWeight: 600 }}>
                                                    {v.status === "HIGH_EMISSION_ALERT" ? "CRITICAL" : v.status === "WARNING" ? "WARNING" : "NORMAL"}
                                                </span>
                                            </span>
                                            {v.cargo_condition && v.cargo_condition !== "INTACT" && (
                                                <span style={{ fontSize: "0.65rem", color: "#f59e0b", border: "1px solid #f59e0b", padding: "1px 4px", borderRadius: 4, width: "fit-content" }}>
                                                    {v.cargo_condition.replace(/_/g, " ")}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 12px", fontVariantNumeric: "tabular-nums" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <span style={{ color: "#f0f6fc", fontSize: "0.82rem" }}>
                                                {v.load_weight_kg ? `${(v.load_weight_kg / 1000).toFixed(1)}t` : "—"}
                                                <span style={{ color: "#4b5563", fontSize: "0.72rem" }}> / {v.vehicle_capacity_kg ? `${(v.vehicle_capacity_kg / 1000).toFixed(1)}t` : "—"}</span>
                                            </span>
                                            {v.overload_pct && v.overload_pct > 0 ? (
                                                <span style={{ color: "#ef4444", fontSize: "0.7rem", fontWeight: 700 }}>+{v.overload_pct.toFixed(1)}% OVERLOAD</span>
                                            ) : (
                                                <span style={{ color: "#8b949e", fontSize: "0.7rem" }}>{v.container_size_ft || "—"}ft {v.cargo_type}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: "14px 12px", fontVariantNumeric: "tabular-nums" }}>
                                        {v.temperature_c !== undefined ? (
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", gap: 4,
                                                color: v.temperature_breach ? "#00d4ff" : "#f0f6fc",
                                                background: v.temperature_breach ? "rgba(0, 212, 255, 0.15)" : "transparent",
                                                padding: "2px 6px", borderRadius: 4, fontWeight: v.temperature_breach ? 700 : 400, fontSize: "0.85rem"
                                            }}>
                                                ❄️ {v.temperature_c.toFixed(1)}°
                                            </span>
                                        ) : (
                                            <span style={{ color: "#4b5563", fontSize: "0.8rem" }}>N/A</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "14px 12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <span style={{ color: "#f0f6fc", fontSize: "0.82rem" }}>{v.consignee || "—"}</span>
                                            <span style={{ color: "#8b949e", fontSize: "0.7rem" }}>{v.destination}</span>
                                        </div>
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
