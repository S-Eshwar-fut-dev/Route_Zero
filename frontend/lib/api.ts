import type { QueryResult, VehicleEvent, ETAEntry } from "./types";

const BASE = "";

export async function fetchFleet(): Promise<VehicleEvent[]> {
    const res = await fetch(`${BASE}/api/fleet`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
}

export async function postQuery(question: string): Promise<QueryResult> {
    const res = await fetch(`${BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error("Query failed");
    return res.json();
}

export async function postSpike(vehicle_id: string): Promise<void> {
    await fetch(`${BASE}/api/spike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id }),
    });
}

export async function fetchFleetIntel(): Promise<{ vehicles: VehicleEvent[]; eta_vehicles: ETAEntry[]; summary: { total: number; delayed: number; at_risk: number; on_time: number } }> {
    try {
        const res = await fetch(`${BASE}/api/fleet-intel`, { cache: "no-store" });
        if (!res.ok) return { vehicles: [], eta_vehicles: [], summary: { total: 0, delayed: 0, at_risk: 0, on_time: 0 } };
        return res.json();
    } catch {
        return { vehicles: [], eta_vehicles: [], summary: { total: 0, delayed: 0, at_risk: 0, on_time: 0 } };
    }
}

export async function fetchEta(): Promise<{ vehicles: ETAEntry[] }> {
    try {
        const res = await fetch(`${BASE}/api/eta`, { cache: "no-store" });
        if (!res.ok) return { vehicles: [] };
        return res.json();
    } catch {
        return { vehicles: [] };
    }
}
