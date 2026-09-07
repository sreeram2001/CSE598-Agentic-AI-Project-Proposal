import { NextResponse } from "next/server";
// Supabase removed - data is in-memory only
export async function GET() {
    return NextResponse.json({ transactions: [], profile: null, chatHistory: [] });
}
