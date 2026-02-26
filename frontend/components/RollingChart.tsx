"use client";

import { useEffect, useRef, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/lib/types";
import { useFleet } from "@/lib/FleetContext";

const VEHICLE_COLORS: Record<string, string> = {
    "TRK-DL-001": "#00ff87",
    "TRK-DL-002": "#00ccff",
    "TRK-DL-003": "#ff9500",
    "TRK-DL-004": "#ff4444",
    "TRK-CH-001": "#c084fc",
    "TRK-CH-002": "#f472b6",
    "TRK-CH-003": "#34d399",
    "TRK-KL-001": "#fbbf24",
    "TRK-KL-002": "#a78bfa",
    "TRK-KL-003": "#fb923c",
};

const PLACEHOLDER_HEIGHTS = [40, 65, 45, 80, 55, 70, 50, 75, 60, 85];

export default function RollingChart() {
    const { vehicles } = useFleet();
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const lastUpdateRef = useRef(0);

    // Update chart data whenever vehicles change (driven by FleetContext polling)
    useEffect(() => {
        if (!vehicles.length) return;
        const now = Date.now();
        // Throttle to ~2s to match previous polling cadence
        if (now - lastUpdateRef.current < 1800) return;
        lastUpdateRef.current = now;

        const ts = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const point: ChartDataPoint = { time: ts };
        for (const v of vehicles) {
            point[v.vehicle_id] = parseFloat((v.co2_kg ?? 0).toFixed(3));
        }
        setData((prev) => [...prev.slice(-19), point]);
    }, [vehicles]);

    const vehicleIds = data.length
        ? Object.keys(data[0]).filter((k) => k !== "time")
        : [];

    return (
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: "#e6edf3", margin: "0 0 16px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Rolling CO₂ per Vehicle (kg, live 2s)
            </h3>
            {data.length === 0 ? (
                <div style={{
                    height: 220, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 16,
                }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 70 }}>
                        {PLACEHOLDER_HEIGHTS.map((h, i) => (
                            <div key={i} style={{
                                width: 8,
                                height: h,
                                background: "#30363d",
                                borderRadius: 2,
                                animation: `pulse-ring ${0.8 + i * 0.1}s ease-in-out infinite alternate`,
                                opacity: 0.5,
                            }} />
                        ))}
                    </div>
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>
                        📡 Connecting to live CO₂ stream...
                    </span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="time" tick={{ fill: "#8b949e", fontSize: 11 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} unit=" kg" width={52} />
                        <Tooltip
                            contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}
                            labelStyle={{ color: "#8b949e" }}
                            itemStyle={{ color: "#e6edf3" }}
                        />
                        <Legend wrapperStyle={{ color: "#8b949e", fontSize: 11 }} />
                        {vehicleIds.map((id) => (
                            <Line
                                key={id}
                                type="monotone"
                                dataKey={id}
                                stroke={VEHICLE_COLORS[id] ?? "#8b949e"}
                                dot={false}
                                strokeWidth={2}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
