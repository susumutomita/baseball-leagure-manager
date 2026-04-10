import { getDevLineUserId, isDevLoginEnabled } from "@/lib/dev-auth";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/line-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function devLoginDisabledResponse() {
  return new NextResponse("Not Found", { status: 404 });
}

function getSafeRedirect(input: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }
  return input;
}

/** GET /api/dev/login — 開発用の疑似ログイン */
export async function GET(request: Request) {
  if (!isDevLoginEnabled()) {
    return devLoginDisabledResponse();
  }

  const url = new URL(request.url);
  const memberId = url.searchParams.get("member_id");
  const redirect = getSafeRedirect(url.searchParams.get("redirect"));

  if (!memberId) {
    return NextResponse.redirect(
      new URL("/dev/login?error=missing_member", url.origin),
    );
  }

  const supabase = createAdminClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, line_user_id, status")
    .eq("id", memberId)
    .single();

  if (error || !member || member.status !== "ACTIVE") {
    return NextResponse.redirect(
      new URL("/dev/login?error=member_not_found", url.origin),
    );
  }

  const lineUserId = member.line_user_id ?? getDevLineUserId(member.id);

  if (!member.line_user_id) {
    const { error: updateError } = await supabase
      .from("members")
      .update({ line_user_id: lineUserId })
      .eq("id", member.id);

    if (updateError) {
      return NextResponse.redirect(
        new URL("/dev/login?error=member_update_failed", url.origin),
      );
    }
  }

  const sessionToken = await createSessionToken({
    userId: lineUserId,
    displayName: member.name,
  });

  const response = NextResponse.redirect(new URL(redirect, url.origin));
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
