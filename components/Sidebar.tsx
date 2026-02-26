"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFleet } from "@/lib/FleetContext";

const NAV_ITEMS = [
    { icon: "🌿", label: "Overview", href: "/overview" },
    { icon: "📦", label: "Shipments", href: "/shipments" },
    { icon: "🚛", label: "Fleet List", href: "/fleet" },
    { icon: "📊", label: "Analytics", href: "/analytics" },
    { icon: "🚨", label: "Alert Center", href: "/alerts", badge: true },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { stats, setChatOpen } = useFleet();
    const [expanded, setExpanded] = useState(false);
    const w = expanded ? 200 : 64;

    return (
        <nav
            style={{
                width: w,
                minWidth: w,
                height: "100vh",
                background: "#0d1421",
                borderRight: "1px solid #1e293b",
                display: "flex",
                flexDirection: "column",
                transition: "width 0.2s ease",
                position: "fixed",
                left: 0,
                top: 0,
                zIndex: 100,
                overflow: "hidden",
            }}
        >
            {/* Toggle */}
            <button
                onClick={() => setExpanded(e => !e)}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "18px 0", width: "100%",
                    color: "#8b949e", fontSize: "1.1rem",
                }}
                title={expanded ? "Collapse" : "Expand"}
            >
                {expanded ? "✕" : "☰"}
            </button>

            {/* Nav links */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 6px" }}>
                {NAV_ITEMS.map(item => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 12px",
                                borderRadius: 8,
                                textDecoration: "none",
                                color: active ? "#00ff87" : "#8b949e",
                                background: active ? "#00ff8712" : "transparent",
                                borderLeft: active ? "3px solid #00ff87" : "3px solid transparent",
                                fontSize: "0.82rem",
                                fontWeight: active ? 600 : 400,
                                transition: "all 0.15s ease",
                                position: "relative",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <span style={{ fontSize: "1.1rem", minWidth: 24, textAlign: "center" }}>{item.icon}</span>
                            {expanded && <span>{item.label}</span>}
                            {item.badge && stats.alertCount > 0 && (
                                <span style={{
                                    position: expanded ? "relative" : "absolute",
                                    top: expanded ? "auto" : 4,
                                    right: expanded ? "auto" : 6,
                                    marginLeft: expanded ? "auto" : 0,
                                    background: "#ef4444",
                                    color: "#fff",
                                    borderRadius: 10,
                                    padding: "1px 6px",
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    minWidth: 16,
                                    textAlign: "center",
                                }}>
                                    {stats.alertCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom: GreenAI + Settings */}
            <div style={{ padding: "0 6px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                    onClick={() => setChatOpen(true)}
                    style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 8,
                        background: "none", border: "none",
                        color: "#8b949e", fontSize: "0.82rem",
                        cursor: "pointer", textAlign: "left",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                    }}
                >
                    <span style={{ fontSize: "1.1rem", minWidth: 24, textAlign: "center" }}>💬</span>
                    {expanded && <span>GreenAI</span>}
                </button>
            </div>
        </nav>
    );
}
