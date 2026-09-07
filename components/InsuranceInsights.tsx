"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FinancialProfile } from "@/lib/types";

interface Insight {
    coverageGaps: { type: string; risk: string; reason: string; monthlyCost: string }[];
    recommendedProducts: { name: string; why: string; monthlyCost: string; keyBenefit: string; discountAvailable: boolean; discountReason: string }[];
    savingsOpportunities: { title: string; savings: string; description: string }[];
    educationalTips: { topic: string; content: string }[];
}

const M = "rgba(255,255,255,0.6)";
const riskColor = (r: string) => r === "high" ? "#f87171" : r === "medium" ? "#fbbf24" : "#4ade80";

export default function InsuranceInsights({ profile, documentContext }: { profile: FinancialProfile; documentContext?: string }) {
    const [data, setData] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"gaps" | "products" | "savings" | "tips">("gaps");
    const [loaded, setLoaded] = useState(false);

    // Re-run when a new document is uploaded
    useEffect(() => {
        if (documentContext) { load(); }
    }, [documentContext]);

    useEffect(() => {
        if (!loaded) { load(); setLoaded(true); }
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/insurance-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profile }),
            });
            const json = await res.json();
            if (!json.error) setData(json);
        } catch { }
        setLoading(false);
    };

    const tabs = [
        { id: "gaps", label: "🚨 Gaps" },
        { id: "products", label: "🛡️ Products" },
        { id: "savings", label: "💰 Savings" },
        { id: "tips", label: "📚 Learn" },
    ] as const;

    return (
        <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">🛡️ Insurance Intelligence</p>
                <button onClick={load} disabled={loading}
                    className="text-xs px-2 py-1 rounded-full transition-all disabled:opacity-40"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                    {loading ? "..." : "↻"}
                </button>
            </div>

            {/* Tab row */}
            <div className="flex gap-1 mb-3">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
                        style={{
                            background: tab === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                            color: tab === t.id ? "#a5b4fc" : M,
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    <p className="text-xs" style={{ color: M }}>Analyzing with knowledge base...</p>
                </div>
            )}

            {!loading && data && (
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                        className="space-y-2">

                        {tab === "gaps" && data.coverageGaps?.map((g, i) => (
                            <div key={i} className="flex items-start justify-between p-3 rounded-xl gap-3"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-white">{g.type}</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                            style={{ background: `${riskColor(g.risk)}15`, color: riskColor(g.risk), border: `1px solid ${riskColor(g.risk)}30` }}>
                                            {g.risk}
                                        </span>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: M }}>{g.reason}</p>
                                </div>
                                <span className="text-xs font-bold flex-shrink-0" style={{ color: "#FFC627" }}>{g.monthlyCost}</span>
                            </div>
                        ))}

                        {tab === "products" && data.recommendedProducts?.map((p, i) => (
                            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-white">{p.name}</p>
                                    <span className="text-xs font-bold" style={{ color: "#FFC627" }}>{p.monthlyCost}</span>
                                </div>
                                <p className="text-xs mb-1.5" style={{ color: M }}>{p.why}</p>
                                <p className="text-xs text-green-400">✓ {p.keyBenefit}</p>
                                {p.discountAvailable && <p className="text-xs mt-1" style={{ color: "#FFC627" }}>🏷️ {p.discountReason}</p>}
                            </div>
                        ))}

                        {tab === "savings" && data.savingsOpportunities?.map((s, i) => (
                            <div key={i} className="flex items-start justify-between p-3 rounded-xl gap-3"
                                style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white mb-1">{s.title}</p>
                                    <p className="text-xs" style={{ color: M }}>{s.description}</p>
                                </div>
                                <span className="text-sm font-bold text-green-400 flex-shrink-0">{s.savings}</span>
                            </div>
                        ))}

                        {tab === "tips" && data.educationalTips?.map((t, i) => (
                            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,198,39,0.06)", border: "1px solid rgba(255,198,39,0.12)" }}>
                                <p className="text-xs font-bold mb-1" style={{ color: "#FFC627" }}>{t.topic}</p>
                                <p className="text-xs leading-relaxed" style={{ color: M }}>{t.content}</p>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}
