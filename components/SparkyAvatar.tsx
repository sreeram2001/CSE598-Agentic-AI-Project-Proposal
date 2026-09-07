"use client";
import { motion } from "framer-motion";

type SparkyState = "idle" | "listening" | "thinking" | "speaking";

export default function SparkyAvatar({ state }: { state: SparkyState }) {
    const isActive = state !== "idle";

    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 240 }}>

            {/* Fire glow layers - only when active */}
            {isActive && (
                <>
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: 210, height: 210,
                            background: "radial-gradient(ellipse at 50% 70%, #ff6a00 0%, #ee0979 40%, transparent 75%)",
                            filter: "blur(28px)",
                            bottom: 10,
                        }}
                        animate={{ opacity: [0.8, 1, 0.8], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: 170, height: 170,
                            background: "radial-gradient(ellipse at 50% 60%, #FFC627 0%, #ff6a00 50%, transparent 80%)",
                            filter: "blur(18px)",
                            bottom: 15,
                        }}
                        animate={{ opacity: [0.9, 1, 0.9], scale: [1, 1.25, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                    />
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: 110, height: 110,
                            background: "radial-gradient(ellipse at 50% 50%, #fff7aa 0%, #FFC627 60%, transparent 100%)",
                            filter: "blur(12px)",
                            bottom: 20,
                        }}
                        animate={{ opacity: [0.95, 1, 0.95], scale: [1, 1.35, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                </>
            )}

            {/* Listening / speaking pulse rings */}
            {(state === "listening" || state === "speaking") && (
                <>
                    <motion.div className="absolute rounded-full border-2"
                        style={{ borderColor: state === "listening" ? "#FFC627" : "#0ea5e9", width: 155, height: 155 }}
                        animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                    />
                    <motion.div className="absolute rounded-full border-2"
                        style={{ borderColor: state === "listening" ? "#FFC627" : "#0ea5e9", width: 155, height: 155 }}
                        animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: 0.4 }}
                    />
                </>
            )}

            {/* Sparky image */}
            <motion.div
                className="relative z-10"
                style={{ width: 130, height: 130 }}
                animate={
                    state === "thinking" ? { y: [0, -5, 0] } :
                        state === "speaking" ? { scale: [1, 1.05, 1] } :
                            state === "listening" ? { rotate: [0, -2, 2, 0] } :
                                { y: [0, -3, 0] }
                }
                transition={{
                    duration: state === "idle" ? 2.5 : state === "speaking" ? 0.4 : 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/sparky.png"
                    alt="Sparky the Sun Devil"
                    width={130}
                    height={130}
                    style={{
                        objectFit: "contain",
                        mixBlendMode: "screen",
                        filter: `drop-shadow(0 0 12px rgba(255,198,39,0.6)) ${isActive ? "brightness(1.1)" : "brightness(1)"}`,
                    }}
                />
            </motion.div>

            {/* State label - listening/speaking only, no idle label */}
            {state !== "idle" && (
                <div className="absolute -bottom-1 text-xs font-semibold tracking-wide whitespace-nowrap z-20"
                    style={{ color: state === "listening" ? "#FFC627" : state === "speaking" ? "#0ea5e9" : "#a5b4fc" }}>
                    {state === "listening" && "🎙️ Listening..."}
                    {state === "thinking" && "💭 Thinking..."}
                    {state === "speaking" && "🔊 Speaking..."}
                </div>
            )}
        </div>
    );
}
