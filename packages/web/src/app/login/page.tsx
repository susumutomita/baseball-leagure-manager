"use client";

import { createClient } from "@/lib/supabase/client";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "line" as "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
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
