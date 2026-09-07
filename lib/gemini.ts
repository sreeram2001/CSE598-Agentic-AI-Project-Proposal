import { GoogleGenerativeAI } from "@google/generative-ai";
import { FinancialProfile, Transaction, DocumentAnalysis } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeFinancialProfile(
    transactions: Transaction[],
    userContext: string
): Promise<FinancialProfile> {
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = `Analyze these transactions and return a financial profile JSON. Be fast and concise.

User: ${userContext}
Transactions (up to 50): ${JSON.stringify(transactions.slice(0, 50))}

Return ONLY this JSON:
{"monthlyIncome":0,"monthlyExpenses":0,"balance":0,"savingsRate":0,"riskScore":5,"riskReason":"one sentence","emergencyFund":0,"spendingByCategory":[{"name":"Food","value":0,"color":"#FFC627"}],"emergencyAlerts":[{"id":"1","severity":"high","title":"...","description":"...","action":"..."}],"recommendations":[{"id":"1","product":"Renters Insurance","reason":"...","monthlyCost":"$12-18/mo","priority":"high","provider":"State Farm"}],"savingsOpportunities":[{"id":"1","title":"...","monthlySavings":25,"description":"..."}]}

Rules: EXACTLY 3 recommendations, EXACTLY 3 savingsOpportunities. Colors: #FFC627 #8C1D40 #22c55e #3b82f6 #f59e0b #ec4899 #8b5cf6. Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse financial profile");
    return JSON.parse(jsonMatch[0]);
}

export async function analyzePDF(
    base64Data: string,
    mimeType: string,
    _ragContext: string
): Promise<{ transactions?: Transaction[]; analysis?: DocumentAnalysis; type: string }> {
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = "Analyze this financial document quickly. Identify type and extract key info.\n\nType options: bank_statement, credit_statement, insurance_policy, lease, loan_agreement, other\n\nFor bank_statement or credit_statement:\n{\"type\":\"bank_statement\",\"transactions\":[{\"id\":\"1\",\"date\":\"2024-03-15\",\"description\":\"Walmart\",\"category\":\"Groceries\",\"amount\":45.23,\"type\":\"debit\",\"anomaly\":false}]}\n\nFor insurance_policy, lease, loan_agreement:\n{\"type\":\"lease\",\"analysis\":{\"type\":\"Apartment Lease\",\"summary\":\"2-3 sentence summary\",\"redFlags\":[\"flag 1\",\"flag 2\"],\"keyTerms\":[{\"term\":\"Deductible\",\"explanation\":\"one sentence\"}],\"recommendations\":[\"action 1\",\"action 2\"]}}\n\nCategories: Groceries, Food & Dining, Transport, Entertainment, Subscriptions, Income, Rent, Insurance, Healthcare, Shopping, Other.\nFlag anomalies with anomaly:true and anomalyReason. Max 5 red flags, max 5 recommendations. Return ONLY valid JSON.";

    const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse document");
    return JSON.parse(jsonMatch[0]);
}

export async function chat(
    message: string,
    history: { role: string; content: string }[],
    financialContext: string,
    ragContext: string
): Promise<string> {
    const systemPrompt = `You are Sparky, ASU's friendly AI financial advisor built into SparkyFi. You help students and underserved communities make smart financial decisions.

Your personality: warm, direct, practical. You speak like a knowledgeable friend, not a banker. No jargon without explanation.

Current user financial context:
${financialContext}

Knowledge base context:
${ragContext}

Rules:
- Give specific, actionable advice based on their actual financial situation
- When someone is in crisis (low balance, missed payments), give immediate concrete steps
- Always mention relevant State Farm products when appropriate (renters insurance, auto, life)
- Reference real resources: 211 hotline, ASU emergency aid, CFPB tools
- Keep responses SHORT - maximum 3 bullet points, no more
- No long paragraphs, no fluff, no excessive caveats
- Stick to facts you know, do not hallucinate specific URLs, phone numbers, or addresses
- If you detect financial danger, be direct about it
- Always end with ONE clear next action they can take today
- Never use more than 150 words total in a response`;

    const model = genAI.getGenerativeModel({
        model: "models/gemini-2.5-flash",
        systemInstruction: systemPrompt,
    });

    const contents = [
        ...history.map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
        })),
        { role: "user", parts: [{ text: message }] },
    ];

    const result = await model.generateContent({ contents });
    return result.response.text();
}
