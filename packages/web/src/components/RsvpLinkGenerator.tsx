"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useState } from "react";

interface RsvpToken {
  memberId: string;
  memberName: string;
  rsvpId: string;
  token: string;
  url: string;
}

interface RsvpLinkGeneratorProps {
  gameId: string;
}

export function RsvpLinkGenerator({ gameId }: RsvpLinkGeneratorProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<RsvpToken[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/rsvp-tokens`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "トークン生成に失敗しました");
        return;
      }
      const json = await res.json();
      setTokens(json.data ?? []);
      setVisible(true);
    } catch {
      setError("ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setFlash([
      {
        type: "success",
        content: `${name}さんのリンクをコピーしました`,
        dismissible: true,
        onDismiss: () => setFlash([]),
      },
    ]);
  };

  const copyAll = () => {
    const text = tokens.map((t) => `${t.memberName}: ${t.url}`).join("\n");
    navigator.clipboard.writeText(text);
    setFlash([
      {
        type: "success",
        content: `${tokens.length}人分のリンクをコピーしました`,
        dismissible: true,
        onDismiss: () => setFlash([]),
      },
    ]);
  };

  return (
    <>
      <Button onClick={handleGenerate} loading={loading}>
        出欠リンクを生成
      </Button>

      {error && (
        <Box color="text-status-error" fontSize="body-s">
          {error}
        </Box>
      )}

      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        header="出欠回答リンク"
        size="large"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={copyAll}>全員分をコピー</Button>
              <Button variant="primary" onClick={() => setVisible(false)}>
                閉じる
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Flashbar items={flash} />
          <Box variant="p" fontSize="body-s" color="text-body-secondary">
            各メンバーにリンクを送信してください。LINEやメールでシェアできます。
          </Box>
          <Table
            columnDefinitions={[
              {
                id: "name",
                header: "メンバー",
                cell: (item) => item.memberName,
              },
              {
                id: "url",
                header: "リンク",
                cell: (item) => (
                  <Box fontSize="body-s" variant="code">
                    {item.url}
                  </Box>
                ),
                maxWidth: 400,
              },
              {
                id: "copy",
                header: "",
                cell: (item) => (
                  <Button
                    variant="inline-link"
                    onClick={() => copyUrl(item.url, item.memberName)}
                  >
                    コピー
                  </Button>
                ),
                width: 80,
              },
            ]}
            items={tokens}
            variant="embedded"
          />
        </SpaceBetween>
      </Modal>
    </>
  );
}
