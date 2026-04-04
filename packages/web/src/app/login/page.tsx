"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "ログインがキャンセルされました",
  no_code: "認証コードが取得できませんでした",
  auth_failed: "認証に失敗しました。もう一度お試しください",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const error = searchParams.get("error");

  const handleLogin = () => {
    window.location.href = `/api/auth/line?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <Box padding="xxxl">
      <ContentLayout
        header={
          <Header variant="h1">
            <Box textAlign="center">試合成立エンジン</Box>
          </Header>
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
            </SpaceBetween>
          </Container>
        </Box>
      </ContentLayout>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
