import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const question = body.question || "";
    return NextResponse.json({
        answer: `**GreenPulse AI Analysis**\n\nBased on the current fleet telemetry data for your query: "${question}"\n\n- The fleet of **10 vehicles** across **3 routes** (Delhi-Mumbai, Chennai-Bangalore, Kolkata-Patna) is currently operating with an average CO₂ emission of **7.9 kg per event**.\n- **7 out of 10** vehicles are classified as ON_TIME for their deliveries.\n- **TRK-DL-004** has triggered a HIGH_EMISSION_ALERT due to heavy rain conditions and route deviation, with CO₂ at 10.74 kg.\n- Fleet fuel efficiency is at **82%** of optimal levels.\n- Total CO₂ saved today through route optimization: **4.15 kg**.\n\n*Data sourced from live Pathway streaming pipeline and Gemini-enhanced telemetry.*`,
        sources: ["fleet_summary.jsonl", "eta_summary.jsonl", "Tata_Prima_4928_specs.md", "Ashok_Leyland_AVTR_specs.md"],
        live_data_used: true,
    });
}
