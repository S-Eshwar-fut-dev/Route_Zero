"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { fetchFleet, fetchFleetIntel } from "@/lib/api";
import type { VehicleEvent, AnomalyEntry, ETAEntry } from "@/lib/types";

/* ── Driver names ── */
const DRIVER_NAMES: Record<string, string> = {
    "TRK-DL-001": "Ramesh Kumar",
    "TRK-DL-002": "Suresh Patel",
    "TRK-DL-003": "Mahesh Singh",
    "TRK-DL-004": "Dinesh Verma",
    "TRK-CH-001": "Karthik Rajan",
    "TRK-CH-002": "Venkat Naidu",
    "TRK-CH-003": "Jarnail Kanna",
    "TRK-KL-001": "Debashis Roy",
    "TRK-KL-002": "Pranab Das",
    "TRK-KL-003": "Sanjay Ghosh",
};

export function driverName(id: string): string {
    return DRIVER_NAMES[id] ?? "Unknown Driver";
}

/* ── Fleet stats derived ── */
export interface FleetStats {
    totalCo2: number;
    totalSaved: number;
    totalFuel: number;
    alertCount: number;
    deviationCount: number;
    avgEfficiency: number;
    vehicleCount: number;
    onTimeCount: number;
    delayedCount: number;
    atRiskCount: number;
}

function deriveStats(vehicles: VehicleEvent[]): FleetStats {
    const totalCo2 = vehicles.reduce((s, v) => s + (v.co2_kg ?? 0), 0);
    const totalSaved = vehicles.reduce((s, v) => s + (v.co2_saved_kg ?? 0), 0);
    const totalFuel = vehicles.reduce((s, v) => s + (v.fuel_consumed_liters ?? 0), 0);
    const alertCount = vehicles.filter(v => v.status === "HIGH_EMISSION_ALERT").length;
    const deviationCount = vehicles.filter(v => v.deviation_status && !v.deviation_status.startsWith("OK")).length;
    const efficiencies = vehicles.map(v => v.fuel_consumed_liters > 0 ? (v.speed_kmph * (2 / 60)) / v.fuel_consumed_liters : 0);
    const avgEfficiency = efficiencies.length ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length : 0;
    const onTimeCount = vehicles.filter(v => v.eta_status === "ON_TIME").length;
    const delayedCount = vehicles.filter(v => v.eta_status === "DELAYED").length;
    const atRiskCount = vehicles.filter(v => v.eta_status === "AT_RISK").length;
    return { totalCo2, totalSaved, totalFuel, alertCount, deviationCount, avgEfficiency, vehicleCount: vehicles.length, onTimeCount, delayedCount, atRiskCount };
}

/* ── Context ── */
interface FleetContextType {
    vehicles: VehicleEvent[];
    vehicleHistory: Map<string, VehicleEvent[]>;
    anomalies: AnomalyEntry[];
    resolvedAnomalies: AnomalyEntry[];
    stats: FleetStats;
    resolveAnomaly: (id: string) => void;
    selectedVehicleId: string | null;
    setSelectedVehicleId: (id: string | null) => void;
    chatOpen: boolean;
    setChatOpen: (open: boolean) => void;
    etaVehicles: ETAEntry[];
}

const FleetContext = createContext<FleetContextType | null>(null);

export function useFleet() {
    const ctx = useContext(FleetContext);
    if (!ctx) throw new Error("useFleet must be within FleetProvider");
    return ctx;
}

const MAX_HISTORY = 720; // 24hrs at 2s intervals
const MAX_ANOMALIES = 25;

export function FleetProvider({ children }: { children: ReactNode }) {
    const [vehicles, setVehicles] = useState<VehicleEvent[]>([]);
    const [vehicleHistory, setVehicleHistory] = useState<Map<string, VehicleEvent[]>>(new Map());
    const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
    const [resolvedAnomalies, setResolvedAnomalies] = useState<AnomalyEntry[]>([]);
    const [stats, setStats] = useState<FleetStats>({ totalCo2: 0, totalSaved: 0, totalFuel: 0, alertCount: 0, deviationCount: 0, avgEfficiency: 0, vehicleCount: 0, onTimeCount: 0, delayedCount: 0, atRiskCount: 0 });
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [etaVehicles, setEtaVehicles] = useState<ETAEntry[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const poll = useCallback(async () => {
        // Try /fleet-intel first (merged fleet + ETA data)
        try {
            const intel = await fetchFleetIntel();
            if (intel.vehicles.length) {
                setVehicles(intel.vehicles as VehicleEvent[]);
                setStats(deriveStats(intel.vehicles as VehicleEvent[]));
                setEtaVehicles(intel.eta_vehicles ?? []);
                return processVehicles(intel.vehicles as VehicleEvent[]);
            }
        } catch { }
        // Fallback to /fleet
        const data = await fetchFleet();
        if (!data.length) return;
        setVehicles(data);
        setStats(deriveStats(data));
        processVehicles(data);
    }, []);

    const processVehicles = useCallback((data: VehicleEvent[]) => {

        // Accumulate history
        setVehicleHistory(prev => {
            const next = new Map(prev);
            for (const v of data) {
                const arr = next.get(v.vehicle_id) ?? [];
                arr.push(v);
                if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
                next.set(v.vehicle_id, arr);
            }
            return next;
        });

        // Derive anomalies
        const newAnomalies: AnomalyEntry[] = [];
        for (const v of data) {
            const ts = v.timestamp;
            const vid = v.vehicle_id;

            // 1. HIGH EMISSION
            if (v.status === "HIGH_EMISSION_ALERT") {
                newAnomalies.push({
                    id: `${vid}-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "HIGH_EMISSION_ALERT",
                    severity: "WARNING",
                    detail: `CO₂: ${v.co2_kg?.toFixed(2)} kg | Fuel: ${v.fuel_consumed_liters?.toFixed(2)} L`,
                    action_required: "Review route efficiency and driver behavior."
                });
            }

            // 2. ROUTE DEVIATION
            if (v.deviation_status && !v.deviation_status.startsWith("OK")) {
                const parts = v.deviation_status.split("|");
                newAnomalies.push({
                    id: `${vid}-dev-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "ROUTE_DEVIATION_ALERT",
                    severity: "WARNING",
                    detail: parts.slice(1).join(" | "),
                    action_required: "Contact driver to verify detour reason."
                });
            }

            // 3. TEMPERATURE BREACH (cold chain)
            if (v.temperature_breach && v.temperature_c !== undefined) {
                newAnomalies.push({
                    id: `${vid}-temp-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "TEMPERATURE_BREACH",
                    severity: "CRITICAL",
                    detail: `Cargo temp ${v.temperature_c}°C — outside SLA band. Risk: product spoilage / rejection.`,
                    action_required: "Notify driver to check refrigeration unit. Alert consignee."
                });
            }

            // 4. OVERLOAD VIOLATION
            if (v.overload_pct && v.overload_pct > 0) {
                newAnomalies.push({
                    id: `${vid}-overload-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "OVERLOAD_VIOLATION",
                    severity: v.overload_pct > 10 ? "CRITICAL" : "WARNING",
                    detail: `Load ${v.load_weight_kg}kg exceeds ${v.container_size_ft}ft capacity by ${v.overload_pct.toFixed(1)}%. Fine risk: ~₹8,000 (MV Act Sec 194).`,
                    action_required: "Halt at next weighbridge. Redistribute or offload cargo."
                });
            }

            // 5. ETA CRITICAL DELAY
            if (v.eta_status === "DELAYED") {
                newAnomalies.push({
                    id: `${vid}-delay-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "ETA_CRITICAL_DELAY",
                    severity: "CRITICAL",
                    detail: `Shipment ETA delayed by ${v.eta_hours?.toFixed(1)} hrs past promised delivery.`,
                    action_required: "Notify Consignee. Escalate to Logistics Manager."
                });
            }

            // 6. CARGO DAMAGE
            if (v.cargo_condition === "SUSPECTED_DAMAGE") {
                newAnomalies.push({
                    id: `${vid}-dmg-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "CARGO_DAMAGE_SUSPECTED",
                    severity: "WARNING",
                    detail: `Sensor telemetry suggests cargo shift or damage.`,
                    action_required: "Instruct driver to inspect cargo hold safely."
                });
            }

            // 7. ACCIDENT RISK
            if (v.weather_severity === "HEAVY_RAIN" && v.speed_kmph > 60) {
                newAnomalies.push({
                    id: `${vid}-acc-${ts}`, timestamp: ts, vehicle_id: vid,
                    type: "ACCIDENT_RISK",
                    severity: "CRITICAL",
                    detail: `High speed (${v.speed_kmph} km/h) in HEAVY_RAIN conditions.`,
                    action_required: "Issue immediate slow-down automated call to driver."
                });
            }
        }

        if (newAnomalies.length) {
            setAnomalies(prev => [...newAnomalies, ...prev].slice(0, MAX_ANOMALIES));
        }
    }, []);

    const resolveAnomaly = useCallback((id: string) => {
        setAnomalies(prev => {
            const item = prev.find(a => a.id === id);
            if (item) setResolvedAnomalies(rp => [{ ...item }, ...rp].slice(0, 50));
            return prev.filter(a => a.id !== id);
        });
    }, []);

    useEffect(() => {
        poll();
        intervalRef.current = setInterval(poll, 2000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [poll]);

    return (
        <FleetContext.Provider value={{ vehicles, vehicleHistory, anomalies, resolvedAnomalies, stats, resolveAnomaly, selectedVehicleId, setSelectedVehicleId, chatOpen, setChatOpen, etaVehicles }}>
            {children}
        </FleetContext.Provider>
    );
}
