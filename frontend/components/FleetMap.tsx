"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { VehicleEvent } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

const ROUTE_CORRIDORS: Record<string, [number, number][]> = {
    delhi_mumbai: [[28.6139, 77.2090], [27.1767, 78.0081], [25.4358, 81.8464], [23.1765, 79.9864], [22.3072, 73.1812], [19.0760, 72.8777]],
    chennai_bangalore: [[13.0827, 80.2707], [12.9716, 79.1586], [12.8406, 78.1148], [12.9716, 77.5946]],
    kolkata_patna: [[22.5726, 88.3639], [23.5204, 87.3119], [24.7914, 85.0002], [25.5941, 85.1376]],
};

const ROUTE_COLORS: Record<string, string> = {
    delhi_mumbai: "#00ff87",
    chennai_bangalore: "#00ccff",
    kolkata_patna: "#fbbf24",
};

interface Props {
    vehicles: VehicleEvent[];
}

function statusColor(status: VehicleEvent["status"]): string {
    if (status === "HIGH_EMISSION_ALERT") return "#ef4444";
    if (status === "WARNING") return "#f59e0b";
    return "#00ff87";
}

function makeIcon(color: string, isPulsing: boolean) {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const pulse = isPulsing ? `animation: pulse-red 1.5s ease-out infinite;` : "";
    return L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};
            border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 8px ${color}44;${pulse}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

export default function FleetMap({ vehicles }: Props) {
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }, []);

    return (
        <div style={{ height: "100%", width: "100%", borderRadius: 8, overflow: "hidden", position: "relative", background: "#0a0f1a" }}>
            <MapContainer
                ref={mapRef}
                center={[22.0, 82.0]}
                zoom={5}
                style={{ height: "100%", width: "100%", background: "#0a0f1a" }}
                attributionControl={false}
            >
                {/* FIXED: correct tile URL — dark_matter (not dark_matter_nolabels) */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CartoDB"
                />

                {/* Route glow */}
                {Object.entries(ROUTE_CORRIDORS).map(([routeId, pts]) => (
                    <Polyline key={`glow-${routeId}`} positions={pts}
                        pathOptions={{ color: ROUTE_COLORS[routeId] ?? "#00ff87", weight: 10, opacity: 0.08 }} />
                ))}

                {/* Route line */}
                {Object.entries(ROUTE_CORRIDORS).map(([routeId, pts]) => (
                    <Polyline key={`line-${routeId}`} positions={pts}
                        pathOptions={{ color: ROUTE_COLORS[routeId] ?? "#00ff87", weight: 2.5, opacity: 0.45 }} />
                ))}

                {/* Truck markers */}
                {vehicles.map(v => {
                    const color = statusColor(v.status);
                    const isAlert = v.status === "HIGH_EMISSION_ALERT";
                    const icon = makeIcon(color, isAlert);
                    return (
                        <Marker key={v.vehicle_id} position={[v.latitude, v.longitude]} icon={icon}>
                            <Popup>
                                <div style={{ color: "#f0f6fc", background: "#0d1421", padding: 10, borderRadius: 8, minWidth: 160, fontSize: "0.8rem", border: "1px solid #1e293b" }}>
                                    <strong style={{ color }}>{v.vehicle_id}</strong>
                                    <div style={{ color: "#8b949e", fontSize: "0.72rem" }}>{v.route_id.replace(/_/g, " → ")}</div>
                                    <div>CO₂: <strong>{v.co2_kg?.toFixed(2)} kg</strong></div>
                                    <div>Speed: {v.speed_kmph?.toFixed(1)} km/h</div>
                                    <div style={{ marginTop: 4, color, fontWeight: 600 }}>{v.status.replace(/_/g, " ")}</div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Empty state */}
            {vehicles.length === 0 && (
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "rgba(10,15,26,0.8)", zIndex: 1000,
                    gap: 10, pointerEvents: "none",
                }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00ff87", animation: "pulse-ring 1.5s ease-out infinite" }} />
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>Waiting for telemetry…</span>
                </div>
            )}
        </div>
    );
}
