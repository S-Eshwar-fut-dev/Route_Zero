"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Search, Bell, TriangleAlert } from "lucide-react";
import { useFleet } from "@/lib/FleetContext";

export default function AppShell({ children }: { children: ReactNode }) {
    const { stats } = useFleet();
    const pathname = usePathname();

    const NAV_ITEMS = [
        { label: "Dashboard", href: "/overview" },
        { label: "Fleet", href: "/fleet" },
        { label: "Emissions", href: "/analytics" },
        { label: "Reports", href: "/shipments" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0F172A" }}>
            {/* Top Navbar */}
            <header style={{
                height: 64,
                borderBottom: "1px solid #1e293b",
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                background: "#0F172A",
                gap: 32,
            }}>
                {/* Logo & Branding */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#10B981", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Leaf size={20} color="#0F172A" strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", display: "flex", gap: 6 }}>
                        <span>GreenPulse</span>
                        <span style={{ color: "#8b949e", fontWeight: 400 }}>Enterprise</span>
                    </div>
                </div>

                {/* Nav Tabs */}
                <nav style={{ display: "flex", gap: 8, height: "100%", alignItems: "center" }}>
                    {NAV_ITEMS.map(item => {
                        const active = pathname.startsWith(item.href) || (item.href === "/overview" && pathname === "/");
                        return (
                            <Link key={item.href} href={item.href} style={{
                                color: active ? "#10B981" : "#8b949e",
                                textDecoration: "none",
                                fontSize: "0.85rem",
                                fontWeight: active ? 600 : 500,
                                padding: "8px 16px",
                                background: active ? "rgba(16, 185, 129, 0.1)" : "transparent",
                                borderRadius: 6,
                                transition: "all 0.2s ease"
                            }}>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Search Bar */}
                <div style={{ flex: 1, display: "flex", justifyContent: "center", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                    <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center" }}>
                        <Search size={16} color="#4b5563" style={{ position: "absolute", left: 12 }} />
                        <input
                            placeholder="Search shipments, IDs..."
                            style={{
                                width: "100%", background: "#1a2332", border: "1px solid #1e293b",
                                borderRadius: 8, padding: "8px 12px 8px 36px", color: "#f0f6fc",
                                fontSize: "0.85rem", outline: "none", transition: "border 0.2s"
                            }}
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <button style={{
                        background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444", padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem",
                        fontWeight: 600, display: "flex", alignItems: "center", gap: 8, cursor: "pointer"
                    }}>
                        <TriangleAlert size={16} /> Trigger Spike Alert
                    </button>

                    <div style={{ position: "relative", cursor: "pointer" }}>
                        <Bell size={20} color="#8b949e" />
                        {stats.alertCount > 0 && (
                            <span style={{
                                position: "absolute", top: -2, right: -4,
                                background: "#10B981", width: 8, height: 8, borderRadius: "50%",
                                border: "2px solid #0F172A"
                            }} />
                        )}
                    </div>

                    <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "#1e293b", border: "2px solid #10B981",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden"
                    }}>
                        <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Felix" alt="User" style={{ width: "100%", height: "100%" }} />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                {children}
            </main>
        </div>
    );
}
