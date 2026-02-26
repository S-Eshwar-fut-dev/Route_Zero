"use client";

import { useEffect, useRef } from "react";
import type { AnomalyEntry } from "@/lib/types";

interface Props {
    anomalies: AnomalyEntry[];
}

function AnomalyRow({ entry }: { entry: AnomalyEntry }) {
    const isHigh = entry.type === "HIGH_EMISSION_ALERT";
    return (
        <div
            className="slide-in"
            style={{
                borderLeft: `3px solid ${isHigh ? "#ff4444" : "#ffa500"}`,
                background: isHigh ? "#ff444411" : "#ffa50011",
                borderRadius: "0 6px 6px 0",
                padding: "8px 12px",
                marginBottom: 6,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: isHigh ? "#ff4444" : "#ffa500", fontSize: "0.72rem", fontWeight: 700 }}>
                    {entry.type.replace(/_/g, " ")}
                </span>
                <span style={{ color: "#8b949e", fontSize: "0.68rem" }}>
                    {new Date(entry.timestamp * 1000).toLocaleTimeString("en-IN")}
                </span>
            </div>
            <div style={{ color: "#e6edf3", fontSize: "0.75rem", marginTop: 3 }}>
                <strong>{entry.vehicle_id}</strong>: {entry.detail}
            </div>
        </div>
    );
}

export default function AnomalyLog({ anomalies }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [anomalies.length]);

    return (
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
            <h3 style={{ color: "#e6edf3", margin: "0 0 12px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center" }}>
                🚨 Anomaly Log
                {anomalies.length > 0 && (
                    <span style={{
                        marginLeft: 8, background: "#ff4444",
                        color: "#fff", borderRadius: 20,
                        padding: "1px 7px", fontSize: "0.68rem", fontWeight: 700,
                    }}>
                        {anomalies.length}
                    </span>
                )}
            </h3>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
                {anomalies.length === 0 ? (
                    <div style={{ color: "#8b949e", fontSize: "0.8rem", textAlign: "center", paddingTop: 24 }}>
                        ✅ All vehicles nominal
                    </div>
                ) : (
                    anomalies.map((a) => <AnomalyRow key={a.id} entry={a} />)
                )}
            </div>
        </div>
    );
}
