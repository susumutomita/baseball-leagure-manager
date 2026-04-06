"use client";

import { useTeam } from "@/contexts/TeamContext";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import DatePicker from "@cloudscape-design/components/date-picker";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import type { SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Tiles from "@cloudscape-design/components/tiles";
import TimeInput from "@cloudscape-design/components/time-input";
import type { GameType } from "@match-engine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ACTIVITY_TYPES = [
  {
    value: "FRIENDLY",
    label: "試合",
    description: "練習試合・リーグ戦・大会など",
  },
  {
    value: "PRACTICE",
    label: "練習",
    description: "チーム練習・自主練習など",
  },
  {
    value: "EVENT",
    label: "その他",
    description: "飲み会・ミーティング・イベントなど",
  },
] as const;

const GAME_SUBTYPE_OPTIONS = [
  { label: "練習試合", value: "FRIENDLY" },
  { label: "リーグ戦", value: "LEAGUE" },
  { label: "トーナメント", value: "TOURNAMENT" },
];

interface CreateActivityModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function CreateActivityModal({
  visible,
  onDismiss,
}: CreateActivityModalProps) {
  const router = useRouter();
  const team = useTeam();
  const teamId = team?.teamId;

  const [activityType, setActivityType] = useState("FRIENDLY");
  const [title, setTitle] = useState("");
  const [gameSubtype, setGameSubtype] = useState<string>("FRIENDLY");
  const [gameDate, setGameDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [groundName, setGroundName] = useState("");
  const [selectedGround, setSelectedGround] =
    useState<SelectProps.Option | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groundOptions, setGroundOptions] = useState<SelectProps.Option[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(true);

  useEffect(() => {
    if (!visible || !teamId) return;
    (async () => {
      try {
        const res = await fetch(`/api/grounds?team_id=${teamId}`);
        if (res.ok) {
          const data = await res.json();
          const grounds = data.data ?? [];
          setGroundOptions(
            grounds.map(
              (g: { id: string; name: string; municipality?: string }) => ({
                label: g.name,
                value: g.id,
                description: g.municipality ?? undefined,
              }),
            ),
          );
        }
      } catch {
        // ignore
      } finally {
        setLoadingGrounds(false);
      }
    })();
  }, [visible, teamId]);

  const resolveGameType = (): GameType => {
    if (activityType === "PRACTICE") return "PRACTICE";
    if (activityType === "EVENT") return "PRACTICE"; // イベントもPRACTICEとして保存（対戦相手不要）
    return gameSubtype as GameType;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    const resolvedGroundName = selectedGround?.label ?? (groundName || null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          title,
          game_type: resolveGameType(),
          game_date: gameDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          ground_name: resolvedGroundName,
          min_players: activityType === "EVENT" ? 1 : 9,
          note: note || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onDismiss();
        router.push(`/games/${data.data.id}`);
        return;
      }
      const err = await res.json();
      setError(err.message ?? err.error ?? "作成に失敗しました");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setTitle("");
    setActivityType("FRIENDLY");
    setGameSubtype("FRIENDLY");
    setGameDate("");
    setStartTime("");
    setEndTime("");
    setGroundName("");
    setSelectedGround(null);
    setNote("");
    setError(null);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header="活動を作成"
      size="medium"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={handleDismiss}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!title.trim()}
            >
              作成
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Box color="text-status-error" fontSize="body-s">
            {error}
          </Box>
        )}

        {/* 活動タイプ選択 */}
        <FormField label="種類">
          <Tiles
            value={activityType}
            onChange={({ detail }) => setActivityType(detail.value)}
            items={ACTIVITY_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
              description: t.description,
            }))}
          />
        </FormField>

        {/* 試合サブタイプ（試合選択時のみ） */}
        {activityType === "FRIENDLY" && (
          <FormField label="試合の種類">
            <Select
              selectedOption={
                GAME_SUBTYPE_OPTIONS.find((o) => o.value === gameSubtype) ??
                null
              }
              onChange={({ detail }) =>
                setGameSubtype(detail.selectedOption.value ?? "FRIENDLY")
              }
              options={GAME_SUBTYPE_OPTIONS}
            />
          </FormField>
        )}

        <FormField label="タイトル" constraintText="必須">
          <Input
            value={title}
            onChange={({ detail }) => setTitle(detail.value)}
            placeholder={
              activityType === "PRACTICE"
                ? "例: 5/10 チーム練習"
                : activityType === "EVENT"
                  ? "例: 5月 打ち上げ"
                  : "例: 5/10 vs レッドソックス"
            }
          />
        </FormField>

        <ColumnLayout columns={2}>
          <FormField label="日程">
            <DatePicker
              value={gameDate}
              onChange={({ detail }) => setGameDate(detail.value)}
              placeholder="YYYY/MM/DD"
              openCalendarAriaLabel={(selectedDate) =>
                selectedDate ? `選択中: ${selectedDate}` : "日付を選択"
              }
            />
          </FormField>
          <FormField label="場所">
            <SpaceBetween size="xxs">
              <Select
                selectedOption={selectedGround}
                onChange={({ detail }) => {
                  setSelectedGround(detail.selectedOption);
                  if (detail.selectedOption?.label) {
                    setGroundName(detail.selectedOption.label);
                  }
                }}
                options={groundOptions}
                placeholder="登録済みから選択"
                statusType={loadingGrounds ? "loading" : "finished"}
                empty="登録なし"
                filteringType="auto"
              />
              <Input
                value={groundName}
                onChange={({ detail }) => {
                  setGroundName(detail.value);
                  if (detail.value !== selectedGround?.label) {
                    setSelectedGround(null);
                  }
                }}
                placeholder="または直接入力"
              />
            </SpaceBetween>
          </FormField>
        </ColumnLayout>

        <ColumnLayout columns={2}>
          <FormField label="開始">
            <TimeInput
              value={startTime}
              onChange={({ detail }) => setStartTime(detail.value)}
              format="hh:mm"
              placeholder="HH:mm"
            />
          </FormField>
          <FormField label="終了">
            <TimeInput
              value={endTime}
              onChange={({ detail }) => setEndTime(detail.value)}
              format="hh:mm"
              placeholder="HH:mm"
            />
          </FormField>
        </ColumnLayout>

        <FormField label="メモ">
          <Textarea
            value={note}
            onChange={({ detail }) => setNote(detail.value)}
            rows={2}
            placeholder="連絡事項など"
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
