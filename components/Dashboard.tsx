"use client";
import React from "react";
import { FinancialProfile, Transaction } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import InsuranceInsights from "./InsuranceInsights";

const M = "rgba(255,255,255,0.6)";
const B = "rgba(255,255,255,0.1)";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`glass rounded-2xl p-4 ${className}`}>{children}</div>
);

export default function Dashboard({ profile, transactions, documentContext, docRedFlags = [], docActions = [] }: {
    profile: FinancialProfile;
    transactions: Transaction[];
    documentContext?: string;
    docRedFlags?: { id: string; text: string; source: string }[];
    docActions?: { id: string; text: string; source: string }[];
}): React.ReactElement {
    const [visibleCount, setVisibleCount] = React.useState(10);
    const uniqueTransactions = React.useMemo(() => {
        const seen = new Set<string>();
        return transactions.filter(tx => { if (seen.has(tx.id)) return false; seen.add(tx.id); return true; });
    }, [transactions]);

    const riskColor = profile.riskScore >= 7 ? "#f87171" : profile.riskScore >= 4 ? "#fbbf24" : "#4ade80";
    const riskLabel = profile.riskScore >= 7 ? "High Risk" : profile.riskScore >= 4 ? "Medium Risk" : "Low Risk";


    return (
        <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-4">

            {/* Alerts */}
            {(docRedFlags.length > 0 || profile.emergencyAlerts.length > 0) && (
                <div className="grid grid-cols-3 gap-3">
                    {docRedFlags.length > 0
                        ? docRedFlags.map((f) => (
                            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="emergency-alert rounded-xl p-3">
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0">🚨</span>
                                    <div>
                                        <p className="text-xs leading-relaxed" style={{ color: "#fca5a5" }}>{f.text}</p>
                                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>from {f.source}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                        : profile.emergencyAlerts.map((alert) => (
                            <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="emergency-alert rounded-xl p-3">
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0">{alert.severity === "high" ? "🚨" : alert.severity === "medium" ? "⚠️" : "ℹ️"}</span>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: "#fca5a5" }}>{alert.title}</p>
                                        <p className="text-xs mt-0.5" style={{ color: M }}>{alert.description}</p>
                                        <p className="text-xs mt-1 font-semibold" style={{ color: "#FFC627" }}>→ {alert.action}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    }
                </div>
            )}

            {/* Document Actions */}
            {docActions.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {docActions.map((a) => (
                        <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl p-3" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)" }}>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400 flex-shrink-0">✓</span>
                                <div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(200,255,220,0.9)" }}>{a.text}</p>
                                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>from {a.source}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Insurance Intelligence */}
            <InsuranceInsights profile={profile} documentContext={documentContext} />

            {/* Recommendations */}
            <Card>
                <p className="text-sm font-semibold mb-3" style={{ color: M }}>Recommended for You</p>
                <div className="grid grid-cols-3 gap-3">
                    {profile.recommendations.slice(0, 3).map((rec) => (
                        <div key={rec.id} className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                            <p className="text-sm font-bold text-white mb-1">{rec.product}</p>
                            <p className="text-xs font-bold mb-1" style={{ color: "#FFC627" }}>{rec.monthlyCost}</p>
                            <p className="text-xs leading-relaxed mb-1" style={{ color: M }}>{rec.reason}</p>
                            <p className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>{rec.provider}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Savings Opportunities */}
            <Card>
                <p className="text-sm font-semibold mb-3" style={{ color: M }}>Savings Opportunities</p>
                <div className="grid grid-cols-3 gap-3">
                    {profile.savingsOpportunities.slice(0, 3).map((opp) => (
                        <div key={opp.id} className="flex flex-col p-3 rounded-xl" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                            <p className="text-sm font-bold text-white">{opp.title}</p>
                            <p className="text-xs mt-1" style={{ color: M }}>{opp.description}</p>
                            <span className="text-sm font-bold text-green-400 mt-2">+${opp.monthlySavings}/mo</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Three panels */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="flex flex-col items-center">
                    <p className="text-sm font-semibold mb-3 self-start" style={{ color: M }}>Financial Risk Score</p>
                    <div className="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke={B} strokeWidth="3" />
                            <motion.circle cx="18" cy="18" r="15.9" fill="none" stroke={riskColor} strokeWidth="3"
                                strokeDasharray={`${(profile.riskScore / 10) * 100} 100`} strokeLinecap="round"
                                initial={{ strokeDasharray: "0 100" }}
                                animate={{ strokeDasharray: `${(profile.riskScore / 10) * 100} 100` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold" style={{ color: riskColor }}>{profile.riskScore}</span>
                        </div>
                    </div>
                    <p className="font-bold text-base mt-2" style={{ color: riskColor }}>{riskLabel}</p>
                    <p className="text-xs text-center mt-1 leading-relaxed" style={{ color: M }}>{profile.riskReason}</p>
                </Card>

                <Card>
                    <p className="text-sm font-semibold mb-3" style={{ color: M }}>Monthly Overview</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm whitespace-nowrap" style={{ color: M }}>Income</span>
                            <span className="text-base font-bold text-green-400">${profile.monthlyIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm whitespace-nowrap" style={{ color: M }}>Expenses</span>
                            <span className="text-base font-bold text-red-400">${profile.monthlyExpenses.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm whitespace-nowrap" style={{ color: M }}>Balance</span>
                            <span className="text-base font-bold" style={{ color: "#FFC627" }}>${profile.balance.toLocaleString()}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <p className="text-sm font-semibold mb-3" style={{ color: M }}>Spending by Category</p>
                    <div className="flex flex-col items-center gap-3">
                        <div style={{ width: 140, height: 140 }}>
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={profile.spendingByCategory} cx="50%" cy="50%" innerRadius="32%" outerRadius="72%" dataKey="value" paddingAngle={2} strokeWidth={0}>
                                        {profile.spendingByCategory.map((e, i) => <Cell key={i} fill={e.color} opacity={0.95} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: "rgba(10,5,25,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 11, color: "white" }}
                                        formatter={(value, name) => {
                                            const total = profile.spendingByCategory.reduce((s, c) => s + c.value, 0);
                                            return [`$${value} (${((Number(value)/total)*100).toFixed(1)}%)`, name];
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-1 w-full">
                            {profile.spendingByCategory.map((cat, i) => {
                                const total = profile.spendingByCategory.reduce((s, c) => s + c.value, 0);
                                return (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                        <span className="text-xs truncate" style={{ color: M }}>{cat.name}</span>
                                        <span className="text-xs font-bold ml-auto" style={{ color: "white" }}>{((cat.value/total)*100).toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            </div>



            {/* Transaction History */}
            <Card>
                <p className="text-sm font-semibold mb-3" style={{ color: M }}>Transaction History</p>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${B}` }}>
                                {["Date", "Description", "Category", "Amount"].map((h, i) => (
                                    <th key={h} className={`pb-2 text-sm font-semibold ${i === 3 ? "text-right" : "text-left"}`} style={{ color: M }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueTransactions.slice(0, visibleCount).map((tx) => (
                                <tr key={tx.id} className="transaction-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    <td className="py-2 text-sm" style={{ color: M }}>{tx.date}</td>
                                    <td className="py-2 text-sm text-white">
                                        <div className="flex items-center gap-1">
                                            {tx.anomaly && <span title={tx.anomalyReason}>⚠️</span>}
                                            <span className="truncate max-w-[130px]">{tx.description}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 text-sm" style={{ color: M }}>{tx.category}</td>
                                    <td className={`py-2 text-sm text-right font-bold ${tx.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                                        {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <p className="text-xs" style={{ color: M }}>Showing {Math.min(visibleCount, uniqueTransactions.length)} of {uniqueTransactions.length}</p>
                    <div className="flex gap-2">
                        {visibleCount < uniqueTransactions.length && (
                            <button onClick={() => setVisibleCount(v => v + 10)}
                                className="text-xs px-3 py-1.5 rounded-full font-semibold glass-btn-ghost"
                                style={{ color: "#a5b4fc" }}>
                                Load more
                            </button>
                        )}
                        {visibleCount > 10 && (
                            <button onClick={() => setVisibleCount(10)}
                                className="text-xs px-3 py-1.5 rounded-full font-semibold glass-btn-ghost"
                                style={{ color: M }}>
                                Show less
                            </button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
