"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { VehicleEvent } from "@/lib/types";

interface Props {
    history: VehicleEvent[];
    height?: number;
}

export default function VehicleEmissionsChart({ history, height = 280 }: Props) {
    const data = history.map(v => ({
        time: new Date(v.timestamp * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        co2: parseFloat((v.co2_kg ?? 0).toFixed(3)),
        fuel: parseFloat((v.fuel_consumed_liters ?? 0).toFixed(3)),
        speed: Math.round(v.speed_kmph ?? 0),
    }));

    const avgCo2 = data.length ? data.reduce((s, d) => s + d.co2, 0) / data.length : 0;

    return (
        <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px" }}>
            <h3 style={{ color: "#f0f6fc", margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Emissions Trend — Last {data.length} Readings
            </h3>

            {data.length === 0 ? (
                <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#4b5563", fontSize: "0.8rem" }}>📡 Accumulating vehicle data…</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <defs>
                            <linearGradient id="vGreenGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ff87" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" tick={{ fill: "#4b5563", fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} unit=" kg" width={48} />
                        <Tooltip
                            contentStyle={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.78rem" }}
                            labelStyle={{ color: "#8b949e" }}
                        />
                        <ReferenceLine y={avgCo2} stroke="#4b5563" strokeDasharray="4 4" label={{ value: "Baseline", fill: "#4b5563", fontSize: 10, position: "insideTopRight" }} />
                        <Area type="monotone" dataKey="co2" stroke="#00ff87" fill="url(#vGreenGrad)" strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
