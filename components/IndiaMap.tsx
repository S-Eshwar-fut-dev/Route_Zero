"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useMemo } from "react";
import type { VehicleEvent } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

/* ── Route corridors matching backend exactly ── */
const ROUTE_CORRIDORS: Record<string, [number, number][]> = {
    delhi_mumbai: [
        [28.6139, 77.2090], [27.1767, 78.0081], [25.4358, 81.8464],
        [23.1765, 79.9864], [22.3072, 73.1812], [19.0760, 72.8777],
    ],
    chennai_bangalore: [
        [13.0827, 80.2707], [12.9716, 79.1586],
        [12.8406, 78.1148], [12.9716, 77.5946],
    ],
    kolkata_patna: [
        [22.5726, 88.3639], [23.5204, 87.3119],
        [24.7914, 85.0002], [25.5941, 85.1376],
    ],
};

/* ── Per-route colors ── */
const ROUTE_COLORS: Record<string, string> = {
    delhi_mumbai: "#00ff87",
    chennai_bangalore: "#00ccff",
    kolkata_patna: "#fbbf24",
};

const ROUTE_LABELS: Record<string, string> = {
    delhi_mumbai: "Delhi – Mumbai (NH48)",
    chennai_bangalore: "Chennai – Bangalore (NH48)",
    kolkata_patna: "Kolkata – Patna (NH19)",
};

/* ── Ghost path: remaining waypoints from current position ── */
function getRemainingWaypoints(
    lat: number, lon: number, corridor: [number, number][]
): [number, number][] {
    let nearestIdx = 0;
    let minDist = Infinity;
    corridor.forEach(([wlat, wlon], i) => {
        const d = Math.sqrt((lat - wlat) ** 2 + (lon - wlon) ** 2);
        if (d < minDist) { minDist = d; nearestIdx = i; }
    });
    return [[lat, lon], ...corridor.slice(nearestIdx + 1)];
}

interface Props {
    vehicles: VehicleEvent[];
    onVehicleClick?: (id: string) => void;
    selectedVehicleId?: string | null;
    singleRoute?: string;
    singleVehicle?: boolean;
    height?: string;
}

function getMarkerState(v: VehicleEvent, anomalies: any[]) {
    // Check if this vehicle has any active anomalies
    const vehicleAnomalies = anomalies.filter(a => a.vehicle_id === v.vehicle_id);

    let color = "#00ff87"; // Default Normal
    let isAlert = false;
    let pulseType = "";

    if (vehicleAnomalies.length > 0) {
        // Prioritize critical over warning
        const criticals = vehicleAnomalies.filter(a => a.severity === "CRITICAL");
        const warnings = vehicleAnomalies.filter(a => a.severity === "WARNING");

        isAlert = true;

        if (criticals.some(a => a.type === "TEMPERATURE_BREACH")) {
            color = "#00d4ff"; // Blue for cold chain
            pulseType = "pulse-blue";
        } else if (criticals.length > 0) {
            color = "#ef4444"; // Red for other criticals
            pulseType = "pulse-red";
        } else if (warnings.length > 0) {
            color = "#f59e0b"; // Orange for warnings
            pulseType = "pulse-orange";
        }
    }

    return { color, isAlert, pulseType };
}

function etaStatusColor(eta?: string) {
    if (eta === "DELAYED") return "#ef4444";
    if (eta === "AT_RISK") return "#f59e0b";
    return "#00ff87";
}

function makeIcon(color: string, isAlert: boolean, pulseType: string, etaStatus?: string) {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const pulse = isAlert ? `animation: ${pulseType || "pulse-red"} 1.5s ease-out infinite;` : "";

    const delayBadge = etaStatus === "DELAYED"
        ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);
            background:#ef4444;color:white;font-size:8px;font-weight:700;
            padding:1px 5px;border-radius:4px;white-space:nowrap;">DELAYED</div>`
        : "";

    return L.divIcon({
        className: "",
        html: `<div style="position:relative;">
            ${delayBadge}
            <div style="width:16px;height:16px;border-radius:50%;background:${color};
                border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 8px ${color}44;${pulse}"></div>
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

import { useFleet } from "@/lib/FleetContext";

export default function IndiaMap({
    vehicles, onVehicleClick, selectedVehicleId,
    singleRoute, singleVehicle, height = "100%",
}: Props) {
    const mapRef = useRef<any>(null);
    const { anomalies } = useFleet();

    useEffect(() => {
        if (mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 150);
    }, []);

    const routes = singleRoute
        ? { [singleRoute]: ROUTE_CORRIDORS[singleRoute] || [] }
        : ROUTE_CORRIDORS;

    const center: [number, number] = singleVehicle && vehicles.length === 1
        ? [vehicles[0].latitude, vehicles[0].longitude]
        : [22.0, 82.0];
    const zoom = singleVehicle ? 7 : 5;

    /* ── Ghost paths: dashed lines from each vehicle to destination ── */
    const ghostPaths = useMemo(() => {
        if (singleVehicle) return [];
        return vehicles
            .map(v => {
                const corridor = ROUTE_CORRIDORS[v.route_id];
                if (!corridor) return null;
                const remaining = getRemainingWaypoints(v.latitude, v.longitude, corridor);
                if (remaining.length < 2) return null;
                const ghostColor = v.eta_status === "DELAYED"
                    ? "#ef4444"
                    : (ROUTE_COLORS[v.route_id] ?? "#00ff87");
                return { id: v.vehicle_id, positions: remaining, color: ghostColor };
            })
            .filter(Boolean) as { id: string; positions: [number, number][]; color: string }[];
    }, [vehicles, singleVehicle]);

    return (
        <div style={{ height, width: "100%", borderRadius: 14, overflow: "hidden", position: "relative", background: "#0a0f1a" }}>
            <MapContainer
                ref={mapRef}
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%", background: "#0a0f1a" }}
                attributionControl={false}
            >
                {/* FIXED: correct dark_matter tile URL (no _nolabels suffix) */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CartoDB"
                />

                {/* Route glow (wider, dimmer) — per-route color */}
                {Object.entries(routes).filter(([, pts]) => pts?.length).map(([routeId, pts]) => (
                    <Polyline key={`glow-${routeId}`} positions={pts}
                        pathOptions={{ color: ROUTE_COLORS[routeId] ?? "#00ff87", weight: 10, opacity: 0.08 }} />
                ))}

                {/* Route line (thin, solid) — per-route color */}
                {Object.entries(routes).filter(([, pts]) => pts?.length).map(([routeId, pts]) => (
                    <Polyline key={`line-${routeId}`} positions={pts}
                        pathOptions={{ color: ROUTE_COLORS[routeId] ?? "#00ff87", weight: 2.5, opacity: 0.45 }} />
                ))}

                {/* Ghost paths: dashed predicted remaining route per vehicle */}
                {ghostPaths.map(gp => (
                    <Polyline key={`ghost-${gp.id}`} positions={gp.positions}
                        pathOptions={{ color: gp.color, weight: 1.5, opacity: 0.35, dashArray: "6, 8" }} />
                ))}

                {/* Truck markers */}
                {vehicles.map(v => {
                    const { color, isAlert, pulseType } = getMarkerState(v, anomalies);
                    const icon = makeIcon(color, isAlert, pulseType, v.eta_status);
                    const etaLine = v.eta_hours != null && v.eta_hours < 99
                        ? `<div>ETA: <strong>${v.eta_hours.toFixed?.(1) ?? v.eta_hours}h</strong>
                           <span style="color:${etaStatusColor(v.eta_status)}">${v.eta_status ?? ""}</span></div>`
                        : "";
                    const customerLine = v.customer ? `<div style="color:#8b949e;font-size:11px;">→ ${v.customer}</div>` : "";

                    // Anomalies for tooltip
                    const vAnomalies = anomalies.filter(a => a.vehicle_id === v.vehicle_id);

                    return (
                        <Marker
                            key={v.vehicle_id}
                            position={[v.latitude, v.longitude]}
                            icon={icon}
                            eventHandlers={{ click: () => onVehicleClick?.(v.vehicle_id) }}
                        >
                            <Popup>
                                <div style={{
                                    color: "#f0f6fc", background: "#0d1421",
                                    padding: "10px 14px", borderRadius: 8,
                                    minWidth: 200, fontSize: "0.8rem",
                                    border: "1px solid #1e293b",
                                }}>
                                    <strong style={{ color, fontSize: "0.85rem" }}>{v.vehicle_id}</strong>
                                    <div style={{ color: "#8b949e", fontSize: "0.72rem", marginBottom: 6 }}>
                                        {v.route_id.replace(/_/g, " → ")}
                                    </div>
                                    <div style={{ paddingBottom: 6, borderBottom: "1px solid #1e293b", marginBottom: 6 }}>
                                        <div>Cargo: <strong>{v.cargo_type}</strong></div>
                                        {v.temperature_c !== undefined && (
                                            <div>Temp: <strong style={{ color: v.temperature_breach ? "#00d4ff" : "inherit" }}>{v.temperature_c}°C</strong></div>
                                        )}
                                        {v.overload_pct !== undefined && v.overload_pct > 0 && (
                                            <div>Load: <strong style={{ color: "#ef4444" }}>OVERLOADED (+{v.overload_pct}%)</strong></div>
                                        )}
                                        {v.overload_pct !== undefined && v.overload_pct <= 0 && (
                                            <div>Load: <strong>OK</strong></div>
                                        )}
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: etaLine }} />
                                    <div dangerouslySetInnerHTML={{ __html: customerLine }} />

                                    {vAnomalies.length > 0 ? (
                                        <div style={{ marginTop: 6, color, fontWeight: 600, fontSize: "0.72rem", display: "flex", flexDirection: "column", gap: 2 }}>
                                            {vAnomalies.slice(0, 2).map(a => (
                                                <span key={a.id}>⚠ {a.type.replace(/_/g, " ")}</span>
                                            ))}
                                            {vAnomalies.length > 2 && <span style={{ color: "#8b949e", fontSize: "0.6rem" }}>+{vAnomalies.length - 2} more issues</span>}
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: 6, color: "#00ff87", fontWeight: 600, fontSize: "0.72rem" }}>
                                            ALL CLEAR
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Empty state overlay */}
            {vehicles.length === 0 && (
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(10,15,26,0.8)",
                    zIndex: 1000, gap: 10, pointerEvents: "none",
                }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00ff87", animation: "pulse-ring 1.5s ease-out infinite" }} />
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>Waiting for telemetry…</span>
                </div>
            )}

            {/* Bottom-left: Condition Legend */}
            {!singleVehicle && (
                <div style={{
                    position: "absolute", bottom: 12, left: 12, zIndex: 1000,
                    background: "rgba(13,20,33,0.9)", border: "1px solid #1e293b",
                    borderRadius: 8, padding: "8px 12px", pointerEvents: "none",
                }}>
                    <div style={{ color: "#8b949e", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                        Condition Legend
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.65rem", color: "#f0f6fc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00ff87" }} /> Normal</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} /> Warning</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} /> Critical</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00d4ff" }} /> SLA Breach (Colchain)</div>
                    </div>
                </div>
            )}

            {/* Top-right: Route legend */}
            {!singleVehicle && (
                <div style={{
                    position: "absolute", top: 12, right: 12, zIndex: 1000,
                    background: "rgba(13,20,33,0.9)", border: "1px solid #1e293b",
                    borderRadius: 8, padding: "8px 12px", pointerEvents: "none",
                }}>
                    {Object.entries(ROUTE_COLORS).map(([route, color]) => (
                        <div key={route} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: "0.62rem" }}>
                            <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
                            <span style={{ color: "#8b949e" }}>{ROUTE_LABELS[route] ?? route}</span>
                        </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, paddingTop: 5, borderTop: "1px solid #1e293b", fontSize: "0.6rem" }}>
                        <div style={{ width: 16, borderTop: "2px dashed #8b949e" }} />
                        <span style={{ color: "#4b5563" }}>Predicted path</span>
                    </div>
                </div>
            )}
        </div>
    );
}
