"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">試合成立エンジン</h1>
          <p className="mt-2 text-sm text-gray-500">
            ログインして試合を管理しましょう
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-3 text-sm font-medium text-white hover:bg-[#05b04d] transition-colors"
        >
          LINEでログイン
        </button>
        <p className="text-center text-xs text-gray-400">
          LINE アカウントで認証します
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
