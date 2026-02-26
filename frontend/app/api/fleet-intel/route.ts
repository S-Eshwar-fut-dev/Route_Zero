import { NextResponse } from "next/server";

const DEMO_VEHICLES = [
    {
        vehicle_id: "TRK-DL-001", timestamp: Date.now() / 1000, latitude: 22.31, longitude: 73.18, fuel_consumed_liters: 3.2, speed_kmph: 62, route_id: "delhi_mumbai", co2_kg: 8.38, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.42, load_status: "LADEN", engine_temp_c: 91, tyre_pressure_psi: 38, cargo_type: "Electronics", weather: "Clear", eta_hours: 5.2, eta_status: "ON_TIME", remaining_km: 322, order_id: "ORD-7842", customer: "Reliance Retail", destination: "Mumbai JNPT",
        temperature_c: 22.0, humidity_pct: 45, temperature_breach: false, load_weight_kg: 8500, vehicle_capacity_kg: 10000, container_size_ft: 20, overload_pct: -15, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00421", cargo_condition: "INTACT", consignee: "Reliance Retail", origin: "Delhi NCR", promised_delivery_dt: "2026-02-26T18:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-DL-002", timestamp: Date.now() / 1000, latitude: 24.58, longitude: 74.63, fuel_consumed_liters: 3.8, speed_kmph: 55, route_id: "delhi_mumbai", co2_kg: 9.95, status: "WARNING", deviation_status: "OK", co2_saved_kg: 0.18, load_status: "LADEN", engine_temp_c: 94, tyre_pressure_psi: 36, cargo_type: "Auto Parts", weather: "Haze", eta_hours: 8.1, eta_status: "AT_RISK", remaining_km: 445, order_id: "ORD-7843", customer: "Maruti Suzuki", destination: "Pune Chakan",
        temperature_c: 28.5, humidity_pct: 60, temperature_breach: false, load_weight_kg: 9400, vehicle_capacity_kg: 10000, container_size_ft: 20, overload_pct: -6, load_status_detail: "NEAR_LIMIT", shipment_id: "SHP-2026-00422", cargo_condition: "INTACT", consignee: "Maruti Suzuki", origin: "Gurgaon", promised_delivery_dt: "2026-02-26T20:00:00Z", traffic_congestion: "MODERATE", weather_severity: "HEAVY_RAIN", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-DL-003", timestamp: Date.now() / 1000, latitude: 26.12, longitude: 73.02, fuel_consumed_liters: 2.9, speed_kmph: 68, route_id: "delhi_mumbai", co2_kg: 7.59, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.61, load_status: "LADEN", engine_temp_c: 89, tyre_pressure_psi: 39, cargo_type: "Textiles", weather: "Clear", eta_hours: 6.8, eta_status: "ON_TIME", remaining_km: 462, order_id: "ORD-7844", customer: "Raymond Ltd", destination: "Ahmedabad",
        temperature_c: 30.1, humidity_pct: 35, temperature_breach: false, load_weight_kg: 18000, vehicle_capacity_kg: 26500, container_size_ft: 40, overload_pct: -32, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00423", cargo_condition: "INTACT", consignee: "Raymond Ltd", origin: "Noida", promised_delivery_dt: "2026-02-26T22:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-DL-004", timestamp: Date.now() / 1000, latitude: 21.17, longitude: 72.83, fuel_consumed_liters: 4.1, speed_kmph: 48, route_id: "delhi_mumbai", co2_kg: 10.74, status: "HIGH_EMISSION_ALERT", deviation_status: "DEVIATED", co2_saved_kg: 0.0, load_status: "LADEN", engine_temp_c: 102, tyre_pressure_psi: 34, cargo_type: "Chemicals", weather: "Rain", eta_hours: 12.4, eta_status: "DELAYED", remaining_km: 595, order_id: "ORD-7845", customer: "Tata Chemicals", destination: "Mumbai Bhiwandi",
        temperature_c: 32.5, humidity_pct: 80, temperature_breach: false, load_weight_kg: 28328, vehicle_capacity_kg: 26500, container_size_ft: 40, overload_pct: 6.9, load_status_detail: "OVERLOADED", shipment_id: "SHP-2026-00424", cargo_condition: "INTACT", consignee: "Tata Chemicals", origin: "Faridabad", promised_delivery_dt: "2026-02-26T12:00:00Z", traffic_congestion: "MODERATE", weather_severity: "RAIN", road_hazard: "NH48 landslide km 312", route_deviation_km: 12.4, unauthorized_stop_minutes: 25, accident_flag: false, fine_risk: "OVERLOAD"
    },

    {
        vehicle_id: "TRK-CH-001", timestamp: Date.now() / 1000, latitude: 12.91, longitude: 77.65, fuel_consumed_liters: 2.1, speed_kmph: 54, route_id: "chennai_bangalore", co2_kg: 5.50, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.73, load_status: "LADEN", engine_temp_c: 88, tyre_pressure_psi: 40, cargo_type: "FMCG", weather: "Clear", eta_hours: 1.8, eta_status: "ON_TIME", remaining_km: 97, order_id: "ORD-7846", customer: "ITC Limited", destination: "Bangalore Whitefield",
        temperature_c: 18.2, humidity_pct: 55, temperature_breach: false, load_weight_kg: 2800, vehicle_capacity_kg: 3000, container_size_ft: 10, overload_pct: -6.7, load_status_detail: "NEAR_LIMIT", shipment_id: "SHP-2026-00425", cargo_condition: "SUSPECTED_DAMAGE", consignee: "ITC Limited", origin: "Chennai Port", promised_delivery_dt: "2026-02-26T14:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-CH-002", timestamp: Date.now() / 1000, latitude: 12.73, longitude: 77.83, fuel_consumed_liters: 2.4, speed_kmph: 61, route_id: "chennai_bangalore", co2_kg: 6.28, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.55, load_status: "LADEN", engine_temp_c: 90, tyre_pressure_psi: 38, cargo_type: "Auto Components", weather: "Clear", eta_hours: 1.2, eta_status: "ON_TIME", remaining_km: 73, order_id: "ORD-7847", customer: "Ashok Leyland", destination: "Hosur",
        temperature_c: 25.0, humidity_pct: 40, temperature_breach: false, load_weight_kg: 8900, vehicle_capacity_kg: 10000, container_size_ft: 20, overload_pct: -11, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00426", cargo_condition: "INTACT", consignee: "Ashok Leyland", origin: "Sriperumbudur", promised_delivery_dt: "2026-02-26T14:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-CH-003", timestamp: Date.now() / 1000, latitude: 12.50, longitude: 77.97, fuel_consumed_liters: 2.8, speed_kmph: 45, route_id: "chennai_bangalore", co2_kg: 7.33, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.38, load_status: "LADEN", engine_temp_c: 87, tyre_pressure_psi: 39, cargo_type: "Pharma", weather: "Fog", eta_hours: 0.9, eta_status: "ON_TIME", remaining_km: 40, order_id: "ORD-7848", customer: "Cipla Ltd", destination: "Electronic City",
        temperature_c: 11.4, humidity_pct: 35, temperature_breach: true, load_weight_kg: 8200, vehicle_capacity_kg: 10000, container_size_ft: 20, overload_pct: -18, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00427", cargo_condition: "INTACT", consignee: "Cipla Ltd", origin: "Ambattur", promised_delivery_dt: "2026-02-26T14:00:00Z", traffic_congestion: "MODERATE", weather_severity: "FOG", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-KL-001", timestamp: Date.now() / 1000, latitude: 24.80, longitude: 84.99, fuel_consumed_liters: 3.5, speed_kmph: 58, route_id: "kolkata_patna", co2_kg: 9.16, status: "WARNING", deviation_status: "OK", co2_saved_kg: 0.22, load_status: "LADEN", engine_temp_c: 95, tyre_pressure_psi: 37, cargo_type: "Steel Coils", weather: "Clear", eta_hours: 3.1, eta_status: "AT_RISK", remaining_km: 180, order_id: "ORD-7849", customer: "Tata Steel", destination: "Patna Warehousing",
        temperature_c: 33.5, humidity_pct: 50, temperature_breach: false, load_weight_kg: 24500, vehicle_capacity_kg: 26500, container_size_ft: 40, overload_pct: -7.5, load_status_detail: "NEAR_LIMIT", shipment_id: "SHP-2026-00428", cargo_condition: "INTACT", consignee: "Tata Steel", origin: "Kolkata Dock", promised_delivery_dt: "2026-02-26T16:00:00Z", traffic_congestion: "HIGH", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-KL-002", timestamp: Date.now() / 1000, latitude: 24.10, longitude: 85.40, fuel_consumed_liters: 3.0, speed_kmph: 64, route_id: "kolkata_patna", co2_kg: 7.85, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.48, load_status: "LADEN", engine_temp_c: 92, tyre_pressure_psi: 38, cargo_type: "Cement", weather: "Clear", eta_hours: 2.5, eta_status: "ON_TIME", remaining_km: 160, order_id: "ORD-7850", customer: "UltraTech", destination: "Gaya",
        temperature_c: 29.8, humidity_pct: 40, temperature_breach: false, load_weight_kg: 19500, vehicle_capacity_kg: 26500, container_size_ft: 40, overload_pct: -26.4, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00429", cargo_condition: "INTACT", consignee: "UltraTech", origin: "Howrah", promised_delivery_dt: "2026-02-26T16:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },

    {
        vehicle_id: "TRK-KL-003", timestamp: Date.now() / 1000, latitude: 25.10, longitude: 85.14, fuel_consumed_liters: 2.7, speed_kmph: 52, route_id: "kolkata_patna", co2_kg: 7.07, status: "NORMAL", deviation_status: "OK", co2_saved_kg: 0.58, load_status: "LADEN", engine_temp_c: 89, tyre_pressure_psi: 39, cargo_type: "Consumer Goods", weather: "Clear", eta_hours: 1.5, eta_status: "ON_TIME", remaining_km: 78, order_id: "ORD-7851", customer: "Flipkart", destination: "Patna City",
        temperature_c: 27.5, humidity_pct: 55, temperature_breach: false, load_weight_kg: 12000, vehicle_capacity_kg: 26500, container_size_ft: 40, overload_pct: -54.7, load_status_detail: "WITHIN_LIMIT", shipment_id: "SHP-2026-00430", cargo_condition: "INTACT", consignee: "Flipkart", origin: "Salt Lake", promised_delivery_dt: "2026-02-26T16:00:00Z", traffic_congestion: "LOW", weather_severity: "CLEAR", route_deviation_km: 0, unauthorized_stop_minutes: 0, accident_flag: false, fine_risk: "NONE"
    },
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
    promised_eta: v.promised_delivery_dt,
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
