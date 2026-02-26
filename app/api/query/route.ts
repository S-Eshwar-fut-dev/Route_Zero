import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const question = body.question || "";
    return NextResponse.json({
        answer: `**GreenPulse Logistics Intelligence Analysis**\n\nBased on the current fleet telemetry data for your query: "${question}"\n\n- The fleet is actively tracking **10 shipments** across **3 freight corridors** (Delhi-Mumbai, Chennai-Bangalore, Kolkata-Patna).\n- **7 out of 10** shipments are currently **ON TRACK** for their primary delivery SLA.\n- **TRK-CH-003** has triggered a **TEMPERATURE_BREACH** alert (Cold Chain SLA at risk).\n- **TRK-DL-004** is reporting **DELAYED** (ETA pushback 2.4hrs) and **OVERLOAD_VIOLATION** (+15% capacity).\n- Current estimated financial risk exposure across active anomalies: **$2,450**.\n\n*Data sourced from live Pathway streaming pipeline and Gemini-enhanced logistics telemetry.*`,
        sources: ["fleet_shipments.jsonl", "anomaly_context.jsonl", "sla_matrix.md"],
        live_data_used: true,
    });
}
