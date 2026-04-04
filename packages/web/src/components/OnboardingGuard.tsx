"use client";

import { useRouter } from "next/navigation";
import { Onboarding } from "./Onboarding";

/**
 * 初回ログイン時にオンボーディングウィザードを表示する。
 * 完了後はダッシュボードをリロードしてチーム作成後の状態を反映する。
 */
export function OnboardingGuard() {
  const router = useRouter();

  return (
    <Onboarding
      onComplete={() => {
        router.refresh();
      }}
    />
  );
}
