import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";
import { queryRAG } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
    try {
        const { message, history, financialContext } = await req.json();
        const ragContext = await queryRAG(message);
        const response = await chat(message, history, financialContext || "", ragContext);
        return NextResponse.json({ response });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
    }
}
