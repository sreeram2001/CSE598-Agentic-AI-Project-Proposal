import { NextResponse } from "next/server";
import { seedKnowledgeBase } from "@/lib/pinecone";

export async function POST() {
    try {
        const result = await seedKnowledgeBase();
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: "Failed to seed knowledge base" }, { status: 500 });
    }
}
