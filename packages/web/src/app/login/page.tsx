"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const error = searchParams.get("error");

  const handleLogin = () => {
    window.location.href = `/api/auth/line?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <ContentLayout
      defaultPadding
      header={
        <Box padding={{ top: "xxxl" }}>
          <Header variant="h1">
            <Box textAlign="center">mound</Box>
          </Header>
        </Box>
      }
    >
      <Box margin={{ left: "xxxl", right: "xxxl" }}>
        <Container header={<Header variant="h2">ログイン</Header>}>
          <SpaceBetween size="l">
            <Box variant="p" textAlign="center">
              ログインして試合を管理しましょう
            </Box>
            {error && (
              <Box textAlign="center" color="text-status-error">
                {ERROR_MESSAGES[error] ?? "エラーが発生しました"}
              </Box>
            )}
            <Box textAlign="center">
              <Button variant="primary" onClick={handleLogin}>
                LINE でログイン
              </Button>
            </Box>
            <Box
              textAlign="center"
              color="text-body-secondary"
              fontSize="body-s"
            >
              LINE アカウントで認証します
            </Box>
            <Box textAlign="center">
              <Link href="/" fontSize="body-s">
                トップページに戻る
              </Link>
            </Box>
          </SpaceBetween>
        </Container>
      </Box>
    </ContentLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
