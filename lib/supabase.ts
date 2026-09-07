import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function signInWithEmail(email: string) {
    return supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
    });
}

export async function signOut() {
    return supabase.auth.signOut();
}
