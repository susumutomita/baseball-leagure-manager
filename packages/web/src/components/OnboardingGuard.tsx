"use client";

import { Onboarding } from "./Onboarding";

/**
 * 初回ログイン時にオンボーディングウィザードを表示する。
 * 完了後はダッシュボードをリロードしてチーム作成後の状態を反映する。
 */
export function OnboardingGuard() {
  return (
    <Onboarding
      onComplete={() => {
        // チーム作成後はフルリロードしてManagerLayoutの認証情報を再取得
        window.location.href = "/dashboard";
      }}
    />
  );
}
