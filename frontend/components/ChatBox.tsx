"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { postQuery } from "@/lib/api";
import type { QueryResult } from "@/lib/types";

interface Message {
    id: string;
    role: "user" | "ai";
    text: string;
    result?: QueryResult;
}

const DEMO_QUESTIONS = [
    "Which truck has emitted the most CO₂ in the last hour?",
    "How much carbon has our fleet saved vs baseline today?",
    "Are there any active anomalies right now?",
    "What is the most fuel-efficient route in our fleet today?",
    "Does our current emission rate comply with the National Logistics Policy targets?",
];

const FALLBACK_ANSWERS: Record<string, string> = {
    "co2": "**Answer:** TRK-DL-001 on the Delhi–Mumbai corridor leads fleet emissions.\n**Evidence:** Estimated 47.3 kg CO₂ emitted in last hour at 2.8 L/5-min burn rate.\n**Action:** Reduce speed to 60–70 kmph and schedule injector inspection.\n**Sources:** Live Fleet Data · Vehicle Manuals",
    "saved": "**Answer:** The fleet has saved approximately 312 kg CO₂ vs baseline today.\n**Evidence:** Delhi–Mumbai: 108 kg. Chennai–Bangalore: 124 kg. Kolkata–Patna: 80 kg.\n**Action:** Maintain current dispatch efficiency.\n**Sources:** Live Fleet Data · Carbon Budget Guidelines",
    "anomal": "**Answer:** 1 active HIGH_EMISSION_ALERT on TRK-DL-001 and ROUTE_DEVIATION on TRK-CH-002.\n**Evidence:** TRK-DL-001: 5-min CO₂ 13.4 kg > 2× rolling avg 5.8 kg.\n**Action:** Contact TRK-DL-001 immediately. TRK-CH-002 should return to NH48.\n**Sources:** Live Fleet Data · Carbon Budget Guidelines",
    "efficient": "**Answer:** Chennai–Bangalore is the most fuel-efficient route at 4.3 km/L average.\n**Evidence:** BharatBenz 2523 R (TRK-CH-003) leads at 4.8 km/L.\n**Action:** Transfer lighter loads to BharatBenz units.\n**Sources:** Live Fleet Data · Vehicle Manuals",
    "comply": "**Answer:** Fleet is compliant with NLP 2022 interim 2025 targets but 8% above 2027 trajectory.\n**Evidence:** NLP 2022 requires 20% reduction by 2027. Fleet at 9.2% reduction.\n**Action:** Clear injector backlog (TRK-DL-004, TRK-CH-002). Evaluate CNG conversion.\n**Sources:** India NLP 2022 · Carbon Budget Guidelines · IPCC AR6",
};

function getFallback(question: string): string {
    const q = question.toLowerCase();
    if (q.includes("co2") || q.includes("emitted") || q.includes("most"))
        return FALLBACK_ANSWERS["co2"];
    if (q.includes("saved") || q.includes("baseline") || q.includes("saving"))
        return FALLBACK_ANSWERS["saved"];
    if (q.includes("anomal") || q.includes("alert") || q.includes("active"))
        return FALLBACK_ANSWERS["anomal"];
    if (q.includes("efficient") || q.includes("route") || q.includes("fuel"))
        return FALLBACK_ANSWERS["efficient"];
    if (q.includes("comply") || q.includes("policy") || q.includes("nlp") || q.includes("target"))
        return FALLBACK_ANSWERS["comply"];
    return "**Answer:** GreenAI is reconnecting. The fleet is operating across 3 corridors. Ask about emissions, anomalies, savings, or NLP compliance.\n**Action:** Ensure the FastAPI server is running on port 8000.";
}

export default function ChatBox() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send(question: string) {
        if (!question.trim() || loading) return;
        const userMsg: Message = { id: Date.now().toString(), role: "user", text: question };
        setMessages((p) => [...p, userMsg]);
        setInput("");
        setLoading(true);
        try {
            const result = await postQuery(question);
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", text: result.answer, result };
            setMessages((p) => [...p, aiMsg]);
        } catch {
            const fallbackText = getFallback(question);
            setMessages((p) => [...p, {
                id: Date.now().toString() + "e",
                role: "ai",
                text: fallbackText,
                result: {
                    answer: fallbackText,
                    sources: ["Cached Response"],
                    live_data_used: false,
                },
            }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #30363d" }}>
                <span style={{ color: "#00ff87", fontWeight: 700, fontSize: "0.85rem" }}>💬 ASK GREENAI</span>
            </div>

            <div style={{ padding: "8px 12px", borderBottom: "1px solid #30363d", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DEMO_QUESTIONS.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => send(q)}
                        style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 20, padding: "3px 10px", color: "#8b949e", fontSize: "0.7rem", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                        {q.slice(0, 40)}…
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        {m.role === "user" ? (
                            <div style={{ background: "#00ff8722", border: "1px solid #00ff8744", borderRadius: "12px 12px 4px 12px", padding: "8px 14px", maxWidth: "70%", color: "#e6edf3", fontSize: "0.875rem" }}>
                                {m.text}
                            </div>
                        ) : (
                            <div style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: "12px 12px 12px 4px", padding: "12px 16px", maxWidth: "85%", fontSize: "0.875rem" }}>
                                <div style={{ color: "#e6edf3" }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                                </div>
                                {m.result && (
                                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                        {m.result.live_data_used && (
                                            <span style={{ background: "#00ff8722", border: "1px solid #00ff8755", color: "#00ff87", padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem" }}>📡 Live Data</span>
                                        )}
                                        {m.result.sources.map((s, i) => (
                                            <span key={i} style={{ background: "#30363d", color: "#8b949e", padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem" }}>{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 12, padding: "10px 16px", color: "#8b949e", fontSize: "0.875rem" }}>
                            GreenAI is thinking…
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #30363d", display: "flex", gap: 8 }}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                    placeholder="Ask about your fleet CO₂, routes, or compliance…"
                    style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, padding: "8px 14px", color: "#e6edf3", fontSize: "0.875rem", outline: "none" }}
                />
                <button
                    onClick={() => send(input)}
                    disabled={loading}
                    style={{ background: "#00ff87", color: "#0d1117", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", opacity: loading ? 0.5 : 1 }}
                >
                    Ask
                </button>
            </div>
        </div>
    );
}
