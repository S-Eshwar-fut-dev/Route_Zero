"use client";

import { useState, useEffect } from "react";

export default function CarbonReportPage() {
    const [report, setReport] = useState<{
        report_date: string;
        total_co2_kg: number;
        total_co2_tonnes: number;
        baseline_co2_tonnes: number;
        reduction_tonnes: number;
        carbon_credits_generated: number;
        credit_value_inr: number;
        methodology: string;
        vehicles: Array<{ vehicle_id: string; route: string; co2_tonnes: number; credits: number }>;
        compliance: { nlp_2022_target_pct: number; achieved_pct: number; status: string };
    } | null>(null);

    useEffect(() => {
        async function fetchReport() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${apiUrl}/api/carbon-report`);
                if (res.ok) setReport(await res.json());
            } catch {
                // Demo fallback
                setReport({
                    report_date: new Date().toISOString().split("T")[0],
                    total_co2_kg: 80.5, total_co2_tonnes: 0.081,
                    baseline_co2_tonnes: 0.102, reduction_tonnes: 0.021,
                    carbon_credits_generated: 0.021, credit_value_inr: 9,
                    methodology: "IPCC AR6 WGIII Table 10.1 + BEE-ICM 2024 MRV",
                    vehicles: [
                        { vehicle_id: "TRK-DL-001", route: "delhi_mumbai", co2_tonnes: 0.008, credits: 0.002 },
                        { vehicle_id: "TRK-CB-005", route: "chennai_bangalore", co2_tonnes: 0.006, credits: 0.001 },
                    ],
                    compliance: { nlp_2022_target_pct: 20, achieved_pct: 20.6, status: "COMPLIANT" },
                });
            }
        }
        fetchReport();
    }, []);

    if (!report) {
        return <div style={{ padding: 40, color: "#8b949e" }}>Loading carbon report…</div>;
    }

    return (
        <div style={{ padding: "32px 40px", overflowY: "auto", height: "calc(100vh - 64px)" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ color: "#f0f6fc", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Carbon Credit Export Report</h1>
                        <p style={{ color: "#8b949e", fontSize: "0.82rem", marginTop: 4 }}>Report Date: {report.report_date}</p>
                    </div>
                    <button onClick={() => window.print()} style={{
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        border: "none", borderRadius: 8, padding: "10px 20px",
                        color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                    }}>🖨 Print Report</button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                    {[
                        { label: "Total CO₂", value: `${report.total_co2_kg} kg`, color: "#ef4444" },
                        { label: "Baseline", value: `${report.baseline_co2_tonnes} t`, color: "#f59e0b" },
                        { label: "Reduction", value: `${report.reduction_tonnes} t`, color: "#00ff87" },
                        { label: "Credits Value", value: `₹${report.credit_value_inr}`, color: "#00D4FF" },
                    ].map(card => (
                        <div key={card.label} style={{
                            background: "#0d1421", border: "1px solid #1e293b", borderRadius: 12,
                            padding: 20, borderTop: `3px solid ${card.color}`,
                        }}>
                            <div style={{ color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</div>
                            <div style={{ color: card.color, fontSize: "1.4rem", fontWeight: 800 }}>{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Compliance Status */}
                <div style={{
                    background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14,
                    padding: 24, marginBottom: 24,
                }}>
                    <div style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Compliance Status</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <span style={{
                            background: report.compliance.status === "COMPLIANT" ? "#00ff8722" : "#ef444422",
                            color: report.compliance.status === "COMPLIANT" ? "#00ff87" : "#ef4444",
                            padding: "6px 16px", borderRadius: 20, fontWeight: 700, fontSize: "0.85rem",
                        }}>{report.compliance.status}</span>
                        <span style={{ color: "#f0f6fc" }}>
                            Achieved: <strong>{report.compliance.achieved_pct}%</strong> vs NLP 2022 target: {report.compliance.nlp_2022_target_pct}%
                        </span>
                    </div>
                    <div style={{ marginTop: 12, color: "#4b5563", fontSize: "0.78rem" }}>
                        Methodology: {report.methodology}
                    </div>
                </div>

                {/* Vehicle breakdown */}
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e293b" }}>
                        <span style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Per-Vehicle Carbon Analysis</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#0F172A" }}>
                                {["Vehicle", "Route", "CO₂ (tonnes)", "Credits"].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", color: "#8b949e", fontSize: "0.7rem", textTransform: "uppercase", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.vehicles.map(v => (
                                <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #1e293b" }}>
                                    <td style={{ padding: "10px 16px", color: "#f0f6fc", fontSize: "0.82rem", fontWeight: 600 }}>{v.vehicle_id}</td>
                                    <td style={{ padding: "10px 16px", color: "#8b949e", fontSize: "0.82rem" }}>{v.route.replace(/_/g, " → ")}</td>
                                    <td style={{ padding: "10px 16px", color: "#f0f6fc", fontSize: "0.82rem" }}>{v.co2_tonnes}</td>
                                    <td style={{ padding: "10px 16px", color: "#00ff87", fontSize: "0.82rem", fontWeight: 600 }}>{v.credits}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
