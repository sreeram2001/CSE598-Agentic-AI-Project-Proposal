import { NextRequest, NextResponse } from "next/server";
import { queryRAG } from "@/lib/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { profile, transactions, documentContext } = await req.json();

    // Build targeted RAG queries - include document context if available
    const queries = [
      documentContext ? `renters insurance ${documentContext.slice(0, 100)}` : "renters insurance coverage cost student",
      "auto insurance discounts young driver rideshare",
      "life insurance term whole universal student",
      "bundling auto renters discount savings",
      documentContext ? `insurance requirements lease agreement ${documentContext.slice(0, 80)}` : "health insurance supplemental coverage",
      "claims process how to file State Farm",
    ];

    // Query RAG for each topic
    const ragResults = await Promise.all(queries.map(q => queryRAG(q, 3)));
    const ragContext = ragResults.map((r, i) => `[${queries[i]}]:\n${r}`).join("\n\n");

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = `You are a State Farm insurance advisor. Based on the user's financial profile, any uploaded documents, and the State Farm knowledge base, provide personalized insurance recommendations.

User Financial Profile:
- Monthly Income: $${profile?.monthlyIncome || 0}
- Monthly Expenses: $${profile?.monthlyExpenses || 0}
- Balance: $${profile?.balance || 0}
- Risk Score: ${profile?.riskScore || 5}/10
- Risk Reason: ${profile?.riskReason || "Unknown"}

Top Spending Categories: ${profile?.spendingByCategory?.map((c: { name: string; value: number }) => `${c.name}: $${c.value}`).join(", ") || "Unknown"}

State Farm Knowledge Base:
${ragContext}

Return a JSON object with this exact structure:
{
  "coverageGaps": [
    {"type": "Renters Insurance", "risk": "high|medium|low", "reason": "specific reason based on profile", "monthlyCost": "$12-18/mo", "priority": 1}
  ],
  "recommendedProducts": [
    {"name": "State Farm Renters Insurance", "category": "renters", "why": "specific reason", "monthlyCost": "$12-18/mo", "keyBenefit": "covers your laptop and electronics", "discountAvailable": true, "discountReason": "Bundle with auto for 17% off"}
  ],
  "savingsOpportunities": [
    {"title": "Bundle Auto + Renters", "savings": "$25/mo", "description": "specific detail from knowledge base"}
  ],
  "educationalTips": [
    {"topic": "What is a deductible?", "content": "plain english explanation", "relevance": "why this matters for this user"}
  ],
  "riskAlerts": [
    {"alert": "specific risk", "severity": "high|medium|low", "solution": "specific State Farm product"}
  ]
}

Be specific, use real State Farm product names and pricing from the knowledge base. Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse insights");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Insurance insights error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
