"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { VehicleEvent } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

interface Props {
    vehicles: VehicleEvent[];
}

function statusColor(status: VehicleEvent["status"]): string {
    if (status === "HIGH_EMISSION_ALERT") return "#ff4444";
    if (status === "WARNING") return "#ffa500";
    return "#00ff87";
}

function makeIcon(color: string, isPulsing: boolean) {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const pulse = isPulsing
        ? `box-shadow: 0 0 0 0 ${color}; animation: pulse-ring 1.5s ease-out infinite;`
        : "";
    return L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;${pulse}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

export default function FleetMap({ vehicles }: Props) {
    return (
        <div style={{ height: "100%", width: "100%", borderRadius: 8, overflow: "hidden" }}>
            <MapContainer
                center={[22.0, 80.0]}
                zoom={5}
                style={{ height: "100%", width: "100%", background: "#0d1117" }}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_matter_nolabels/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CartoDB"
                />
                {vehicles.map((v) => {
                    const color = statusColor(v.status);
                    const isPulsing = v.status === "HIGH_EMISSION_ALERT";
                    const icon = makeIcon(color, isPulsing);
                    return (
                        <Marker key={v.vehicle_id} position={[v.latitude, v.longitude]} icon={icon}>
                            <Popup>
                                <div style={{ color: "#e6edf3", background: "#161b22", padding: 8, borderRadius: 6, minWidth: 160 }}>
                                    <strong style={{ color }}>{v.vehicle_id}</strong>
                                    <div>Route: {v.route_id.replace(/_/g, "–")}</div>
                                    <div>CO₂: <strong>{v.co2_kg?.toFixed(2)} kg</strong></div>
                                    <div>Speed: {v.speed_kmph?.toFixed(1)} km/h</div>
                                    <div>Status: <span style={{ color }}>{v.status}</span></div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
