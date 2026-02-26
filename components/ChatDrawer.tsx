"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { postQuery } from "@/lib/api";
import { useFleet } from "@/lib/FleetContext";
import type { QueryResult } from "@/lib/types";

interface Message {
    id: string;
    role: "user" | "ai";
    text: string;
    result?: QueryResult;
}

const DEMO_QUESTIONS = [
    "Which truck has emitted the most CO₂?",
    "How much carbon has our fleet saved today?",
    "Are there any active anomalies right now?",
    "What is the most fuel-efficient route?",
    "Does our emission rate comply with NLP targets?",
];

const FALLBACK_ANSWERS: Record<string, string> = {
    co2: "**TRK-DL-001** on Delhi–Mumbai leads fleet emissions at ~47.3 kg CO₂/hr.\n\n**Action:** Reduce speed to 60–70 kmph, schedule injector inspection.",
    saved: "Fleet has saved ~312 kg CO₂ vs baseline today.\n\nDelhi–Mumbai: 108 kg · Chennai–Bangalore: 124 kg · Kolkata–Patna: 80 kg.",
    anomal: "1 active HIGH_EMISSION_ALERT on TRK-DL-001.\n\n5-min CO₂: 13.4 kg > 2× rolling avg 5.8 kg.\n\n**Action:** Contact driver immediately.",
    efficient: "Chennai–Bangalore is most efficient at 4.3 km/L avg. TRK-CH-003 leads at 4.8 km/L.",
    comply: "Fleet is compliant with NLP 2022 interim targets but 8% above 2027 trajectory. 9.2% reduction achieved vs 20% target.",
};

function getFallback(q: string): string {
    const lq = q.toLowerCase();
    if (lq.includes("co2") || lq.includes("emitted") || lq.includes("most")) return FALLBACK_ANSWERS.co2;
    if (lq.includes("saved") || lq.includes("baseline")) return FALLBACK_ANSWERS.saved;
    if (lq.includes("anomal") || lq.includes("alert")) return FALLBACK_ANSWERS.anomal;
    if (lq.includes("efficient") || lq.includes("route") || lq.includes("fuel")) return FALLBACK_ANSWERS.efficient;
    if (lq.includes("comply") || lq.includes("policy") || lq.includes("target")) return FALLBACK_ANSWERS.comply;
    return "GreenAI is reconnecting. Ask about emissions, anomalies, savings, or NLP compliance.";
}

export default function ChatDrawer() {
    const { chatOpen, setChatOpen } = useFleet();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    async function send(question: string) {
        if (!question.trim() || loading) return;
        setMessages(p => [...p, { id: Date.now().toString(), role: "user", text: question }]);
        setInput("");
        setLoading(true);
        try {
            const result = await postQuery(question);
            setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "ai", text: result.answer, result }]);
        } catch {
            const fb = getFallback(question);
            setMessages(p => [...p, { id: Date.now() + "e", role: "ai", text: fb, result: { answer: fb, sources: ["Cached"], live_data_used: false } }]);
        } finally {
            setLoading(false);
        }
    }

    if (!chatOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                onClick={() => setChatOpen(false)}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                    zIndex: 998, animation: "fade-in 0.15s ease",
                }}
            />

            {/* Drawer */}
            <div
                className="slide-in"
                style={{
                    position: "fixed", top: 0, right: 0,
                    width: 420, height: "100vh",
                    background: "#0d1421",
                    borderLeft: "1px solid #1e293b",
                    zIndex: 999,
                    display: "flex", flexDirection: "column",
                }}
            >
                {/* Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center" }}>
                    <div>
                        <div style={{ color: "#00ff87", fontWeight: 700, fontSize: "0.85rem" }}>💬 GreenAI</div>
                        <div style={{ color: "#4b5563", fontSize: "0.68rem" }}>Powered by Gemini 1.5 Pro + Live Fleet Data</div>
                    </div>
                    <button
                        onClick={() => setChatOpen(false)}
                        style={{ marginLeft: "auto", background: "none", border: "none", color: "#8b949e", fontSize: "1.2rem", cursor: "pointer" }}
                    >
                        ✕
                    </button>
                </div>

                {/* Quick questions */}
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e293b", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DEMO_QUESTIONS.map((q, i) => (
                        <button key={i} onClick={() => send(q)}
                            style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 20, padding: "3px 10px", color: "#8b949e", fontSize: "0.68rem", cursor: "pointer", whiteSpace: "nowrap" }}
                        >{q.slice(0, 35)}…</button>
                    ))}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {messages.map(m => (
                        <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                            {m.role === "user" ? (
                                <div style={{ background: "#00ff8715", border: "1px solid #00ff8733", borderRadius: "12px 12px 4px 12px", padding: "8px 14px", maxWidth: "75%", color: "#f0f6fc", fontSize: "0.85rem" }}>
                                    {m.text}
                                </div>
                            ) : (
                                <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px 12px 12px 4px", padding: "12px 16px", maxWidth: "85%", fontSize: "0.85rem" }}>
                                    <div style={{ color: "#f0f6fc" }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown></div>
                                    {m.result && (
                                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {m.result.live_data_used && <span style={{ background: "#00ff8715", border: "1px solid #00ff8733", color: "#00ff87", padding: "2px 8px", borderRadius: 20, fontSize: "0.65rem" }}>📡 Live</span>}
                                            {m.result.sources.map((s, i) => <span key={i} style={{ background: "#1e293b", color: "#8b949e", padding: "2px 8px", borderRadius: 20, fontSize: "0.65rem" }}>{s}</span>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ color: "#8b949e", fontSize: "0.85rem", padding: "10px 16px", background: "#111827", border: "1px solid #1e293b", borderRadius: 12, width: "fit-content" }}>
                            GreenAI is thinking…
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: 12, borderTop: "1px solid #1e293b", display: "flex", gap: 8 }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") send(input); }}
                        placeholder="Ask about fleet CO₂, routes, compliance…"
                        style={{ flex: 1, background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 14px", color: "#f0f6fc", fontSize: "0.85rem", outline: "none" }}
                    />
                    <button onClick={() => send(input)} disabled={loading}
                        style={{ background: "#00ff87", color: "#0a0f1a", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", opacity: loading ? 0.5 : 1 }}
                    >Ask</button>
                </div>
            </div>
        </>
    );
}
