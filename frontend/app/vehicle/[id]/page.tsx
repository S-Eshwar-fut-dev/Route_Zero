"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useFleet } from "@/lib/FleetContext";
import { driverName } from "@/lib/FleetContext";

const IndiaMap = dynamic(() => import("@/components/IndiaMap"), { ssr: false });

export default function VehicleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { vehicles } = useFleet();
    const vehicleId = params.id as string;
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
    const [alerts, setAlerts] = useState<Array<{ time: string; alert_type: string; value: string; status: string }>>([]);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${apiUrl}/api/vehicle/${vehicleId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts) setAlerts(data.alerts);
                }
            } catch {
                setAlerts([
                    { time: "14:32", alert_type: "High Emission", value: "9.2 kg/h", status: "RESOLVED" },
                    { time: "14:18", alert_type: "Speed Violation", value: "95 km/h", status: "RESOLVED" },
                    { time: "13:55", alert_type: "Route Deviation", value: "3.2 km", status: "OPEN" },
                ]);
            }
        }
        fetchAlerts();
    }, [vehicleId]);

    async function notifyDriver() {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${apiUrl}/api/notify-driver`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicle_id: vehicleId,
                    alert_type: "manual",
                    message: `Alert notification for ${vehicleId}`,
                }),
            });
            alert("Driver notified successfully!");
        } catch {
            alert("Notification sent (demo mode)");
        }
    }

    if (!vehicle) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ color: "#8b949e", fontSize: "1rem", marginBottom: 16 }}>Loading vehicle data for <strong style={{ color: "#00D4FF" }}>{vehicleId}</strong>…</div>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#00ff87", margin: "0 auto", animation: "pulse 1.5s ease-out infinite" }} />
            </div>
        );
    }

    function statusColor(s: string) {
        if (s === "HIGH_EMISSION_ALERT") return "#ef4444";
        if (s === "WARNING") return "#f59e0b";
        return "#00ff87";
    }

    const co2Compliance = Math.min(100, Math.max(0, 100 - (vehicle.co2_kg / 12) * 100));
    const co2Color = co2Compliance > 70 ? "#00ff87" : co2Compliance > 40 ? "#f59e0b" : "#ef4444";

    const statBar = (label: string, value: number, max: number, color: string, unit: string = "") => (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
                <span style={{ color: "#8b949e" }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}{unit}</span>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
            </div>
        </div>
    );

    return (
        <div style={{ padding: "24px 32px", overflowY: "auto", height: "calc(100vh - 64px)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#8b949e", fontSize: "1.1rem", cursor: "pointer" }}>← Back</button>
                <h1 style={{ color: "#f0f6fc", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>{vehicleId}</h1>
                <span style={{
                    background: `${statusColor(vehicle.status)}22`, color: statusColor(vehicle.status),
                    padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
                }}>{vehicle.status.replace(/_/g, " ")}</span>
                <span style={{ marginLeft: "auto", color: "#8b949e", fontSize: "0.8rem" }}>
                    Driver: <strong style={{ color: "#f0f6fc" }}>{driverName(vehicleId)}</strong>
                </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* LEFT: Mini map + Vehicle info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Mini-Map */}
                    <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", height: 280 }}>
                        <IndiaMap
                            vehicles={[vehicle]}
                            singleRoute={vehicle.route_id}
                            singleVehicle={true}
                            height="280px"
                        />
                    </div>

                    {/* Vehicle info grid */}
                    <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                            ["Route", vehicle.route_id?.replace(/_/g, " → ") || "N/A"],
                            ["Cargo", vehicle.cargo_type || "General"],
                            ["Load", `${vehicle.load_weight_kg ? (vehicle.load_weight_kg / 1000).toFixed(1) + "t" : "N/A"}`],
                            ["ETA", `${vehicle.eta_hours?.toFixed(1) || "N/A"}h`],
                            ["Speed", `${vehicle.speed_kmph?.toFixed(1)} km/h`],
                            ["Fuel Consumed", `${vehicle.fuel_consumed_liters?.toFixed(1)} L`],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <div style={{ color: "#8b949e", fontSize: "0.68rem", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                                <div style={{ color: "#f0f6fc", fontSize: "0.9rem", fontWeight: 600 }}>{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Stats, compliance gauge, alert history */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Live Stats */}
                    <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20 }}>
                        <div style={{ color: "#8b949e", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600, marginBottom: 16, letterSpacing: "0.06em" }}>
                            Live Performance
                        </div>
                        {statBar("CO₂ Emitted", vehicle.co2_kg || 0, 15, vehicle.co2_kg > 10 ? "#ef4444" : "#00ff87", " kg")}
                        {statBar("Speed", vehicle.speed_kmph || 0, 120, vehicle.speed_kmph > 80 ? "#f59e0b" : "#00D4FF", " km/h")}
                        {statBar("Fuel Used", vehicle.fuel_consumed_liters || 0, 6, "#f59e0b", " L")}
                        {vehicle.temperature_c !== undefined && statBar("Temperature", vehicle.temperature_c, 30, vehicle.temperature_breach ? "#00d4ff" : "#00ff87", "°C")}
                    </div>

                    {/* Environment Compliance Gauge */}
                    <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: 20, textAlign: "center" }}>
                        <div style={{ color: "#8b949e", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Environmental Compliance</div>
                        <div style={{
                            width: 100, height: 100, borderRadius: "50%",
                            border: `6px solid ${co2Color}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto", background: `${co2Color}11`,
                        }}>
                            <span style={{ color: co2Color, fontSize: "1.6rem", fontWeight: 800 }}>{co2Compliance.toFixed(0)}%</span>
                        </div>
                        <div style={{ color: "#4b5563", fontSize: "0.72rem", marginTop: 8 }}>vs NLP 2022 interim target</div>
                    </div>

                    {/* Notify Driver */}
                    <button onClick={notifyDriver} style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        border: "none", borderRadius: 10, padding: "14px 24px",
                        color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                        width: "100%",
                    }}>📱 Notify Driver</button>
                </div>
            </div>

            {/* Alert History */}
            <div style={{ marginTop: 24, background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Alert History</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#0F172A" }}>
                            <th style={{ padding: "8px 16px", color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>Time</th>
                            <th style={{ padding: "8px 16px", color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>Alert</th>
                            <th style={{ padding: "8px 16px", color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>Value</th>
                            <th style={{ padding: "8px 16px", color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alerts.map((a, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                                <td style={{ padding: "10px 16px", color: "#8b949e", fontSize: "0.82rem" }}>{a.time}</td>
                                <td style={{ padding: "10px 16px", color: "#f0f6fc", fontSize: "0.82rem", fontWeight: 500 }}>{a.alert_type}</td>
                                <td style={{ padding: "10px 16px", color: "#f0f6fc", fontSize: "0.82rem" }}>{a.value}</td>
                                <td style={{ padding: "10px 16px" }}>
                                    <span style={{
                                        background: a.status === "OPEN" ? "#ef444422" : "#00ff8722",
                                        color: a.status === "OPEN" ? "#ef4444" : "#00ff87",
                                        padding: "2px 8px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 600,
                                    }}>{a.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
