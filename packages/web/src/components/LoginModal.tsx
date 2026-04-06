"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "ログインがキャンセルされました",
  no_code: "認証コードが取得できませんでした",
  auth_failed: "認証に失敗しました。もう一度お試しください",
  invalid_state: "セッションが無効です。もう一度お試しください",
  missing_env:
    "サーバー設定エラー: LINE_CHANNEL_ID / LINE_CHANNEL_SECRET が未設定です",
  token_exchange: "LINEとの通信に失敗しました。もう一度お試しください",
  missing_secret:
    "サーバー設定エラー: SESSION_SECRET または LINE_CHANNEL_SECRET が未設定です",
};

interface LoginModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function LoginModal({ visible, onDismiss }: LoginModalProps) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = `/api/auth/line?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header="ログイン"
      size="small"
    >
      <SpaceBetween size="l">
        <Box variant="p" textAlign="center">
          LINE アカウントでログインして
          <br />
          チーム運営を始めましょう
        </Box>
        {error && (
          <Box textAlign="center" color="text-status-error">
            {ERROR_MESSAGES[error] ?? "エラーが発生しました"}
          </Box>
        )}
        <Box textAlign="center">
          <Button
            variant="primary"
            onClick={handleLogin}
            loading={loading}
            disabled={loading}
          >
            LINE でログイン
          </Button>
        </Box>
        <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
          {loading
            ? "LINE の認証画面に移動しています..."
            : "LINE アカウントで認証します"}
        </Box>
        <Box textAlign="center" fontSize="body-s">
          <SpaceBetween size="m" direction="horizontal">
            <Link href="/terms" fontSize="body-s">
              利用規約
            </Link>
            <Link href="/privacy" fontSize="body-s">
              プライバシーポリシー
            </Link>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </Modal>
  );
}
