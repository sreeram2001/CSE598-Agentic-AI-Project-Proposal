import { NextRequest, NextResponse } from "next/server";
import { PlaidApi, PlaidEnvironments, Configuration } from "plaid";
import { analyzeFinancialProfile } from "@/lib/gemini";
import { Transaction } from "@/lib/types";

const config = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
            "PLAID-SECRET": process.env.PLAID_SANDBOX_SECRET!,
        },
    },
});

const plaidClient = new PlaidApi(config);

export async function POST(req: NextRequest) {
    try {
        const { public_token } = await req.json();
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
        const accessToken = exchangeResponse.data.access_token;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const txResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: thirtyDaysAgo.toISOString().split("T")[0],
            end_date: now.toISOString().split("T")[0],
        });

        const transactions: Transaction[] = txResponse.data.transactions.map((tx, i) => ({
            id: tx.transaction_id || `tx-${i}`,
            date: tx.date,
            description: tx.name,
            category: tx.personal_finance_category?.primary || tx.category?.[0] || "Other",
            amount: Math.abs(tx.amount),
            type: tx.amount < 0 ? "credit" : "debit",
            anomaly: false,
        }));

        const profile = await analyzeFinancialProfile(transactions, "Bank account connected via Plaid");
        return NextResponse.json({ transactions, profile });
    } catch (error) {
        console.error("Plaid exchange error:", error);
        return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
    }
}
