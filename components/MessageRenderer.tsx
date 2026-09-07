"use client";

export default function MessageRenderer({ content }: { content: string }) {
    // Split into sections
    const lines = content.split("\n").filter(l => l.trim());

    const sections: { type: "text" | "redflag" | "action" | "header"; text: string }[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("🚨") || trimmed.startsWith("• ") && sections.some(s => s.type === "redflag")) {
            sections.push({ type: "redflag", text: trimmed.replace(/^[•🚨]\s*/, "") });
        } else if (trimmed.startsWith("• ") && content.includes("🚨")) {
            sections.push({ type: "redflag", text: trimmed.replace(/^•\s*/, "") });
        } else if (trimmed.startsWith("✅")) {
            sections.push({ type: "action", text: trimmed.replace(/^✅\s*/, "") });
        } else if (trimmed.startsWith("🚨 Red Flags:") || trimmed === "🚨 Red Flags:") {
            sections.push({ type: "header", text: "🚨 Red Flags" });
        } else if (trimmed.length > 0) {
            sections.push({ type: "text", text: trimmed });
        }
    }

    // If no special formatting detected, just render plain
    const hasFormatting = sections.some(s => s.type === "redflag" || s.type === "action");
    if (!hasFormatting) {
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="flex flex-col gap-2 text-sm">
            {sections.map((s, i) => {
                if (s.type === "header") return null;
                if (s.type === "text") return (
                    <p key={i} className="leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>{s.text}</p>
                );
                if (s.type === "redflag") return (
                    <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                        <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,200,200,0.9)" }}>{s.text}</p>
                    </div>
                );
                if (s.type === "action") return (
                    <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                        <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                        <p className="text-xs leading-relaxed" style={{ color: "rgba(200,255,220,0.9)" }}>{s.text}</p>
                    </div>
                );
                return null;
            })}
        </div>
    );
}
