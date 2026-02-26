import { NextResponse } from "next/server";

const DEMO_ETA = [
    { vehicle_id: "TRK-DL-001", eta_hours: 5.2, eta_status: "ON_TIME", remaining_km: 322, order_id: "ORD-7842", customer: "Reliance Retail", destination: "Mumbai JNPT", avg_speed_kmph: 62, cargo_type: "Electronics", route_id: "delhi_mumbai", progress: 0.774, promised_eta: "2026-02-26T18:00:00" },
    { vehicle_id: "TRK-DL-002", eta_hours: 8.1, eta_status: "AT_RISK", remaining_km: 445, order_id: "ORD-7843", customer: "Maruti Suzuki", destination: "Pune Chakan", avg_speed_kmph: 55, cargo_type: "Auto Parts", route_id: "delhi_mumbai", progress: 0.688, promised_eta: "2026-02-26T20:00:00" },
    { vehicle_id: "TRK-DL-003", eta_hours: 6.8, eta_status: "ON_TIME", remaining_km: 462, order_id: "ORD-7844", customer: "Raymond Ltd", destination: "Ahmedabad", avg_speed_kmph: 68, cargo_type: "Textiles", route_id: "delhi_mumbai", progress: 0.677, promised_eta: "2026-02-26T22:00:00" },
    { vehicle_id: "TRK-DL-004", eta_hours: 12.4, eta_status: "DELAYED", remaining_km: 595, order_id: "ORD-7845", customer: "Tata Chemicals", destination: "Mumbai Bhiwandi", avg_speed_kmph: 48, cargo_type: "Chemicals", route_id: "delhi_mumbai", progress: 0.583, promised_eta: "2026-02-26T12:00:00" },
    { vehicle_id: "TRK-CH-001", eta_hours: 1.8, eta_status: "ON_TIME", remaining_km: 97, order_id: "ORD-7846", customer: "ITC Limited", destination: "Bangalore Whitefield", avg_speed_kmph: 54, cargo_type: "FMCG", route_id: "chennai_bangalore", progress: 0.723, promised_eta: "2026-02-26T14:00:00" },
    { vehicle_id: "TRK-CH-002", eta_hours: 1.2, eta_status: "ON_TIME", remaining_km: 73, order_id: "ORD-7847", customer: "Ashok Leyland", destination: "Hosur", avg_speed_kmph: 61, cargo_type: "Auto Components", route_id: "chennai_bangalore", progress: 0.791, promised_eta: "2026-02-26T14:00:00" },
    { vehicle_id: "TRK-CH-003", eta_hours: 0.9, eta_status: "ON_TIME", remaining_km: 40, order_id: "ORD-7848", customer: "Cipla Ltd", destination: "Electronic City", avg_speed_kmph: 45, cargo_type: "Pharma", route_id: "chennai_bangalore", progress: 0.886, promised_eta: "2026-02-26T14:00:00" },
    { vehicle_id: "TRK-KL-001", eta_hours: 3.1, eta_status: "AT_RISK", remaining_km: 180, order_id: "ORD-7849", customer: "Tata Steel", destination: "Patna Warehousing", avg_speed_kmph: 58, cargo_type: "Steel Coils", route_id: "kolkata_patna", progress: 0.660, promised_eta: "2026-02-26T16:00:00" },
    { vehicle_id: "TRK-KL-002", eta_hours: 2.5, eta_status: "ON_TIME", remaining_km: 160, order_id: "ORD-7850", customer: "UltraTech", destination: "Gaya", avg_speed_kmph: 64, cargo_type: "Cement", route_id: "kolkata_patna", progress: 0.698, promised_eta: "2026-02-26T16:00:00" },
    { vehicle_id: "TRK-KL-003", eta_hours: 1.5, eta_status: "ON_TIME", remaining_km: 78, order_id: "ORD-7851", customer: "Flipkart", destination: "Patna City", avg_speed_kmph: 52, cargo_type: "Consumer Goods", route_id: "kolkata_patna", progress: 0.853, promised_eta: "2026-02-26T16:00:00" },
];

export async function GET() {
    return NextResponse.json({ vehicles: DEMO_ETA });
}
