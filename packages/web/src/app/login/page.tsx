"use client";

import { createClient } from "@/lib/supabase/client";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleLineLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        // biome-ignore lint/suspicious/noExplicitAny: LINE is a valid Supabase provider but not in the default type union
        provider: "line" as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (authError) {
        if (authError.message.includes("Unsupported provider")) {
          setError(
            "LINE ログインは現在設定中です。メールアドレスでログインしてください。",
          );
        } else {
          setError(authError.message);
        }
      }
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email) {
      setError("メールアドレスを入力してください。");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding="xxxl">
      <ContentLayout
        header={
          <Header variant="h1">
            <Box textAlign="center">mound</Box>
          </Header>
        }
      >
        <Box margin={{ left: "xxxl", right: "xxxl" }}>
          <Container header={<Header variant="h2">ログイン</Header>}>
            <SpaceBetween size="l">
              {error && <Alert type="error">{error}</Alert>}

              {magicLinkSent ? (
                <Alert type="success">
                  {email}{" "}
                  にログインリンクを送信しました。メールを確認してください。
                </Alert>
              ) : (
                <>
                  <Box variant="p" textAlign="center">
                    ログインして試合を管理しましょう
                  </Box>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleLineLogin}
                    loading={loading}
                  >
                    LINE でログイン
                  </Button>

                  <Box
                    textAlign="center"
                    color="text-body-secondary"
                    fontSize="body-s"
                  >
                    または
                  </Box>

                  <FormField label="メールアドレス">
                    <Input
                      type="email"
                      value={email}
                      onChange={({ detail }) => setEmail(detail.value)}
                      placeholder="you@example.com"
                    />
                  </FormField>

                  <Button
                    fullWidth
                    onClick={handleEmailLogin}
                    loading={loading}
                  >
                    メールでログイン
                  </Button>
                </>
              )}

              <Box textAlign="center">
                <Link href="/" fontSize="body-s">
                  トップページに戻る
                </Link>
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
