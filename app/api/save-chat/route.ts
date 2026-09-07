import { NextResponse } from "next/server";
// Supabase removed - chat history is in-memory only
export async function POST() {
    return NextResponse.json({ ok: true });
}
