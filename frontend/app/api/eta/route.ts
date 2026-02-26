import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET() {
    try {
        const res = await fetch(`${BACKEND}/eta`, { cache: "no-store" });
        if (!res.ok) return NextResponse.json({ vehicles: [] });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ vehicles: [] });
    }
}
