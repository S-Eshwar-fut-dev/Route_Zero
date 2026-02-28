"use client";

import { useState, useEffect, useMemo } from "react";

interface Booking {
    booking_id: string;
    customer_name: string;
    origin: string;
    destination: string;
    status: string;
    freight: number;
    vehicle_id: string | null;
    total_weight: number;
    commodities: Array<{ name: string; weight_kg: number }>;
    created_at: string;
    expected_delivery: string;
    awb_number?: string;
    port_number?: string;
    rate_per_kg?: number;
    service_tax_pct?: number;
    sender_email?: string;
    receiver_name?: string;
    receiver_email?: string;
}

const COLUMNS = ["Pending", "Dispatched", "In-Transit", "Delivered"];
const STATUS_MAP: Record<string, string> = { "Pending": "pending", "Dispatched": "dispatched", "In-Transit": "in-transit", "Delivered": "delivered" };
const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", dispatched: "#00D4FF", "in-transit": "#10B981", delivered: "#8b949e" };

function downloadInvoice(b: Booking) {
    const invoiceWindow = window.open("", "_blank");
    if (!invoiceWindow) return;

    const commodityRows = (b.commodities || [])
        .map(c => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.name}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${c.weight_kg} KG</td></tr>`)
        .join("");

    const html = `<!DOCTYPE html>
<html><head><title>Invoice - ${b.booking_id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f8f9fa; padding:40px; color:#1e293b; }
  .invoice { max-width:700px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); padding:40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #10B981; padding-bottom:20px; }
  .brand { font-size:1.6rem; font-weight:800; color:#10B981; }
  .brand-sub { font-size:0.75rem; color:#8b949e; margin-top:4px; }
  .inv-id { text-align:right; }
  .inv-id h2 { font-size:1.1rem; color:#1e293b; }
  .inv-id p { font-size:0.8rem; color:#8b949e; }
  .section { margin-bottom:24px; }
  .section-title { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b949e; font-weight:700; margin-bottom:8px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .field label { font-size:0.72rem; color:#8b949e; display:block; margin-bottom:2px; }
  .field span { font-size:0.88rem; color:#1e293b; font-weight:500; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { background:#f1f5f9; padding:8px 12px; font-size:0.72rem; text-transform:uppercase; color:#8b949e; font-weight:700; text-align:left; }
  th:last-child { text-align:right; }
  .total-row { background:#f0fdf4; }
  .total-row td { padding:12px; font-weight:700; font-size:1.1rem; color:#10B981; }
  .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; text-align:center; font-size:0.72rem; color:#8b949e; }
  .status { display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; }
  @media print { body { background:#fff; padding:0; } .invoice { box-shadow:none; } .no-print { display:none; } }
</style></head><body>
<div class="invoice">
  <div class="header">
    <div><div class="brand">🚛 RouteZero</div><div class="brand-sub">Logistics Intelligence Platform</div></div>
    <div class="inv-id"><h2>FREIGHT INVOICE</h2><p>INV-${b.booking_id}</p><p>${new Date(b.created_at || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p></div>
  </div>
  <div class="section"><div class="section-title">Shipment Details</div>
    <div class="grid">
      <div class="field"><label>Booking ID</label><span>${b.booking_id}</span></div>
      <div class="field"><label>Status</label><span class="status" style="background:${STATUS_COLOR[b.status] || "#8b949e"}22;color:${STATUS_COLOR[b.status] || "#8b949e"}">${(b.status || "pending").toUpperCase()}</span></div>
      <div class="field"><label>Origin</label><span>${b.origin || "—"}</span></div>
      <div class="field"><label>Destination</label><span>${b.destination || "—"}</span></div>
      <div class="field"><label>Customer</label><span>${b.customer_name || "—"}</span></div>
      <div class="field"><label>Vehicle</label><span>${b.vehicle_id || "Unassigned"}</span></div>
      <div class="field"><label>Expected Delivery</label><span>${b.expected_delivery || "—"}</span></div>
      <div class="field"><label>AWB #</label><span>${b.awb_number || "—"}</span></div>
    </div>
  </div>
  <div class="section"><div class="section-title">Commodities</div>
    <table><thead><tr><th>Item</th><th style="text-align:right">Weight</th></tr></thead>
    <tbody>${commodityRows || '<tr><td colspan="2" style="padding:8px;color:#8b949e;">No commodities</td></tr>'}</tbody>
    </table>
  </div>
  <div class="section">
    <table>
      <tr><td style="padding:6px 12px;color:#8b949e;">Total Weight</td><td style="padding:6px 12px;text-align:right;">${b.total_weight || 0} KG</td></tr>
      <tr><td style="padding:6px 12px;color:#8b949e;">Rate per KG</td><td style="padding:6px 12px;text-align:right;">₹${b.rate_per_kg || 20}</td></tr>
      <tr><td style="padding:6px 12px;color:#8b949e;">Service Tax</td><td style="padding:6px 12px;text-align:right;">${b.service_tax_pct || 12.5}%</td></tr>
      <tr class="total-row"><td style="border-top:2px solid #10B981;">FREIGHT TOTAL</td><td style="border-top:2px solid #10B981;text-align:right;">₹${(b.freight || 0).toFixed(2)}</td></tr>
    </table>
  </div>
  <div class="footer">
    <p>This is a computer-generated invoice from RouteZero Logistics Platform.</p>
    <p style="margin-top:4px;">For queries, contact: support@routezero.in</p>
    <button class="no-print" onclick="window.print()" style="margin-top:16px;background:#10B981;color:#fff;border:none;padding:10px 32px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;">🖨 Print / Save PDF</button>
  </div>
</div></body></html>`;

    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
}

export default function LogisticsPage() {
    const [tab, setTab] = useState<"kanban" | "compliance">("kanban");
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        async function fetchBookings() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${apiUrl}/api/bookings`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        setBookings(data.data);
                        return;
                    }
                }
            } catch {
                // fall through to demo data
            }
            // Demo fallback
            setBookings([
                { booking_id: "BK-00000001", customer_name: "Tata Motors", origin: "Delhi", destination: "Mumbai", status: "pending", freight: 1650, vehicle_id: null, total_weight: 75, commodities: [{ name: "Auto Parts", weight_kg: 45 }], created_at: "2026-02-28T10:00:00", expected_delivery: "2026-03-02", awb_number: "AWB-98234512", port_number: "INDEL-7" },
                { booking_id: "BK-00000002", customer_name: "Infosys Ltd", origin: "Chennai", destination: "Bangalore", status: "dispatched", vehicle_id: "TRK-CB-005", freight: 920, total_weight: 42, commodities: [{ name: "IT Equipment", weight_kg: 42 }], created_at: "2026-02-28T09:30:00", expected_delivery: "2026-03-01", awb_number: "AWB-71839204", port_number: "INMAA-3" },
                { booking_id: "BK-00000003", customer_name: "Reliance Fresh", origin: "Kolkata", destination: "Patna", status: "in-transit", vehicle_id: "TRK-KP-009", freight: 2200, total_weight: 100, commodities: [{ name: "Fresh Produce", weight_kg: 60 }, { name: "Dairy Products", weight_kg: 40 }], created_at: "2026-02-28T08:00:00", expected_delivery: "2026-03-01", awb_number: "AWB-55291038", port_number: "INCCU-5" },
                { booking_id: "BK-00000004", customer_name: "Apollo Hospitals", origin: "Chennai", destination: "Bangalore", status: "delivered", vehicle_id: "TRK-CB-006", freight: 540, total_weight: 24, commodities: [{ name: "Medical Supplies", weight_kg: 24 }], created_at: "2026-02-27T14:00:00", expected_delivery: "2026-02-27", awb_number: "AWB-33810294", port_number: "INMAA-1" },
                { booking_id: "BK-00000005", customer_name: "Amazon India", origin: "Delhi", destination: "Mumbai", status: "pending", freight: 3300, vehicle_id: null, total_weight: 150, commodities: [{ name: "Consumer Electronics", weight_kg: 80 }, { name: "Books", weight_kg: 30 }, { name: "Clothing", weight_kg: 40 }], created_at: "2026-02-28T11:00:00", expected_delivery: "2026-03-05", awb_number: "AWB-44920183", port_number: "INDEL-2" },
            ]);
        }
        fetchBookings();
    }, []);

    const grouped = useMemo(() => {
        const groups: Record<string, Booking[]> = {};
        for (const col of COLUMNS) groups[col] = [];
        for (const b of bookings) {
            const col = COLUMNS.find(c => STATUS_MAP[c] === b.status);
            if (col) groups[col].push(b);
        }
        return groups;
    }, [bookings]);

    return (
        <div style={{ padding: "24px 32px", overflowY: "auto", height: "calc(100vh - 64px)" }}>
            <h1 style={{ color: "#f0f6fc", fontSize: "1.3rem", fontWeight: 700, marginBottom: 16 }}>Logistics Management</h1>

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <button onClick={() => setTab("kanban")} style={{
                    background: tab === "kanban" ? "#10B981" : "#0d1421",
                    color: tab === "kanban" ? "#fff" : "#8b949e",
                    border: "1px solid #1e293b", borderRadius: 8,
                    padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}>Supply Chain Mesh</button>
                <button onClick={() => setTab("compliance")} style={{
                    background: tab === "compliance" ? "#10B981" : "#0d1421",
                    color: tab === "compliance" ? "#fff" : "#8b949e",
                    border: "1px solid #1e293b", borderRadius: 8,
                    padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}>Compliance Documents</button>
            </div>

            {tab === "kanban" ? (
                /* Kanban Board */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {COLUMNS.map(col => (
                        <div key={col} style={{
                            background: "#0d1421", border: "1px solid #1e293b", borderRadius: 12,
                            padding: 16, minHeight: 400,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: STATUS_COLOR[STATUS_MAP[col]] || "#8b949e",
                                }} />
                                <span style={{ color: "#f0f6fc", fontSize: "0.85rem", fontWeight: 700 }}>{col}</span>
                                <span style={{ color: "#4b5563", fontSize: "0.72rem", marginLeft: "auto" }}>
                                    {grouped[col]?.length || 0}
                                </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {(grouped[col] || []).map(b => (
                                    <div key={b.booking_id} style={{
                                        background: "#111827", border: "1px solid #1e293b", borderRadius: 10,
                                        padding: 14,
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <span style={{ color: "#00D4FF", fontSize: "0.78rem", fontWeight: 700 }}>{b.booking_id}</span>
                                            <span style={{ color: "#8b949e", fontSize: "0.68rem" }}>₹{b.freight}</span>
                                        </div>
                                        <div style={{ color: "#f0f6fc", fontSize: "0.82rem", fontWeight: 500, marginBottom: 4 }}>{b.customer_name}</div>
                                        <div style={{ color: "#8b949e", fontSize: "0.72rem", marginBottom: 8 }}>
                                            {b.origin} → {b.destination}
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <span style={{
                                                background: "#1e293b", color: "#8b949e",
                                                padding: "2px 6px", borderRadius: 4, fontSize: "0.65rem",
                                            }}>{b.total_weight} KG</span>
                                            {b.vehicle_id && (
                                                <span style={{
                                                    background: "#00D4FF15", color: "#00D4FF",
                                                    padding: "2px 6px", borderRadius: 4, fontSize: "0.65rem",
                                                }}>🚛 {b.vehicle_id}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Compliance Documents Table */
                <div style={{ background: "#0d1421", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#0F172A" }}>
                                {["Booking ID", "Customer", "Route", "AWB#", "Port#", "Status", "Invoice"].map(h => (
                                    <th key={h} style={{
                                        padding: "10px 14px", color: "#8b949e", fontSize: "0.7rem",
                                        textTransform: "uppercase", textAlign: "left", fontWeight: 600,
                                        borderBottom: "1px solid #1e293b",
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(b => (
                                <tr key={b.booking_id} style={{ borderBottom: "1px solid #1e293b" }}>
                                    <td style={{ padding: "10px 14px", color: "#00D4FF", fontSize: "0.82rem", fontWeight: 600 }}>{b.booking_id}</td>
                                    <td style={{ padding: "10px 14px", color: "#f0f6fc", fontSize: "0.82rem" }}>{b.customer_name}</td>
                                    <td style={{ padding: "10px 14px", color: "#8b949e", fontSize: "0.82rem" }}>{b.origin} → {b.destination}</td>
                                    <td style={{ padding: "10px 14px", color: "#f0f6fc", fontSize: "0.82rem" }}>{b.awb_number || "—"}</td>
                                    <td style={{ padding: "10px 14px", color: "#f0f6fc", fontSize: "0.82rem" }}>{b.port_number || "—"}</td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <span style={{
                                            background: `${STATUS_COLOR[b.status] || "#8b949e"}22`,
                                            color: STATUS_COLOR[b.status] || "#8b949e",
                                            padding: "3px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600,
                                        }}>{b.status.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <button onClick={() => downloadInvoice(b)} style={{
                                            background: "none", border: "1px solid #1e293b", borderRadius: 6,
                                            padding: "4px 10px", color: "#00D4FF", fontSize: "0.72rem",
                                            cursor: "pointer",
                                        }}>📜 Download</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
