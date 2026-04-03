"use client";

import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import DateInput from "@cloudscape-design/components/date-input";
import Flashbar from "@cloudscape-design/components/flashbar";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import TimeInput from "@cloudscape-design/components/time-input";
import Wizard from "@cloudscape-design/components/wizard";
import type { GameType } from "@match-engine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GAME_TYPE_OPTIONS = [
  { label: "練習", value: "PRACTICE" },
  { label: "練習試合", value: "FRIENDLY" },
  { label: "リーグ戦", value: "LEAGUE" },
  { label: "トーナメント", value: "TOURNAMENT" },
];

export default function NewGamePage() {
  const router = useRouter();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [gameType, setGameType] = useState<GameType>("FRIENDLY");
  const [gameDate, setGameDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [groundName, setGroundName] = useState("");
  const [minPlayers, setMinPlayers] = useState("9");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID,
          title,
          game_type: gameType,
          game_date: gameDate || null,
          start_time: startTime || null,
          ground_name: groundName || null,
          min_players: Number.parseInt(minPlayers) || 9,
          note: note || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/games/${data.data.id}`);
        return;
      }
      const err = await res.json();
      setError(`エラー: ${err.error}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const gameTypeLabel =
    GAME_TYPE_OPTIONS.find((o) => o.value === gameType)?.label ?? gameType;

  return (
    <ContentLayout header={<Header variant="h1">試合作成</Header>}>
      {error && (
        <Flashbar
          items={[
            {
              type: "error",
              content: error,
              dismissible: true,
              onDismiss: () => setError(null),
              id: "error",
            },
          ]}
        />
      )}
      <Wizard
        i18nStrings={{
          stepNumberLabel: (stepNumber) => `ステップ ${stepNumber}`,
          collapsedStepsLabel: (stepNumber, stepsCount) =>
            `ステップ ${stepNumber}/${stepsCount}`,
          cancelButton: "キャンセル",
          previousButton: "前へ",
          nextButton: "次へ",
          submitButton: "試合を作成",
          optional: "任意",
        }}
        onCancel={() => router.push("/dashboard")}
        onNavigate={({ detail }) =>
          setActiveStepIndex(detail.requestedStepIndex)
        }
        onSubmit={handleSubmit}
        activeStepIndex={activeStepIndex}
        isLoadingNextStep={submitting}
        steps={[
          {
            title: "基本情報",
            description: "試合のタイトル・種別・日時を入力します",
            content: (
              <Container header={<Header variant="h2">基本情報</Header>}>
                <SpaceBetween size="l">
                  <FormField label="タイトル">
                    <Input
                      value={title}
                      onChange={({ detail }) => setTitle(detail.value)}
                      placeholder="例: 4/5 vs ○○さん"
                    />
                  </FormField>
                  <FormField label="種別">
                    <Select
                      selectedOption={
                        GAME_TYPE_OPTIONS.find((o) => o.value === gameType) ??
                        null
                      }
                      onChange={({ detail }) =>
                        setGameType(
                          (detail.selectedOption.value as GameType) ??
                            "FRIENDLY",
                        )
                      }
                      options={GAME_TYPE_OPTIONS}
                    />
                  </FormField>
                  <FormField label="試合日">
                    <DateInput
                      value={gameDate}
                      onChange={({ detail }) => setGameDate(detail.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </FormField>
                  <FormField label="開始時刻">
                    <TimeInput
                      value={startTime}
                      onChange={({ detail }) => setStartTime(detail.value)}
                      format="hh:mm"
                      placeholder="HH:mm"
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            ),
          },
          {
            title: "グラウンド・相手",
            description: "グラウンドと人数の設定を行います",
            content: (
              <Container
                header={<Header variant="h2">グラウンド・相手</Header>}
              >
                <SpaceBetween size="l">
                  <FormField label="グラウンド">
                    <Input
                      value={groundName}
                      onChange={({ detail }) => setGroundName(detail.value)}
                      placeholder="例: 八部公園野球場"
                    />
                  </FormField>
                  <FormField label="最低人数">
                    <Input
                      type="number"
                      value={minPlayers}
                      onChange={({ detail }) => setMinPlayers(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            ),
          },
          {
            title: "確認",
            description: "入力内容を確認して試合を作成します",
            content: (
              <SpaceBetween size="l">
                <Container header={<Header variant="h2">入力内容</Header>}>
                  <ColumnLayout columns={2} variant="text-grid">
                    <KeyValuePairs
                      items={[
                        {
                          label: "タイトル",
                          value: title || "未入力",
                        },
                        { label: "種別", value: gameTypeLabel },
                        {
                          label: "試合日",
                          value: gameDate || "未定",
                        },
                        {
                          label: "開始時刻",
                          value: startTime || "未定",
                        },
                      ]}
                    />
                    <KeyValuePairs
                      items={[
                        {
                          label: "グラウンド",
                          value: groundName || "未定",
                        },
                        {
                          label: "最低人数",
                          value: `${minPlayers}人`,
                        },
                      ]}
                    />
                  </ColumnLayout>
                </Container>
                <Container header={<Header variant="h2">メモ</Header>}>
                  <FormField label="メモ">
                    <Textarea
                      value={note}
                      onChange={({ detail }) => setNote(detail.value)}
                      rows={3}
                    />
                  </FormField>
                </Container>
                {submitting && (
                  <Box textAlign="center" color="text-body-secondary">
                    作成中...
                  </Box>
                )}
              </SpaceBetween>
            ),
          },
        ]}
      />
    </ContentLayout>
  );
}
