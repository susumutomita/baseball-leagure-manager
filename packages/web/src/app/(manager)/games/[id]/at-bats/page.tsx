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
import Select, { type SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AttendedMember {
  person_id: string;
  name: string;
}

interface AtBatEntry {
  id: string;
  member_id: string;
  member_name: string;
  inning: number;
  batting_order: number | null;
  result: string;
}

const RESULT_OPTIONS: SelectProps.Option[] = [
  { label: "安打 (シングル)", value: "SINGLE" },
  { label: "二塁打", value: "DOUBLE" },
  { label: "三塁打", value: "TRIPLE" },
  { label: "本塁打", value: "HOMERUN" },
  { label: "ゴロアウト", value: "GROUND_OUT" },
  { label: "フライアウト", value: "FLY_OUT" },
  { label: "ライナーアウト", value: "LINE_OUT" },
  { label: "三振", value: "STRIKEOUT" },
  { label: "併殺", value: "DOUBLE_PLAY" },
  { label: "フィルダースチョイス", value: "FIELDERS_CHOICE" },
  { label: "エラー", value: "ERROR" },
  { label: "四球", value: "WALK" },
  { label: "死球", value: "HIT_BY_PITCH" },
  { label: "犠打", value: "SAC_BUNT" },
  { label: "犠飛", value: "SAC_FLY" },
];

const RESULT_LABELS: Record<string, string> = {};
for (const opt of RESULT_OPTIONS) {
  if (opt.value) RESULT_LABELS[opt.value] = opt.label ?? opt.value;
}

export default function AtBatsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState("");
  const [attendedMembers, setAttendedMembers] = useState<AttendedMember[]>([]);
  const [atBats, setAtBats] = useState<AtBatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // New at-bat form state
  const [selectedMember, setSelectedMember] =
    useState<SelectProps.Option | null>(null);
  const [inning, setInning] = useState("1");
  const [battingOrder, setBattingOrder] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<SelectProps.Option | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load game info
      const gameRes = await fetch(`/api/games/${id}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGameTitle(gameData.data.title);
      }

      // Load attendances to get members who attended
      const attRes = await fetch(`/api/games/${id}/attendances`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const attended = (attData.data ?? [])
          .filter(
            (a: { person_type: string; status: string }) =>
              a.person_type === "MEMBER" && a.status === "ATTENDED",
          )
          .map((a: { person_id: string }) => a.person_id);

        // If no attendance records, fall back to AVAILABLE RSVPs
        if (attended.length > 0) {
          // We need member names - fetch from RSVPs
          const rsvpRes = await fetch(`/api/games/${id}/rsvps`);
          if (rsvpRes.ok) {
            const rsvpData = await rsvpRes.json();
            const memberMap = new Map<string, string>();
            for (const r of rsvpData.data ?? []) {
              const member = r.members as { name: string } | null;
              if (member) memberMap.set(r.member_id, member.name);
            }
            setAttendedMembers(
              attended.map((pid: string) => ({
                person_id: pid,
                name: memberMap.get(pid) ?? "不明",
              })),
            );
          }
        } else {
          // Fall back to AVAILABLE RSVPs
          const rsvpRes = await fetch(`/api/games/${id}/rsvps`);
          if (rsvpRes.ok) {
            const rsvpData = await rsvpRes.json();
            const available = (rsvpData.data ?? [])
              .filter((r: { response: string }) => r.response === "AVAILABLE")
              .map(
                (r: {
                  member_id: string;
                  members: { name: string } | null;
                }) => ({
                  person_id: r.member_id,
                  name: r.members?.name ?? "不明",
                }),
              );
            setAttendedMembers(available);
          }
        }
      }

      // Load existing at-bats
      const abRes = await fetch(`/api/games/${id}/at-bats`);
      if (abRes.ok) {
        const abData = await abRes.json();
        setAtBats(
          (abData.data ?? []).map(
            (ab: {
              id: string;
              member_id: string;
              members: { name: string } | null;
              inning: number;
              batting_order: number | null;
              result: string;
            }) => ({
              id: ab.id,
              member_id: ab.member_id,
              member_name: ab.members?.name ?? "不明",
              inning: ab.inning,
              batting_order: ab.batting_order,
              result: ab.result,
            }),
          ),
        );
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

  const handleAddAtBat = async () => {
    if (!selectedMember?.value || !selectedResult?.value) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        member_id: selectedMember.value,
        inning: Number(inning),
        batting_order: battingOrder ? Number(battingOrder) : null,
        result: selectedResult.value,
      };

      const res = await fetch(`/api/games/${id}/at-bats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "登録に失敗しました");
        return;
      }

      setSuccess(true);
      // Reset form
      setSelectedResult(null);
      setBattingOrder("");
      // Reload data
      await loadData();
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (atBatId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/games/${id}/at-bats?at_bat_id=${atBatId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      await loadData();
    } catch {
      setError("通信エラーが発生しました");
    }
  };

  const memberOptions: SelectProps.Option[] = attendedMembers.map((m) => ({
    label: m.name,
    value: m.person_id,
  }));

  const inningOptions: SelectProps.Option[] = Array.from(
    { length: 9 },
    (_, i) => ({
      label: `${i + 1}回`,
      value: String(i + 1),
    }),
  );

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: gameTitle || "試合", href: `/games/${id}` },
            { text: "打席結果", href: `/games/${id}/at-bats` },
          ]}
        />
      }
      header={
        <Header variant="h1" description={gameTitle}>
          打席結果入力
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
                id: "at-bat-error",
              },
            ]}
          />
        )}

        {success && (
          <Flashbar
            items={[
              {
                type: "success",
                content: "打席結果を登録しました",
                dismissible: true,
                onDismiss: () => setSuccess(false),
                id: "at-bat-success",
              },
            ]}
          />
        )}

        {loading ? (
          <Container header={<Header variant="h2">打席結果</Header>}>
            <Box textAlign="center" padding="xxl">
              <StatusIndicator type="loading">読み込み中...</StatusIndicator>
            </Box>
          </Container>
        ) : (
          <>
            <Container
              header={
                <Header variant="h2" description="打席結果を1つずつ追加します">
                  打席登録
                </Header>
              }
            >
              <SpaceBetween size="m">
                <SpaceBetween direction="horizontal" size="m">
                  <FormField label="打者">
                    <Select
                      selectedOption={selectedMember}
                      onChange={({ detail }) =>
                        setSelectedMember(detail.selectedOption)
                      }
                      options={memberOptions}
                      placeholder="打者を選択"
                    />
                  </FormField>

                  <FormField label="イニング">
                    <Select
                      selectedOption={
                        inningOptions.find((o) => o.value === inning) ??
                        inningOptions[0]
                      }
                      onChange={({ detail }) =>
                        setInning(detail.selectedOption.value ?? "1")
                      }
                      options={inningOptions}
                    />
                  </FormField>

                  <FormField label="打順">
                    <Input
                      type="number"
                      value={battingOrder}
                      onChange={({ detail }) => setBattingOrder(detail.value)}
                      placeholder="1-9"
                      inputMode="numeric"
                    />
                  </FormField>

                  <FormField label="結果">
                    <Select
                      selectedOption={selectedResult}
                      onChange={({ detail }) =>
                        setSelectedResult(detail.selectedOption)
                      }
                      options={RESULT_OPTIONS}
                      placeholder="結果を選択"
                    />
                  </FormField>
                </SpaceBetween>

                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!selectedMember?.value || !selectedResult?.value}
                  onClick={handleAddAtBat}
                >
                  打席を追加
                </Button>
              </SpaceBetween>
            </Container>

            <Table
              header={
                <Header
                  variant="h2"
                  counter={atBats.length > 0 ? `(${atBats.length})` : undefined}
                >
                  登録済み打席
                </Header>
              }
              columnDefinitions={[
                {
                  id: "inning",
                  header: "イニング",
                  cell: (item) => `${item.inning}回`,
                  width: 100,
                  sortingField: "inning",
                },
                {
                  id: "batting_order",
                  header: "打順",
                  cell: (item) =>
                    item.batting_order ? `${item.batting_order}番` : "---",
                  width: 80,
                },
                {
                  id: "member",
                  header: "打者",
                  cell: (item) => item.member_name,
                  width: 150,
                },
                {
                  id: "result",
                  header: "結果",
                  cell: (item) => RESULT_LABELS[item.result] ?? item.result,
                  width: 180,
                },
                {
                  id: "actions",
                  header: "操作",
                  cell: (item) => (
                    <Button
                      variant="link"
                      onClick={() => handleDelete(item.id)}
                    >
                      削除
                    </Button>
                  ),
                  width: 80,
                },
              ]}
              items={atBats}
              variant="embedded"
              empty={
                <Box
                  textAlign="center"
                  color="text-status-inactive"
                  padding="l"
                >
                  打席結果がまだ登録されていません
                </Box>
              }
            />
          </>
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
