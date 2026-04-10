"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useState } from "react";

interface MemberInvitePanelProps {
  teamId: string;
  memberId: string;
  title?: string;
  description?: string;
}

export function MemberInvitePanel({
  teamId,
  memberId,
  title = "メンバー招待",
  description = "LINE グループに共有する招待リンクを発行します",
}: MemberInvitePanelProps) {
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const generateInviteLink = async () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setMessage({
        type: "error",
        text: "LIFF ID が未設定です。環境変数を確認してください。",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const expiresAt = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 14,
      ).toISOString();

      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_type: "MEMBER",
          created_by: memberId,
          expires_at: expiresAt,
          max_uses: 50,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: json?.error?.message ?? "招待リンクの生成に失敗しました",
        });
        return;
      }

      const code = json?.data?.invite_code as string | undefined;
      if (!code) {
        setMessage({
          type: "error",
          text: "招待コードの生成に失敗しました",
        });
        return;
      }

      setInviteLink(`https://liff.line.me/${liffId}/register?code=${code}`);
      setMessage({
        type: "success",
        text: "招待リンクを生成しました。LINE グループで共有できます。",
      });
    } catch {
      setMessage({
        type: "error",
        text: "通信エラーが発生しました。もう一度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage({
        type: "success",
        text: "招待リンクをコピーしました",
      });
    } catch {
      setMessage({
        type: "error",
        text: "クリップボードへのコピーに失敗しました",
      });
    }
  };

  return (
    <Container
      header={
        <Header variant="h2" description={description}>
          {title}
        </Header>
      }
    >
      <SpaceBetween size="m">
        {message && (
          <Box
            color={
              message.type === "success"
                ? "text-status-success"
                : "text-status-error"
            }
          >
            {message.text}
          </Box>
        )}

        <SpaceBetween direction="horizontal" size="xs">
          <Button loading={loading} onClick={generateInviteLink}>
            招待リンクを生成
          </Button>
          <Button disabled={!inviteLink} onClick={copyInviteLink}>
            コピー
          </Button>
        </SpaceBetween>

        {inviteLink && (
          <SpaceBetween size="xs">
            <Box variant="awsui-key-label">招待リンク</Box>
            <Input value={inviteLink} readOnly />
            <Box variant="small" color="text-body-secondary">
              有効期限は 14 日、最大 50 回まで利用できます。
            </Box>
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Container>
  );
}
