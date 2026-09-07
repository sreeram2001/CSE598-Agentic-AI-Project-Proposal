import { NextRequest, NextResponse } from "next/server";
import { analyzePDF, analyzeFinancialProfile } from "@/lib/gemini";
import { queryRAG } from "@/lib/pinecone";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = file.type || "application/pdf";

        const [ragContext, result] = await Promise.all([
            queryRAG("financial document insurance lease loan bank statement"),
            analyzePDF(base64, mimeType, ""),
        ]);

        if (result.type === "bank_statement" || result.type === "credit_statement") {
            const transactions = (result.transactions || []).map((tx, index) => ({
                ...tx,
                id: Buffer.from(`${tx.date}-${tx.description}-${tx.amount}-${index}`).toString("base64").slice(0, 24),
            }));

            const profile = await analyzeFinancialProfile(
                transactions,
                `User has ${transactions.length} transactions`
            );

            return NextResponse.json({ ...result, transactions, profile });
        }

        const enrichedResult = await analyzePDF(base64, mimeType, ragContext);
        return NextResponse.json(enrichedResult);

    } catch (error) {
        console.error("PDF analysis error:", error);
        return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 });
    }
}
