"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
    data: { time: string; co2: number }[];
}

export default function FleetAvgChart({ data }: Props) {
    return (
        <div style={{
            background: "#0d1421",
            border: "1px solid #1e293b",
            borderRadius: 14,
            padding: "20px 24px",
        }}>
            <h3 style={{
                color: "#f0f6fc", margin: "0 0 16px",
                fontSize: "0.82rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
                Fleet CO₂ Trend (Live)
            </h3>

            {data.length === 0 ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#4b5563", fontSize: "0.8rem" }}>📡 Accumulating fleet data…</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <defs>
                            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ff87" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" tick={{ fill: "#4b5563", fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} unit=" kg" width={48} />
                        <Tooltip
                            contentStyle={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.8rem" }}
                            labelStyle={{ color: "#8b949e" }}
                            itemStyle={{ color: "#00ff87" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="co2"
                            stroke="#00ff87"
                            fill="url(#greenGrad)"
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
