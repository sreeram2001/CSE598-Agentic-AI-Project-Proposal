"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SparkyAvatar from "./SparkyAvatar";
import { ChatMessage, FinancialProfile, Transaction } from "@/lib/types";
import MessageRenderer from "./MessageRenderer";

interface ChatPanelProps {
    onProfileUpdate: (profile: FinancialProfile, transactions: Transaction[]) => void;
    profile: FinancialProfile | null;
    userId: string;
    onDocumentAnalyzed?: (context: string, redFlags?: string[], actions?: string[], docName?: string) => void;
}

type SparkyState = "idle" | "listening" | "thinking" | "speaking";

export default function ChatPanel({ onProfileUpdate, profile, userId, onDocumentAnalyzed }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "0",
            role: "assistant",
            content: "Hey! I'm Sparky, your personal financial advisor. Tell me about your situation — what's going on with your finances? You can also upload a PDF (bank statement, lease, insurance policy) using the button below.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [sparkyState, setSparkyState] = useState<SparkyState>("idle");
    const [isListening, setIsListening] = useState(false);
    const [isPlaidConnected, setIsPlaidConnected] = useState(false);
    const [uploadLabel, setUploadLabel] = useState("Upload PDF");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const getFinancialContext = useCallback(() => {
        if (!profile) return "No financial data yet.";
        return `Monthly income: $${profile.monthlyIncome}, expenses: $${profile.monthlyExpenses}, balance: $${profile.balance}, risk score: ${profile.riskScore}/10. Alerts: ${profile.emergencyAlerts.map(a => a.title).join(", ")}`;
    }, [profile]);

    const speakText = async (text: string) => {
        if (!text || text.trim().length === 0) return;
        try {
            setSparkyState("speaking");
            // Strip markdown for clean voice output
            const clean = text
                .replace(/\*\*/g, "")
                .replace(/\*/g, "")
                .replace(/#+\s/g, "")
                .replace(/•/g, "")
                .replace(/✅|🚨|⚠️|📄|🏦/g, "")
                .split(/[.\n]/)
                .filter(s => s.trim().length > 10)
                .slice(0, 5)
                .join(". ")
                .trim();
            const res = await fetch("/api/voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: clean.slice(0, 500) }),
            });
            if (!res.ok) { setSparkyState("idle"); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => { setSparkyState("idle"); URL.revokeObjectURL(url); };
            audio.onerror = () => { setSparkyState("idle"); URL.revokeObjectURL(url); };
            audio.play();
        } catch {
            setSparkyState("idle");
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSparkyState("thinking");

        // Save user message to Supabase
        if (userId !== "guest") {
            fetch("/api/save-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: "user", content: text }),
            }).catch(() => { });
        }

        try {
            const history = messages.map((m) => ({ role: m.role, content: m.content }));
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history, financialContext: getFinancialContext() }),
            });
            const data = await res.json();
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // Save assistant message to Supabase
            if (userId !== "guest") {
                fetch("/api/save-chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, role: "assistant", content: data.response }),
                }).catch(() => { });
            }

            await speakText(data.response);
        } catch {
            setSparkyState("idle");
        }
    };

    const toggleListening = () => {
        if (isListening) {
            // Stop listening
            recognitionRef.current?.stop();
            setIsListening(false);
            setSparkyState("idle");
            return;
        }

        const SpeechRecognitionAPI =
            (window as unknown as Record<string, typeof SpeechRecognition>)["SpeechRecognition"] ||
            (window as unknown as Record<string, typeof SpeechRecognition>)["webkitSpeechRecognition"];
        if (!SpeechRecognitionAPI) {
            alert("Voice not supported in this browser. Use Chrome.");
            return;
        }
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => { setIsListening(true); setSparkyState("listening"); };
        recognition.onresult = (e: SpeechRecognitionEvent) => {
            const transcript = e.results[0][0].transcript;
            setIsListening(false);
            sendMessage(transcript);
        };
        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", e.error, e.message);
            if (e.error === "no-speech") {
                // Restart automatically on no-speech
                setIsListening(false);
                setSparkyState("idle");
            } else if (e.error === "not-allowed") {
                setIsListening(false);
                setSparkyState("idle");
                alert("Microphone access denied. Please allow microphone access in your browser settings and try again.");
            } else {
                setIsListening(false);
                setSparkyState("idle");
            }
        };
        recognition.onend = () => {
            setIsListening(false);
            setSparkyState("idle");
        };
        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const isMultiple = files.length > 1;
        setUploadLabel("Analyzing...");
        setSparkyState("thinking");

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: isMultiple
                ? `📄 Uploaded ${files.length} documents: ${files.map(f => f.name).join(", ")}`
                : `📄 Uploaded: ${files[0].name}`,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);

        const thinkingMsg: ChatMessage = {
            id: (Date.now() + 0.5).toString(),
            role: "assistant",
            content: isMultiple
                ? `Analyzing ${files.length} documents one by one and merging... this takes about ${files.length * 20} seconds ⏳`
                : `Analyzing your document... this takes about 15-20 seconds ⏳`,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        try {
            // Process files SEQUENTIALLY so each sees previous uploads in Supabase
            const results = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("userId", userId);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 90000);
                const res = await fetch("/api/analyze-pdf", { method: "POST", body: formData, signal: controller.signal });
                clearTimeout(timeout);
                results.push({ file, data: await res.json() });
            }

            // Use the last result's transactions - it already contains ALL merged transactions from Supabase
            let allTransactions: Transaction[] = [];
            let mergedProfile = null;
            const analyses: { type: string; summary: string; redFlags: string[]; recommendations: string[] }[] = [];

            for (const { data } of results) {
                // Each result's transactions already includes all previous ones from Supabase
                if (data.transactions) allTransactions = data.transactions;
                if (data.profile) mergedProfile = data.profile;
                if (data.analysis) analyses.push(data.analysis);
                console.log("PDF result type:", data.type, "transactions:", data.transactions?.length, "profile:", !!data.profile);
            }

            // Always update dashboard if we got profile or transactions
            if (mergedProfile || allTransactions.length > 0) {
                onProfileUpdate(mergedProfile || profile, allTransactions);
            }

            setMessages((prev) => prev.filter(m => m.id !== thinkingMsg.id));

            let responseText = "";
            if (isMultiple && analyses.length > 0) {
                // Cross-reference insights
                responseText = `Done! Analyzed all ${files.length} documents together. Check the analysis panel below for cross-referenced insights 👇`;
                const combined = analyses.map(a =>
                    `${a.type}:\n${a.summary}\n🚨 Red Flags:\n${a.redFlags.map(f => `• ${f}`).join("\n")}\n${a.recommendations.map(r => `✅ ${r}`).join("\n")}`
                ).join("\n\n---\n\n");
            } else if (analyses.length === 1) {
                const a = analyses[0];
                const fullText = `${a.summary}\n\n🚨 Red Flags:\n${a.redFlags.map(f => `• ${f}`).join("\n")}\n\n${a.recommendations.map(r => `✅ ${r}`).join("\n")}`;
                responseText = `Done! Analyzed your ${a.type}. Red flags and actions are now on your dashboard 👉`;
                // Push red flags and actions to dashboard
                if (onDocumentAnalyzed) onDocumentAnalyzed(`${a.type}: ${a.summary}`, a.redFlags, a.recommendations, a.type);
            } else if (mergedProfile || allTransactions.length > 0) {
                responseText = `Done! Found ${allTransactions.length} transactions. Dashboard updated with your real data. ✅`;
            } else {
                responseText = `Documents analyzed. Ask me anything about them.`;
            }

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: responseText,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            await speakText(responseText.slice(0, 500));
        } catch (err) {
            setMessages((prev) => prev.filter(m => m.id !== thinkingMsg.id));
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: err instanceof Error && err.name === "AbortError"
                    ? "That took too long. Try smaller files or try again."
                    : "Something went wrong. Try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errMsg]);
            setSparkyState("idle");
        }
        setUploadLabel("Upload PDF");
        e.target.value = "";
    };

    const connectPlaid = async () => {
        try {
            const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
            const { link_token } = await res.json();
            const script = document.createElement("script");
            script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
            script.onload = () => {
                const handler = (window as unknown as { Plaid: { create: (opts: unknown) => { open: () => void } } })["Plaid"].create({
                    token: link_token,
                    onSuccess: async (public_token: string) => {
                        setSparkyState("thinking");
                        const exchangeRes = await fetch("/api/plaid/exchange-token", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ public_token }),
                        });
                        const data = await exchangeRes.json();
                        if (data.profile && data.transactions) {
                            onProfileUpdate(data.profile, data.transactions);
                            setIsPlaidConnected(true);
                            const msg: ChatMessage = {
                                id: Date.now().toString(),
                                role: "assistant",
                                content: `Your bank account is connected! I can see ${data.transactions.length} transactions. Dashboard is now live. ${data.profile.emergencyAlerts.length > 0 ? `Found ${data.profile.emergencyAlerts.length} things you should address immediately.` : "Everything looks manageable!"}`,
                                timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, msg]);
                            await speakText(msg.content.slice(0, 500));
                        }
                    },
                    onExit: () => { },
                });
                handler.open();
            };
            document.head.appendChild(script);
        } catch (err) {
            console.error("Plaid error:", err);
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ background: "transparent" }}>
            {/* Sparky Header */}
            <div className="flex flex-col items-center pt-6 pb-5 px-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <SparkyAvatar state={sparkyState} />
                <div className="mt-6 flex gap-2 flex-wrap justify-center">
                    <button onClick={isPlaidConnected ? undefined : connectPlaid}
                        className="text-xs px-4 py-2 rounded-full font-semibold transition-all duration-200"
                        style={{
                            background: isPlaidConnected ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.07)",
                            border: `1px solid ${isPlaidConnected ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.15)"}`,
                            color: isPlaidConnected ? "#4ade80" : "rgba(255,255,255,0.8)",
                            cursor: isPlaidConnected ? "default" : "pointer",
                        }}
                        onMouseEnter={e => { if (!isPlaidConnected) { (e.target as HTMLElement).style.background = "rgba(99,102,241,0.3)"; (e.target as HTMLElement).style.borderColor = "rgba(99,102,241,0.6)"; (e.target as HTMLElement).style.color = "#a5b4fc"; } }}
                        onMouseLeave={e => { if (!isPlaidConnected) { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.target as HTMLElement).style.color = "rgba(255,255,255,0.8)"; } }}>
                        {isPlaidConnected ? "✓ Bank Connected" : "🏦 Connect Bank"}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-4 py-2 rounded-full font-semibold transition-all duration-200"
                        style={{ background: "rgba(255,198,39,0.1)", border: "1px solid rgba(255,198,39,0.3)", color: "#FFC627" }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,198,39,0.25)"; (e.target as HTMLElement).style.borderColor = "rgba(255,198,39,0.6)"; (e.target as HTMLElement).style.color = "#fff7aa"; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(255,198,39,0.1)"; (e.target as HTMLElement).style.borderColor = "rgba(255,198,39,0.3)"; (e.target as HTMLElement).style.color = "#FFC627"; }}>
                        📄 {uploadLabel}
                    </button>
                    <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} multiple />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-agent"}`}>
                                {msg.role === "assistant"
                                    ? <MessageRenderer content={msg.content} />
                                    : msg.content}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>



            {/* Input */}
            <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(4,4,15,0.4)" }}>
                <div className="flex gap-2 items-center">
                    <input value={input} onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                        placeholder="Ask Sparky anything about your finances..."
                        className="glass-input flex-1 rounded-xl px-4 py-3 text-sm text-white" />
                    <button onClick={() => sendMessage(input)}
                        disabled={!input.trim() || sparkyState === "thinking"}
                        className="glass-btn-primary p-3 rounded-xl disabled:opacity-40">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
                    </button>
                    <button onClick={toggleListening}
                        className={`p-3 rounded-xl transition-all ${isListening ? "mic-active" : "glass-btn-ghost"}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isListening ? "white" : "rgba(255,255,255,0.7)"}>
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke={isListening ? "white" : "rgba(255,255,255,0.7)"} strokeWidth="2" fill="none" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {isListening ? "🔴 Listening... speak now, click mic to stop" : "Click mic then speak immediately • Upload PDF for instant analysis"}
                </p>
            </div>
        </div>
    );
}
