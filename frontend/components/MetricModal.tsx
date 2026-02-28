"use client";

import { type ReactNode, useEffect, useCallback } from "react";

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export default function MetricModal({ open, onClose, title, children }: Props) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    }, [onClose]);

    useEffect(() => {
        if (open) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    zIndex: 1000,
                    animation: "fade-in 0.2s ease",
                }}
            />
            <div style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#0d1421",
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 0,
                width: 640, maxWidth: "90vw",
                maxHeight: "80vh",
                overflow: "hidden",
                zIndex: 1001,
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "16px 24px",
                    borderBottom: "1px solid #1e293b",
                }}>
                    <h2 style={{ color: "#f0f6fc", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none", border: "none",
                            color: "#8b949e", fontSize: "1.2rem",
                            cursor: "pointer",
                        }}
                    >✕</button>
                </div>

                {/* Content */}
                <div style={{
                    padding: 24,
                    overflowY: "auto",
                    maxHeight: "calc(80vh - 64px)",
                }}>
                    {children}
                </div>
            </div>
        </>
    );
}
