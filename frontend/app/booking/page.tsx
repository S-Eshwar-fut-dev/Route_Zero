"use client";

import { useState, useMemo } from "react";

interface Commodity {
    name: string;
    weight_kg: number;
}

interface BookingConfirmation {
    booking_id: string;
    freight: number;
    status: string;
    created_at: string;
    origin: string;
    destination: string;
    expected_delivery: string;
}

const CUSTOMER_TYPES = ["Accounted Customer", "Walk-in Customer", "Contract Client"];

export default function BookingPage() {
    const [customerType, setCustomerType] = useState("Walk-in Customer");
    const [customerName, setCustomerName] = useState("");
    const [senderEmail, setSenderEmail] = useState("");
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [receiverFirst, setReceiverFirst] = useState("");
    const [receiverLast, setReceiverLast] = useState("");
    const [receiverEmail, setReceiverEmail] = useState("");
    const [commodities, setCommodities] = useState<Commodity[]>([{ name: "", weight_kg: 0 }]);
    const [ratePerKg, setRatePerKg] = useState(20);
    const [serviceTax, setServiceTax] = useState(12.5);
    const [expectedDelivery, setExpectedDelivery] = useState(
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
    const [submitting, setSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

    const totalWeight = useMemo(() => commodities.reduce((s, c) => s + (c.weight_kg || 0), 0), [commodities]);
    const freight = useMemo(() => totalWeight * ratePerKg * (1 + serviceTax / 100), [totalWeight, ratePerKg, serviceTax]);
    const today = new Date().toISOString().split("T")[0];

    function addCommodity() {
        setCommodities(prev => [...prev, { name: "", weight_kg: 0 }]);
    }

    function updateCommodity(index: number, field: keyof Commodity, value: string | number) {
        setCommodities(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    }

    function removeCommodity(index: number) {
        if (commodities.length <= 1) return;
        setCommodities(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit() {
        setSubmitting(true);
        try {
            const res = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_type: customerType,
                    customer_name: customerName,
                    sender_email: senderEmail,
                    origin,
                    destination,
                    commodities: commodities.filter(c => c.name && c.weight_kg > 0),
                    rate_per_kg: ratePerKg,
                    service_tax_pct: serviceTax,
                    expected_delivery: expectedDelivery,
                    receiver_name: `${receiverFirst} ${receiverLast}`.trim(),
                    receiver_email: receiverEmail,
                }),
            });
            const data = await res.json();
            if (data.booking_id) {
                setConfirmation({
                    ...data,
                    origin,
                    destination,
                    expected_delivery: expectedDelivery,
                });
            }
        } catch (err) {
            console.error("Booking failed:", err);
        } finally {
            setSubmitting(false);
        }
    }

    const inputStyle: React.CSSProperties = {
        width: "100%", background: "#111827", border: "1px solid #1e293b",
        borderRadius: 8, padding: "10px 14px", color: "#f0f6fc",
        fontSize: "0.85rem", outline: "none",
    };

    const labelStyle: React.CSSProperties = {
        color: "#8b949e", fontSize: "0.75rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
    };

    const sectionHeader = (text: string, color: string = "#00D4FF") => (
        <div style={{
            color, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", padding: "8px 0", borderBottom: `2px solid ${color}33`,
            marginBottom: 16, marginTop: 24,
        }}>{text}</div>
    );

    if (confirmation) {
        return (
            <div style={{ padding: 40, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 64px)" }}>
                <div style={{
                    background: "#0d1421", border: "1px solid #1e3a2f", borderRadius: 16,
                    padding: 40, maxWidth: 480, width: "100%", textAlign: "center",
                }}>
                    <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
                    <h2 style={{ color: "#00ff87", fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>Booking Confirmed</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24, textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                            <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>Booking ID</span>
                            <span style={{ color: "#00D4FF", fontWeight: 700, fontSize: "0.9rem" }}>{confirmation.booking_id}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                            <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>Route</span>
                            <span style={{ color: "#f0f6fc", fontWeight: 600 }}>{confirmation.origin} → {confirmation.destination}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                            <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>Freight</span>
                            <span style={{ color: "#00ff87", fontWeight: 700, fontSize: "1.1rem" }}>₹{confirmation.freight.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                            <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>Expected Delivery</span>
                            <span style={{ color: "#f0f6fc", fontWeight: 600 }}>{confirmation.expected_delivery}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => { setConfirmation(null); setCommodities([{ name: "", weight_kg: 0 }]); }}
                        style={{
                            marginTop: 32, width: "100%",
                            background: "linear-gradient(135deg, #10B981, #059669)",
                            border: "none", borderRadius: 10, padding: "12px 24px",
                            color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                        }}
                    >
                        New Booking
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: "32px 40px", overflowY: "auto", height: "calc(100vh - 64px)" }}>
            <h1 style={{ color: "#f0f6fc", fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>Logistics Booking</h1>
            <p style={{ color: "#8b949e", fontSize: "0.82rem", marginBottom: 32 }}>Create a new freight booking with live freight calculation</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, maxWidth: 1200 }}>
                {/* LEFT PANEL */}
                <div>
                    {/* Customer Info */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Customer Type</label>
                        <select value={customerType} onChange={e => setCustomerType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                            {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {customerType === "Accounted Customer" && (
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>Customer Name</label>
                            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Dell Smith" style={inputStyle} />
                        </div>
                    )}

                    {sectionHeader("Sender Details")}

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Sender Email</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }}>✉</span>
                            <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="william@company.com" style={{ ...inputStyle, paddingLeft: 36 }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Origin City</label>
                        <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Delhi, Mumbai, Chennai" style={inputStyle} />
                    </div>

                    {sectionHeader("Receiver Details")}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>First Name</label>
                            <input value={receiverFirst} onChange={e => setReceiverFirst(e.target.value)} placeholder="First name" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name</label>
                            <input value={receiverLast} onChange={e => setReceiverLast(e.target.value)} placeholder="Last name" style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Receiver Email</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }}>✉</span>
                            <input type="email" value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} placeholder="receiver@company.com" style={{ ...inputStyle, paddingLeft: 36 }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Destination City</label>
                        <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Mumbai, Bangalore, Patna" style={inputStyle} />
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <h2 style={{ color: "#f0f6fc", fontSize: "1rem", fontWeight: 700, margin: 0 }}>Shipment Details</h2>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    </div>

                    {/* Commodity rows */}
                    {commodities.map((c, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", gap: 8, marginBottom: 8 }}>
                            <input
                                value={c.name} onChange={e => updateCommodity(i, "name", e.target.value)}
                                placeholder="e.g. Wooden Products" style={inputStyle}
                            />
                            <input
                                type="number" value={c.weight_kg || ""} onChange={e => updateCommodity(i, "weight_kg", parseFloat(e.target.value) || 0)}
                                placeholder="KG" style={{ ...inputStyle, textAlign: "right" }}
                            />
                            <button onClick={() => removeCommodity(i)} disabled={commodities.length <= 1}
                                style={{ background: "none", border: "1px solid #1e293b", borderRadius: 8, color: commodities.length <= 1 ? "#333" : "#ef4444", cursor: "pointer", fontSize: "1rem" }}>
                                ×
                            </button>
                        </div>
                    ))}

                    <button onClick={addCommodity} style={{
                        background: "none", border: "none", color: "#00D4FF",
                        fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                        marginBottom: 24, padding: "4px 0",
                    }}>+ Add New</button>

                    {/* Summary fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Total Weight</label>
                            <div style={{ ...inputStyle, background: "#0a0f1a", color: "#00ff87", fontWeight: 700 }}>
                                {totalWeight.toFixed(2)} KG
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Rate / KG (₹)</label>
                            <input type="number" value={ratePerKg} onChange={e => setRatePerKg(parseFloat(e.target.value) || 0)} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Date</label>
                            <div style={{ ...inputStyle, background: "#0a0f1a", color: "#8b949e" }}>{today}</div>
                        </div>
                        <div>
                            <label style={labelStyle}>Expected Delivery</label>
                            <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={labelStyle}>Service Tax %</label>
                        <input type="number" value={serviceTax} onChange={e => setServiceTax(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: 120 }} />
                    </div>

                    {/* Freight display */}
                    <div style={{
                        background: "linear-gradient(135deg, #0d2818, #0d1421)",
                        border: "1px solid #1e3a2f", borderRadius: 12, padding: 24,
                        marginBottom: 24, textAlign: "center",
                    }}>
                        <div style={{ color: "#8b949e", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 8 }}>Freight Total</div>
                        <div style={{ color: "#00ff87", fontSize: "2.2rem", fontWeight: 800, textShadow: "0 0 20px rgba(0,255,135,0.4)" }}>
                            ₹{freight.toFixed(2)}
                        </div>
                        <div style={{ color: "#4b5563", fontSize: "0.72rem", marginTop: 4 }}>
                            {totalWeight} KG × ₹{ratePerKg} × (1 + {serviceTax}%)
                        </div>
                    </div>

                    {/* Submit */}
                    <button onClick={handleSubmit} disabled={submitting || !origin || !destination}
                        style={{
                            width: "100%",
                            background: submitting ? "#333" : "linear-gradient(135deg, #10B981, #059669)",
                            border: "none", borderRadius: 10, padding: "14px 24px",
                            color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
                            opacity: (!origin || !destination) ? 0.5 : 1,
                        }}
                    >
                        {submitting ? "Submitting..." : "Submit Booking →"}
                    </button>
                </div>
            </div>
        </div>
    );
}
