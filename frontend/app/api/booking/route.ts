import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(`${API_URL}/api/booking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        // Demo fallback
        const body = await request.clone().json().catch(() => ({}));
        const bookingId = `BK-${Date.now().toString().slice(-8)}`;
        const totalWeight = (body.commodities || []).reduce((s: number, c: { weight_kg?: number }) => s + (c.weight_kg || 0), 0);
        const freight = totalWeight * (body.rate_per_kg || 20) * (1 + (body.service_tax_pct || 12.5) / 100);
        return NextResponse.json({
            booking_id: bookingId,
            freight: Math.round(freight * 100) / 100,
            status: "confirmed",
            created_at: new Date().toISOString(),
        });
    }
}
