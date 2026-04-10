"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

interface TeamSetupChecklistProps {
  teamId: string;
  memberCount: number;
  groundCount: number;
  opponentCount: number;
  gameCount: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  helpText: string;
  complete: boolean;
  href: string;
  actionLabel: string;
}

export function TeamSetupChecklist({
  teamId,
  memberCount,
  groundCount,
  opponentCount,
  gameCount,
}: TeamSetupChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "members",
      label: "メンバーを集める",
      helpText:
        memberCount >= 9
          ? `${memberCount}人登録済み`
          : `${memberCount}人登録済み。試合には最低9人を目安に準備します。`,
      complete: memberCount >= 9,
      href: `/teams/${teamId}`,
      actionLabel: "メンバー管理",
    },
    {
      id: "grounds",
      label: "グラウンドを登録する",
      helpText:
        groundCount > 0
          ? `${groundCount}件登録済み`
          : "まずは候補の球場を1件以上登録します。",
      complete: groundCount > 0,
      href: `/teams/${teamId}/grounds`,
      actionLabel: "グラウンド管理",
    },
    {
      id: "opponents",
      label: "対戦相手を登録する",
      helpText:
        opponentCount > 0
          ? `${opponentCount}件登録済み`
          : "練習試合の打診先を登録しておくと日程調整が早くなります。",
      complete: opponentCount > 0,
      href: `/teams/${teamId}/opponents`,
      actionLabel: "対戦相手を追加",
    },
    {
      id: "games",
      label: "最初の活動を作成する",
      helpText:
        gameCount > 0
          ? `${gameCount}件の活動あり`
          : "試合または練習を作ると出欠確認が始まります。",
      complete: gameCount > 0,
      href: "/games/new",
      actionLabel: "活動を作成",
    },
  ];

  const completedCount = items.filter((item) => item.complete).length;

  if (completedCount === items.length) {
    return null;
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={`${completedCount}/${items.length} 完了`}
        >
          初期セットアップ
        </Header>
      }
    >
      <SpaceBetween size="m">
        <Box variant="p">
          草野球の運営を回し始めるために必要な準備を並べています。
          未完了の項目から進めてください。
        </Box>

        {items.map((item) => (
          <div key={item.id}>
            <SpaceBetween size="xs" direction="horizontal">
              <StatusIndicator type={item.complete ? "success" : "pending"}>
                {item.complete ? "完了" : "未完了"}
              </StatusIndicator>
              <Box fontWeight="bold">{item.label}</Box>
            </SpaceBetween>
            <Box color="text-body-secondary">{item.helpText}</Box>
            {!item.complete && (
              <Box padding={{ top: "xs" }}>
                <Button href={item.href}>{item.actionLabel}</Button>
              </Box>
            )}
          </div>
        ))}
      </SpaceBetween>
    </Container>
  );
}
