"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import ChatPanel from "@/components/ChatPanel";
import Dashboard from "@/components/Dashboard";
import { FinancialProfile, Transaction, DocumentFlag, DocumentAction } from "@/lib/types";
import { mockProfile, mockTransactions } from "@/lib/mockData";

export default function Home() {
  const [profile, setProfile] = useState<FinancialProfile>(mockProfile);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");
  const [documentContext, setDocumentContext] = useState<string>("");
  const [docRedFlags, setDocRedFlags] = useState<DocumentFlag[]>([]);
  const [docActions, setDocActions] = useState<DocumentAction[]>([]);

  const handleDocumentAnalyzed = (context: string, redFlags?: string[], actions?: string[], docName?: string) => {
    setDocumentContext(context);
    if (redFlags?.length) {
      setDocRedFlags(redFlags.map((f, i) => ({ id: `flag-${Date.now()}-${i}`, text: f, source: docName || "Document" })));
    }
    if (actions?.length) {
      setDocActions(actions.map((a, i) => ({ id: `action-${Date.now()}-${i}`, text: a, source: docName || "Document" })));
    }
  };

  const handleProfileUpdate = (newProfile: FinancialProfile, newTransactions: Transaction[]) => {
    setProfile(newProfile);
    setTransactions(newTransactions);
    setActiveTab("dashboard");
  };

  const riskColor = profile.riskScore >= 7 ? "#f87171" : profile.riskScore >= 4 ? "#fbbf24" : "#4ade80";

  return (
    <div className="app-bg flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>

      {/* Navbar */}
      <nav className="glass-nav flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/sparky.png" alt="Sparky" width={36} height={36}
            style={{ objectFit: "contain", mixBlendMode: "screen", filter: "drop-shadow(0 0 6px rgba(255,198,39,0.5))" }} />
          <span className="font-bold text-xl text-white tracking-tight">SparkyFi</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm px-4 py-1.5 rounded-full font-bold glass" style={{ color: riskColor, border: `1px solid ${riskColor}40` }}>
            Risk {profile.riskScore}/10
          </div>
        </div>
      </nav>

      {/* Mobile tabs */}
      <div className="flex md:hidden flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(4,4,15,0.5)" }}>
        {(["chat", "dashboard"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-sm font-semibold capitalize transition-all"
            style={{ color: activeTab === tab ? "#FFC627" : "rgba(255,255,255,0.4)", borderBottom: activeTab === tab ? "2px solid #FFC627" : "2px solid transparent" }}>
            {tab === "chat" ? "🎙️ Sparky" : "📊 Dashboard"}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <motion.div
          className={`${activeTab === "chat" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[400px] overflow-hidden glass-panel`}
          style={{ height: "100%" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <ChatPanel onProfileUpdate={handleProfileUpdate} profile={profile} userId="demo-user" onDocumentAnalyzed={handleDocumentAnalyzed} />
        </motion.div>

        <motion.div
          className={`${activeTab === "dashboard" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">Financial Dashboard</h2>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
            <Dashboard profile={profile} transactions={transactions} documentContext={documentContext} docRedFlags={docRedFlags} docActions={docActions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
