import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Works on both Linux (/tmp/greenPulse/...) and Windows (project_root/tmp/...)
const FLEET_PATH =
    process.env.FLEET_SUMMARY_PATH ??
    path.join(process.cwd(), "..", "tmp", "fleet_summary.jsonl");

export async function GET() {
    try {
        if (!fs.existsSync(FLEET_PATH)) {
            return NextResponse.json([]);
        }
        const content = fs.readFileSync(FLEET_PATH, "utf-8").trim();
        if (!content) return NextResponse.json([]);
        const lines = content.split("\n").filter(Boolean);
        const records = lines
            .map((line) => {
                try { return JSON.parse(line); } catch { return null; }
            })
            .filter(Boolean);
        const byVehicle = new Map<string, object>();
        for (const r of records) {
            if (r.vehicle_id) byVehicle.set(r.vehicle_id, r);
        }
        return NextResponse.json(Array.from(byVehicle.values()));
    } catch {
        return NextResponse.json([]);
    }
}
