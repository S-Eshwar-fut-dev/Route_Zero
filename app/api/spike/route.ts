import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    return NextResponse.json({
        status: "spike_set",
        vehicle_id: body.vehicle_id || "unknown",
    });
}
