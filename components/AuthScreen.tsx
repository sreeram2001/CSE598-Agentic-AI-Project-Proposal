"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithEmail } from "@/lib/supabase";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!email.trim()) return;
        setLoading(true);
        setError("");
        const { error } = await signInWithEmail(email);
        if (error) { setError(error.message); setLoading(false); return; }
        setSent(true);
        setLoading(false);
    };

    return (
        <div className="app-bg flex items-center justify-center min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl p-10 w-full max-w-md flex flex-col items-center gap-6"
            >
                {/* Sparky */}
                <img src="/sparky.png" alt="Sparky" width={100} height={100}
                    style={{ objectFit: "contain", mixBlendMode: "screen", filter: "drop-shadow(0 0 20px rgba(255,198,39,0.5))" }} />

                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white">SparkyFi</h1>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>ASU's AI financial advisor</p>
                </div>

                {!sent ? (
                    <>
                        <div className="w-full">
                            <p className="text-sm mb-3 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                                Sign in with your email to save your financial data
                            </p>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                                placeholder="your@email.com"
                                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white mb-3"
                            />
                            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !email.trim()}
                                className="glass-btn-primary w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                            >
                                {loading ? "Sending..." : "Send Login Link"}
                            </button>
                        </div>
                        <button
                            onClick={onAuth}
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                            Continue as guest (data won't be saved)
                        </button>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="text-4xl mb-3">📬</div>
                        <p className="text-base font-semibold text-white">Check your email</p>
                        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                            We sent a magic link to <span style={{ color: "#FFC627" }}>{email}</span>
                        </p>
                        <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                            Click the link in your email to sign in
                        </p>
                        <button onClick={onAuth} className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                            Skip for now
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
