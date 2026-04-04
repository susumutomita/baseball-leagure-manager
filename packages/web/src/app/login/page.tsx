"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import styles from "./page.module.css";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "ログインがキャンセルされました",
  no_code: "認証コードが取得できませんでした",
  auth_failed: "認証に失敗しました。もう一度お試しください",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const error = searchParams.get("error");

  const handleLogin = () => {
    window.location.href = `/api/auth/line?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>mound</div>
        <p className={styles.subtitle}>試合成立エンジン</p>
        <h1 className={styles.heading}>ログイン</h1>
        <p className={styles.description}>ログインして試合を管理しましょう</p>
        {error && (
          <p className={styles.note} style={{ color: "#ff6b6b" }}>
            {ERROR_MESSAGES[error] ?? "エラーが発生しました"}
          </p>
        )}
        <button
          type="button"
          className={styles.lineButton}
          onClick={handleLogin}
        >
          <span className={styles.lineIcon}>
            <svg
              role="img"
              aria-label="LINE"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </span>
          LINE でログイン
        </button>
        <p className={styles.note}>LINE アカウントで認証します</p>
        <Link href="/" className={styles.backLink}>
          トップページに戻る
        </Link>
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
