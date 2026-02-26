import { NextResponse } from "next/server";

const DEMO_VEHICLES = [
    { vehicle_id: "TRK-DL-001", timestamp: Date.now() / 1000, latitude: 22.31, longitude: 73.18, fuel_consumed_liters: 3.2, speed_kmph: 62, route_id: "delhi_mumbai", co2_kg: 8.38, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.42, load_status: "LADEN", engine_temp_c: 91, tyre_pressure_psi: 38, cargo_type: "Electronics", weather: "Clear", eta_hours: 5.2, eta_status: "ON_TIME", remaining_km: 322, order_id: "ORD-7842", customer: "Reliance Retail", destination: "Mumbai JNPT" },
    { vehicle_id: "TRK-DL-002", timestamp: Date.now() / 1000, latitude: 24.58, longitude: 74.63, fuel_consumed_liters: 3.8, speed_kmph: 55, route_id: "delhi_mumbai", co2_kg: 9.95, status: "WARNING", deviation_status: "OK", co2_saved_kg: 0.18, load_status: "LADEN", engine_temp_c: 94, tyre_pressure_psi: 36, cargo_type: "Auto Parts", weather: "Haze", eta_hours: 8.1, eta_status: "AT_RISK", remaining_km: 445, order_id: "ORD-7843", customer: "Maruti Suzuki", destination: "Pune Chakan" },
    { vehicle_id: "TRK-DL-003", timestamp: Date.now() / 1000, latitude: 26.12, longitude: 73.02, fuel_consumed_liters: 2.9, speed_kmph: 68, route_id: "delhi_mumbai", co2_kg: 7.59, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.61, load_status: "LADEN", engine_temp_c: 89, tyre_pressure_psi: 39, cargo_type: "Textiles", weather: "Clear", eta_hours: 6.8, eta_status: "ON_TIME", remaining_km: 462, order_id: "ORD-7844", customer: "Raymond Ltd", destination: "Ahmedabad" },
    { vehicle_id: "TRK-DL-004", timestamp: Date.now() / 1000, latitude: 21.17, longitude: 72.83, fuel_consumed_liters: 4.1, speed_kmph: 48, route_id: "delhi_mumbai", co2_kg: 10.74, status: "HIGH_EMISSION_ALERT", deviation_status: "DEVIATED", co2_saved_kg: 0.0, load_status: "LADEN", engine_temp_c: 102, tyre_pressure_psi: 34, cargo_type: "Chemicals", weather: "Rain", eta_hours: 12.4, eta_status: "DELAYED", remaining_km: 595, order_id: "ORD-7845", customer: "Tata Chemicals", destination: "Mumbai Bhiwandi" },
    { vehicle_id: "TRK-CH-001", timestamp: Date.now() / 1000, latitude: 12.91, longitude: 77.65, fuel_consumed_liters: 2.1, speed_kmph: 54, route_id: "chennai_bangalore", co2_kg: 5.50, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.73, load_status: "LADEN", engine_temp_c: 88, tyre_pressure_psi: 40, cargo_type: "FMCG", weather: "Clear", eta_hours: 1.8, eta_status: "ON_TIME", remaining_km: 97, order_id: "ORD-7846", customer: "ITC Limited", destination: "Bangalore Whitefield" },
    { vehicle_id: "TRK-CH-002", timestamp: Date.now() / 1000, latitude: 12.73, longitude: 77.83, fuel_consumed_liters: 2.4, speed_kmph: 61, route_id: "chennai_bangalore", co2_kg: 6.28, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.55, load_status: "LADEN", engine_temp_c: 90, tyre_pressure_psi: 38, cargo_type: "Auto Components", weather: "Clear", eta_hours: 1.2, eta_status: "ON_TIME", remaining_km: 73, order_id: "ORD-7847", customer: "Ashok Leyland", destination: "Hosur" },
    { vehicle_id: "TRK-CH-003", timestamp: Date.now() / 1000, latitude: 12.50, longitude: 77.97, fuel_consumed_liters: 2.8, speed_kmph: 45, route_id: "chennai_bangalore", co2_kg: 7.33, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.38, load_status: "LADEN", engine_temp_c: 87, tyre_pressure_psi: 39, cargo_type: "Pharma", weather: "Fog", eta_hours: 0.9, eta_status: "ON_TIME", remaining_km: 40, order_id: "ORD-7848", customer: "Cipla Ltd", destination: "Electronic City" },
    { vehicle_id: "TRK-KL-001", timestamp: Date.now() / 1000, latitude: 24.80, longitude: 84.99, fuel_consumed_liters: 3.5, speed_kmph: 58, route_id: "kolkata_patna", co2_kg: 9.16, status: "WARNING", deviation_status: "OK", co2_saved_kg: 0.22, load_status: "LADEN", engine_temp_c: 95, tyre_pressure_psi: 37, cargo_type: "Steel Coils", weather: "Clear", eta_hours: 3.1, eta_status: "AT_RISK", remaining_km: 180, order_id: "ORD-7849", customer: "Tata Steel", destination: "Patna Warehousing" },
    { vehicle_id: "TRK-KL-002", timestamp: Date.now() / 1000, latitude: 24.10, longitude: 85.40, fuel_consumed_liters: 3.0, speed_kmph: 64, route_id: "kolkata_patna", co2_kg: 7.85, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.48, load_status: "LADEN", engine_temp_c: 92, tyre_pressure_psi: 38, cargo_type: "Cement", weather: "Clear", eta_hours: 2.5, eta_status: "ON_TIME", remaining_km: 160, order_id: "ORD-7850", customer: "UltraTech", destination: "Gaya" },
    { vehicle_id: "TRK-KL-003", timestamp: Date.now() / 1000, latitude: 25.10, longitude: 85.14, fuel_consumed_liters: 2.7, speed_kmph: 52, route_id: "kolkata_patna", co2_kg: 7.07, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.58, load_status: "LADEN", engine_temp_c: 89, tyre_pressure_psi: 39, cargo_type: "Consumer Goods", weather: "Clear", eta_hours: 1.5, eta_status: "ON_TIME", remaining_km: 78, order_id: "ORD-7851", customer: "Flipkart", destination: "Patna City" },
];

const DEMO_ETA = DEMO_VEHICLES.map(v => ({
    vehicle_id: v.vehicle_id,
    eta_hours: v.eta_hours,
    eta_status: v.eta_status,
    remaining_km: v.remaining_km,
    order_id: v.order_id,
    customer: v.customer,
    destination: v.destination,
    avg_speed_kmph: v.speed_kmph,
    cargo_type: v.cargo_type,
    route_id: v.route_id,
    progress: Math.round((1 - v.remaining_km / (v.route_id === "delhi_mumbai" ? 1428 : v.route_id === "chennai_bangalore" ? 350 : 530)) * 1000) / 1000,
    promised_eta: "2026-02-26T12:00:00",
}));

export async function GET() {
    const delayed = DEMO_VEHICLES.filter(v => v.eta_status === "DELAYED");
    const atRisk = DEMO_VEHICLES.filter(v => v.eta_status === "AT_RISK");
    const onTime = DEMO_VEHICLES.filter(v => v.eta_status === "ON_TIME");
    return NextResponse.json({
        vehicles: DEMO_VEHICLES,
        eta_vehicles: DEMO_ETA,
        summary: {
            total: DEMO_VEHICLES.length,
            delayed: delayed.length,
            at_risk: atRisk.length,
            on_time: onTime.length,
        },
    });
}
