import { NextResponse } from "next/server";
import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from "plaid";

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

export async function POST() {
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: "sparkyfi-user" },
            client_name: "SparkyFi",
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: "en",
        });
        return NextResponse.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error("Plaid link token error:", error);
        return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
    }
}
