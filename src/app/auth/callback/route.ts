import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // PKCE flow — email confirmation / magic link
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectTo = type === "invite" ? "/set-password" : next;
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Token hash flow — invite / recovery
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "signup" | "recovery" | "email_change" | "email",
    });
    if (!error) {
      const redirectTo = type === "invite" ? "/set-password" : next;
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", origin));
}
