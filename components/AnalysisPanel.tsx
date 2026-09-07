"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisPanelProps {
    content: string;
    title: string;
    onClose: () => void;
}

function parseContent(content: string) {
    const lines = content.split("\n").filter(l => l.trim());
    const summary: string[] = [];
    const redFlags: string[] = [];
    const actions: string[] = [];
    let inRedFlags = false;

    for (const line of lines) {
        const t = line.trim();
        if (t.includes("Red Flags:") || t === "🚨") { inRedFlags = true; continue; }
        if (t.startsWith("✅")) { inRedFlags = false; actions.push(t.replace(/^✅\s*/, "")); }
        else if (inRedFlags && (t.startsWith("•") || t.startsWith("-"))) { redFlags.push(t.replace(/^[•\-]\s*/, "")); }
        else if (!inRedFlags && !t.startsWith("✅") && redFlags.length === 0) { summary.push(t); }
    }
    return { summary, redFlags, actions };
}

function truncate(text: string, maxWords = 35): string {
    const words = text.split(" ");
    return words.length <= maxWords ? text : words.slice(0, maxWords).join(" ") + "...";
}

export default function AnalysisPanel({ content, title, onClose }: AnalysisPanelProps) {
    const [tab, setTab] = useState<"summary" | "redflags" | "actions">("summary");
    const { summary, redFlags, actions } = parseContent(content);

    const tabs = [
        { id: "summary", label: "📋 Summary", count: summary.length },
        { id: "redflags", label: "🚨 Red Flags", count: redFlags.length },
        { id: "actions", label: "✅ Actions", count: actions.length },
    ] as const;

    return (
        <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col"
            style={{
                background: "rgba(10,8,25,0.97)",
                backdropFilter: "blur(24px)",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                maxHeight: "55vh",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                    <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Document Analysis</p>
                    <p className="text-sm font-bold text-white truncate max-w-[260px]">{title}</p>
                </div>
                <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                    ✕ Close
                </button>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-3 gap-2">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                        style={{
                            background: tab === t.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                        }}>
                        {t.label} {t.count > 0 && <span className="ml-1 opacity-70">({t.count})</span>}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        {tab === "summary" && summary.map((s, i) => (
                            <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>{s}</p>
                        ))}
                        {tab === "redflags" && (redFlags.length === 0
                            ? <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No red flags found.</p>
                            : redFlags.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 rounded-xl px-3 py-2 mb-2"
                                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    <span className="text-red-400 flex-shrink-0 text-sm mt-0.5">⚠</span>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,200,200,0.9)" }}>{truncate(f)}</p>
                                </div>
                            ))
                        )}
                        {tab === "actions" && (actions.length === 0
                            ? <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No actions found.</p>
                            : actions.map((a, i) => (
                                <div key={i} className="flex items-start gap-2 rounded-xl px-3 py-2 mb-2"
                                    style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)" }}>
                                    <span className="text-green-400 flex-shrink-0 text-sm mt-0.5">✓</span>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(200,255,220,0.9)" }}>{truncate(a)}</p>
                                </div>
                            ))
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
