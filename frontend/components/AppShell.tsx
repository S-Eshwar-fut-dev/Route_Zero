"use client";

import Sidebar from "@/components/Sidebar";
import { useFleet } from "@/lib/FleetContext";
import { type ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
    const { stats } = useFleet();

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#0a0f1a" }}>
            <Sidebar />

            {/* Content area offset by sidebar */}
            <div style={{ marginLeft: 64, flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <header style={{
                    height: 52,
                    borderBottom: "1px solid #1e293b",
                    padding: "0 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#0d1421",
                }}>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#00ff87", letterSpacing: "-0.01em" }}>🌿 GreenPulse</span>
                    <span style={{ color: "#4b5563", fontSize: "0.78rem" }}>Carbon Intelligence Platform</span>

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
                        {/* Notification bell */}
                        <div style={{ position: "relative", cursor: "pointer" }}>
                            <span style={{ fontSize: "1rem" }}>🔔</span>
                            {stats.alertCount > 0 && (
                                <span style={{
                                    position: "absolute", top: -4, right: -6,
                                    background: "#ef4444", color: "#fff",
                                    borderRadius: 10, padding: "0px 5px",
                                    fontSize: "0.58rem", fontWeight: 700,
                                }}>
                                    {stats.alertCount}
                                </span>
                            )}
                        </div>

                        {/* LIVE indicator */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="live-dot" style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: "#00ff87", display: "inline-block",
                                boxShadow: "0 0 6px #00ff87",
                            }} />
                            <span style={{ color: "#00ff87", fontSize: "0.7rem", fontWeight: 600 }}>LIVE</span>
                        </div>

                        {/* Avatar placeholder */}
                        <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: "#1e293b", border: "1px solid #4b5563",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.7rem", color: "#8b949e",
                        }}>
                            FM
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, overflow: "auto" }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
