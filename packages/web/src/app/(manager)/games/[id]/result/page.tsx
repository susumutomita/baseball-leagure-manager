"use client";

import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Flashbar from "@cloudscape-design/components/flashbar";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const INNINGS_OPTIONS = Array.from({ length: 9 }, (_, i) => ({
  label: `${i + 1}イニング`,
  value: String(i + 1),
}));

const RESULT_LABELS: Record<string, string> = {
  WIN: "勝ち",
  LOSE: "負け",
  DRAW: "引き分け",
};

function calculateResult(
  ourScore: number | null,
  opponentScore: number | null,
): string | null {
  if (ourScore === null || opponentScore === null) return null;
  if (ourScore > opponentScore) return "WIN";
  if (ourScore < opponentScore) return "LOSE";
  return "DRAW";
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState("");
  const [ourScore, setOurScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [innings, setInnings] = useState("7");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingResult, setExistingResult] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load game info
      const gameRes = await fetch(`/api/games/${id}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGameTitle(gameData.data.title);
      }

      // Load existing result
      const resultRes = await fetch(`/api/games/${id}/results`);
      if (resultRes.ok) {
        const resultData = await resultRes.json();
        const result = resultData.data;
        if (result) {
          setExistingResult(true);
          if (result.our_score !== null) setOurScore(String(result.our_score));
          if (result.opponent_score !== null)
            setOpponentScore(String(result.opponent_score));
          if (result.innings) setInnings(String(result.innings));
          if (result.note) setNote(result.note);
        }
      }
    } catch {
      setError("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ourScoreNum = ourScore === "" ? null : Number(ourScore);
  const opponentScoreNum = opponentScore === "" ? null : Number(opponentScore);
  const autoResult = calculateResult(ourScoreNum, opponentScoreNum);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        our_score: ourScoreNum,
        opponent_score: opponentScoreNum,
        result: autoResult,
        innings: Number(innings),
        note: note || null,
      };

      const res = await fetch(`/api/games/${id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "保存に失敗しました");
        return;
      }

      setSuccess(true);
      setExistingResult(true);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: gameTitle || "試合", href: `/games/${id}` },
            { text: "試合結果", href: `/games/${id}/result` },
          ]}
        />
      }
      header={
        <Header variant="h1" description={gameTitle}>
          試合結果入力
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Flashbar
            items={[
              {
                type: "error",
                content: error,
                dismissible: true,
                onDismiss: () => setError(null),
                id: "result-error",
              },
            ]}
          />
        )}

        {success && (
          <Flashbar
            items={[
              {
                type: "success",
                content: existingResult
                  ? "試合結果を更新しました"
                  : "試合結果を保存しました",
                dismissible: true,
                onDismiss: () => setSuccess(false),
                id: "result-success",
              },
            ]}
          />
        )}

        {loading ? (
          <Container header={<Header variant="h2">試合結果</Header>}>
            <Box textAlign="center" padding="xxl">
              <StatusIndicator type="loading">読み込み中...</StatusIndicator>
            </Box>
          </Container>
        ) : (
          <Container
            header={
              <Header
                variant="h2"
                description={existingResult ? "既存の結果を編集中" : "新規入力"}
              >
                スコア入力
              </Header>
            }
          >
            <SpaceBetween size="l">
              <SpaceBetween direction="horizontal" size="xl">
                <FormField label="自チーム得点" constraintText="整数で入力">
                  <Input
                    type="number"
                    value={ourScore}
                    onChange={({ detail }) => setOurScore(detail.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </FormField>

                <Box
                  fontSize="display-l"
                  fontWeight="bold"
                  padding={{ top: "l" }}
                >
                  -
                </Box>

                <FormField label="相手チーム得点" constraintText="整数で入力">
                  <Input
                    type="number"
                    value={opponentScore}
                    onChange={({ detail }) => setOpponentScore(detail.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </FormField>
              </SpaceBetween>

              {autoResult && (
                <FormField label="結果（自動計算）">
                  <StatusIndicator
                    type={
                      autoResult === "WIN"
                        ? "success"
                        : autoResult === "LOSE"
                          ? "error"
                          : "info"
                    }
                  >
                    {RESULT_LABELS[autoResult]}
                  </StatusIndicator>
                </FormField>
              )}

              <FormField label="イニング数">
                <Select
                  selectedOption={
                    INNINGS_OPTIONS.find((o) => o.value === innings) ??
                    INNINGS_OPTIONS[6]
                  }
                  onChange={({ detail }) =>
                    setInnings(detail.selectedOption.value ?? "7")
                  }
                  options={INNINGS_OPTIONS}
                />
              </FormField>

              <FormField label="備考">
                <Input
                  value={note}
                  onChange={({ detail }) => setNote(detail.value)}
                  placeholder="特記事項があれば入力"
                />
              </FormField>

              <Button variant="primary" loading={saving} onClick={handleSave}>
                {existingResult ? "結果を更新" : "結果を保存"}
              </Button>
            </SpaceBetween>
          </Container>
        )}

        <Box>
          <Link href={`/games/${id}`}>
            <Button variant="link">試合詳細に戻る</Button>
          </Link>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
