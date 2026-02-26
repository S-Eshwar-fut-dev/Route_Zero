"use client";

interface Props {
    label: string;
    value: string | number;
    unit?: string;
    delta?: string;
    highlight?: boolean;
    invertColor?: boolean;
    loading?: boolean;
    glow?: boolean;
}

export default function KpiCard({ label, value, unit, delta, highlight, invertColor, loading, glow }: Props) {
    const glowStyle = glow ? { boxShadow: "0 0 20px rgba(0,255,135,0.15)" } : {};

    return (
        <div style={{
            background: "#0d1421",
            border: `1px solid ${highlight ? "#1e3a2f" : "#1e293b"}`,
            borderRadius: 14,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            ...glowStyle,
        }}>
            <span style={{
                color: "#8b949e",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
            }}>
                {label}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                {loading ? (
                    <div style={{
                        height: 42, width: 80, borderRadius: 6,
                        background: "linear-gradient(90deg, #111827 25%, #1e293b 50%, #111827 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                    }} />
                ) : (
                    <>
                        <span className="metric-value" style={{
                            fontSize: highlight ? "2.2rem" : "1.6rem",
                            fontWeight: 700,
                            color: highlight ? "#00ff87" : "#f0f6fc",
                            lineHeight: 1,
                            textShadow: highlight ? "0 0 20px rgba(0,255,135,0.5)" : "none",
                        }}>
                            {value}
                        </span>
                        {unit && <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>{unit}</span>}
                    </>
                )}
            </div>
            {!loading && delta && (
                <span style={{
                    fontSize: "0.72rem",
                    color: invertColor
                        ? (delta.startsWith("+") ? "#00ff87" : "#ef4444")
                        : (delta.startsWith("-") ? "#00ff87" : "#ef4444"),
                }}>
                    {delta}
                </span>
            )}
        </div>
    );
}
