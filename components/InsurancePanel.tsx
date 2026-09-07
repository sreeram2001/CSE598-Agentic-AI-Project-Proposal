"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FinancialProfile } from "@/lib/types";

interface InsightData {
    coverageGaps: { type: string; risk: string; reason: string; monthlyCost: string; priority: number }[];
    recommendedProducts: { name: string; category: string; why: string; monthlyCost: string; keyBenefit: string; discountAvailable: boolean; discountReason: string }[];
    savingsOpportunities: { title: string; savings: string; description: string }[];
    educationalTips: { topic: string; content: string; relevance: string }[];
    riskAlerts: { alert: string; severity: string; solution: string }[];
}

const TABS = [
    { id: "gaps", label: "🚨 Coverage Gaps", color: "#f87171" },
    { id: "products", label: "🛡️ Recommended", color: "#a5b4fc" },
    { id: "savings", label: "💰 Savings", color: "#4ade80" },
    { id: "education", label: "📚 Learn", color: "#FFC627" },
];

const riskColor = (r: string) => r === "high" ? "#f87171" : r === "medium" ? "#fbbf24" : "#4ade80";
const riskBg = (r: string) => r === "high" ? "rgba(248,113,113,0.1)" : r === "medium" ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.1)";
const riskBorder = (r: string) => r === "high" ? "rgba(248,113,113,0.25)" : r === "medium" ? "rgba(251,191,36,0.25)" : "rgba(74,222,128,0.25)";

export default function InsurancePanel({ profile }: { profile: FinancialProfile }) {
    const [insights, setInsights] = useState<InsightData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("gaps");
    const [error, setError] = useState("");

    useEffect(() => {
        if (profile) loadInsights();
    }, [profile.riskScore]);

    const loadInsights = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/insurance-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profile }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setInsights(data);
        } catch {
            setError("Failed to load insights. Try again.");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                    <h3 className="text-base font-bold text-white">Insurance Intelligence</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Powered by State Farm knowledge base
                    </p>
                </div>
                <button onClick={loadInsights} disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all disabled:opacity-40"
                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }}>
                    {loading ? "⏳ Loading..." : "🔄 Refresh"}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0 overflow-x-auto">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all"
                        style={{
                            background: activeTab === tab.id ? `${tab.color}20` : "rgba(255,255,255,0.05)",
                            border: `1px solid ${activeTab === tab.id ? `${tab.color}50` : "rgba(255,255,255,0.08)"}`,
                            color: activeTab === tab.id ? tab.color : "rgba(255,255,255,0.45)",
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Analyzing your profile against State Farm knowledge base...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && insights && (
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                            className="space-y-3 pt-2">

                            {/* Coverage Gaps */}
                            {activeTab === "gaps" && (
                                <>
                                    {insights.riskAlerts?.map((alert, i) => (
                                        <div key={i} className="rounded-xl p-3" style={{ background: riskBg(alert.severity), border: `1px solid ${riskBorder(alert.severity)}` }}>
                                            <div className="flex items-start gap-2">
                                                <span className="text-base">{alert.severity === "high" ? "🚨" : "⚠️"}</span>
                                                <div>
                                                    <p className="text-sm font-bold" style={{ color: riskColor(alert.severity) }}>{alert.alert}</p>
                                                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Solution: {alert.solution}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {insights.coverageGaps?.sort((a, b) => a.priority - b.priority).map((gap, i) => (
                                        <div key={i} className="glass rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-bold text-white">{gap.type}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                                        style={{ background: riskBg(gap.risk), color: riskColor(gap.risk), border: `1px solid ${riskBorder(gap.risk)}` }}>
                                                        {gap.risk} risk
                                                    </span>
                                                    <span className="text-xs font-bold" style={{ color: "#FFC627" }}>{gap.monthlyCost}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{gap.reason}</p>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Recommended Products */}
                            {activeTab === "products" && insights.recommendedProducts?.map((prod, i) => (
                                <div key={i} className="glass rounded-xl p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">{prod.name}</p>
                                            <p className="text-xs mt-0.5" style={{ color: "#a5b4fc" }}>State Farm</p>
                                        </div>
                                        <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: "#FFC627" }}>{prod.monthlyCost}</span>
                                    </div>
                                    <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>{prod.why}</p>
                                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                                        <span className="text-green-400 text-sm">✓</span>
                                        <p className="text-xs text-green-400">{prod.keyBenefit}</p>
                                    </div>
                                    {prod.discountAvailable && (
                                        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "rgba(255,198,39,0.08)", border: "1px solid rgba(255,198,39,0.15)" }}>
                                            <span className="text-yellow-400 text-sm">🏷️</span>
                                            <p className="text-xs" style={{ color: "#FFC627" }}>{prod.discountReason}</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Savings */}
                            {activeTab === "savings" && insights.savingsOpportunities?.map((opp, i) => (
                                <div key={i} className="glass rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-bold text-white">{opp.title}</p>
                                        <span className="text-base font-bold text-green-400">{opp.savings}</span>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{opp.description}</p>
                                </div>
                            ))}

                            {/* Education */}
                            {activeTab === "education" && insights.educationalTips?.map((tip, i) => (
                                <div key={i} className="glass rounded-xl p-4">
                                    <p className="text-sm font-bold mb-2" style={{ color: "#FFC627" }}>{tip.topic}</p>
                                    <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>{tip.content}</p>
                                    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                                        <span className="text-indigo-400 text-sm flex-shrink-0">💡</span>
                                        <p className="text-xs" style={{ color: "#a5b4fc" }}>{tip.relevance}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                {!loading && !error && !insights && (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <span className="text-4xl">🛡️</span>
                        <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Click Refresh to get personalized insurance insights based on your financial profile
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
