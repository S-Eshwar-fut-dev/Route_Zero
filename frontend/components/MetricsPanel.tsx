"use client";

import type { VehicleEvent } from "@/lib/types";

interface Props {
    vehicles: VehicleEvent[];
}

function MetricCard({
    label,
    value,
    unit,
    delta,
    highlight,
    invertColor,
    loading,
}: {
    label: string;
    value: string | number;
    unit?: string;
    delta?: string;
    highlight?: boolean;
    invertColor?: boolean;
    loading?: boolean;
}) {
    return (
        <div
            style={{
                background: "#161b22",
                border: `1px solid ${highlight ? "#00ff87" : "#30363d"}`,
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
            }}
        >
            <span style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                {loading ? (
                    <div style={{
                        height: 42,
                        width: 80,
                        borderRadius: 6,
                        background: "linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                    }} />
                ) : (
                    <>
                        <span
                            className="metric-value"
                            style={{
                                fontSize: highlight ? "2.5rem" : "1.75rem",
                                fontWeight: 700,
                                color: highlight ? "#00ff87" : "#e6edf3",
                                lineHeight: 1,
                            }}
                        >
                            {value}
                        </span>
                        {unit && <span style={{ color: "#8b949e", fontSize: "0.85rem" }}>{unit}</span>}
                    </>
                )}
            </div>
            {!loading && delta && (
                <span style={{
                    fontSize: "0.75rem",
                    color: invertColor
                        ? (delta.startsWith("+") ? "#00ff87" : "#ff4444")
                        : (delta.startsWith("+") ? "#ff4444" : "#00ff87"),
                }}>
                    {delta}
                </span>
            )}
        </div>
    );
}

export default function MetricsPanel({ vehicles }: Props) {
    const isLoading = vehicles.length === 0;
    const totalCo2 = vehicles.reduce((s, v) => s + (v.co2_kg ?? 0), 0);
    const totalSaved = vehicles.reduce((s, v) => s + (v.co2_saved_kg ?? 0), 0);
    const alerts = vehicles.filter((v) => v.status === "HIGH_EMISSION_ALERT").length;
    const deviations = vehicles.filter((v) => v.deviation_status && !v.deviation_status.startsWith("OK")).length;

    const efficiencies = vehicles.map((v) =>
        v.fuel_consumed_liters > 0 ? (v.speed_kmph * (2 / 60)) / v.fuel_consumed_liters : 0
    );
    const avgEff = efficiencies.length ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length : 0;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "100%" }}>
            <MetricCard
                label="CO₂ Emitted (live)"
                value={totalCo2.toFixed(1)}
                unit="kg"
                delta={`+${(totalCo2 * 0.05).toFixed(1)} kg`}
                loading={isLoading}
            />
            <MetricCard
                label="CO₂ Saved vs Baseline"
                value={totalSaved.toFixed(1)}
                unit="kg"
                highlight
                invertColor
                delta={totalSaved > 0 ? `+${totalSaved.toFixed(1)} saved` : "Accumulating..."}
                loading={isLoading}
            />
            <MetricCard
                label="Active Anomalies"
                value={alerts + deviations}
                unit={alerts + deviations === 1 ? "alert" : "alerts"}
                loading={isLoading}
            />
            <MetricCard
                label="Fleet Avg Efficiency"
                value={avgEff.toFixed(2)}
                unit="km/L"
                delta={avgEff > 3.5 ? "+0.12" : "-0.08"}
                loading={isLoading}
            />
        </div>
    );
}
