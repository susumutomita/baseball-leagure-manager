"use client";

import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
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

interface PitchingStatEntry {
  id: string;
  member_id: string;
  member_name: string;
  role: string;
  innings_pitched: number;
  hits_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  strikeouts: number;
  walks: number;
  is_winning_pitcher: boolean;
  is_losing_pitcher: boolean;
}

const ROLE_OPTIONS: SelectProps.Option[] = [
  { label: "先発 (STARTER)", value: "STARTER" },
  { label: "中継ぎ (RELIEVER)", value: "RELIEVER" },
  { label: "抑え (CLOSER)", value: "CLOSER" },
];

const ROLE_LABELS: Record<string, string> = {
  STARTER: "先発",
  RELIEVER: "中継ぎ",
  CLOSER: "抑え",
};

export default function PitchingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState("");
  const [attendedMembers, setAttendedMembers] = useState<AttendedMember[]>([]);
  const [stats, setStats] = useState<PitchingStatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedMember, setSelectedMember] =
    useState<SelectProps.Option | null>(null);
  const [selectedRole, setSelectedRole] = useState<SelectProps.Option | null>(
    null,
  );
  const [inningsPitched, setInningsPitched] = useState("0");
  const [hitsAllowed, setHitsAllowed] = useState("0");
  const [runsAllowed, setRunsAllowed] = useState("0");
  const [earnedRuns, setEarnedRuns] = useState("0");
  const [strikeouts, setStrikeouts] = useState("0");
  const [walks, setWalks] = useState("0");
  const [isWinningPitcher, setIsWinningPitcher] = useState(false);
  const [isLosingPitcher, setIsLosingPitcher] = useState(false);

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

        if (attended.length > 0) {
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

      // Load existing pitching stats
      const psRes = await fetch(`/api/games/${id}/pitching`);
      if (psRes.ok) {
        const psData = await psRes.json();
        setStats(
          (psData.data ?? []).map(
            (ps: {
              id: string;
              member_id: string;
              members: { name: string } | null;
              role: string;
              innings_pitched: number;
              hits_allowed: number;
              runs_allowed: number;
              earned_runs: number;
              strikeouts: number;
              walks: number;
              is_winning_pitcher: boolean;
              is_losing_pitcher: boolean;
            }) => ({
              id: ps.id,
              member_id: ps.member_id,
              member_name: ps.members?.name ?? "不明",
              role: ps.role,
              innings_pitched: ps.innings_pitched,
              hits_allowed: ps.hits_allowed,
              runs_allowed: ps.runs_allowed,
              earned_runs: ps.earned_runs,
              strikeouts: ps.strikeouts,
              walks: ps.walks,
              is_winning_pitcher: ps.is_winning_pitcher,
              is_losing_pitcher: ps.is_losing_pitcher,
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

  const handleAdd = async () => {
    if (!selectedMember?.value || !selectedRole?.value) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        member_id: selectedMember.value,
        role: selectedRole.value,
        innings_pitched: Number(inningsPitched) || 0,
        hits_allowed: Number(hitsAllowed) || 0,
        runs_allowed: Number(runsAllowed) || 0,
        earned_runs: Number(earnedRuns) || 0,
        strikeouts: Number(strikeouts) || 0,
        walks: Number(walks) || 0,
        is_winning_pitcher: isWinningPitcher,
        is_losing_pitcher: isLosingPitcher,
      };

      const res = await fetch(`/api/games/${id}/pitching`, {
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
      setSelectedRole(null);
      setInningsPitched("0");
      setHitsAllowed("0");
      setRunsAllowed("0");
      setEarnedRuns("0");
      setStrikeouts("0");
      setWalks("0");
      setIsWinningPitcher(false);
      setIsLosingPitcher(false);
      // Reload data
      await loadData();
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (statId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/games/${id}/pitching?stat_id=${statId}`, {
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

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: gameTitle || "試合", href: `/games/${id}` },
            { text: "投球成績", href: `/games/${id}/pitching` },
          ]}
        />
      }
      header={
        <Header variant="h1" description={gameTitle}>
          投球成績入力
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
                id: "pitching-error",
              },
            ]}
          />
        )}

        {success && (
          <Flashbar
            items={[
              {
                type: "success",
                content: "投球成績を登録しました",
                dismissible: true,
                onDismiss: () => setSuccess(false),
                id: "pitching-success",
              },
            ]}
          />
        )}

        {loading ? (
          <Container header={<Header variant="h2">投球成績</Header>}>
            <Box textAlign="center" padding="xxl">
              <StatusIndicator type="loading">読み込み中...</StatusIndicator>
            </Box>
          </Container>
        ) : (
          <>
            <Container
              header={
                <Header
                  variant="h2"
                  description="投手の成績を1件ずつ追加します"
                >
                  投球成績登録
                </Header>
              }
            >
              <SpaceBetween size="m">
                <SpaceBetween direction="horizontal" size="m">
                  <FormField label="投手">
                    <Select
                      selectedOption={selectedMember}
                      onChange={({ detail }) =>
                        setSelectedMember(detail.selectedOption)
                      }
                      options={memberOptions}
                      placeholder="投手を選択"
                    />
                  </FormField>

                  <FormField label="役割">
                    <Select
                      selectedOption={selectedRole}
                      onChange={({ detail }) =>
                        setSelectedRole(detail.selectedOption)
                      }
                      options={ROLE_OPTIONS}
                      placeholder="役割を選択"
                    />
                  </FormField>

                  <FormField label="投球回">
                    <Input
                      type="number"
                      value={inningsPitched}
                      onChange={({ detail }) => setInningsPitched(detail.value)}
                      inputMode="decimal"
                    />
                  </FormField>
                </SpaceBetween>

                <SpaceBetween direction="horizontal" size="m">
                  <FormField label="被安打">
                    <Input
                      type="number"
                      value={hitsAllowed}
                      onChange={({ detail }) => setHitsAllowed(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>

                  <FormField label="失点">
                    <Input
                      type="number"
                      value={runsAllowed}
                      onChange={({ detail }) => setRunsAllowed(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>

                  <FormField label="自責点">
                    <Input
                      type="number"
                      value={earnedRuns}
                      onChange={({ detail }) => setEarnedRuns(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>

                  <FormField label="奪三振">
                    <Input
                      type="number"
                      value={strikeouts}
                      onChange={({ detail }) => setStrikeouts(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>

                  <FormField label="四球">
                    <Input
                      type="number"
                      value={walks}
                      onChange={({ detail }) => setWalks(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>
                </SpaceBetween>

                <SpaceBetween direction="horizontal" size="m">
                  <Checkbox
                    checked={isWinningPitcher}
                    onChange={({ detail }) => {
                      setIsWinningPitcher(detail.checked);
                      if (detail.checked) setIsLosingPitcher(false);
                    }}
                  >
                    勝ち投手
                  </Checkbox>

                  <Checkbox
                    checked={isLosingPitcher}
                    onChange={({ detail }) => {
                      setIsLosingPitcher(detail.checked);
                      if (detail.checked) setIsWinningPitcher(false);
                    }}
                  >
                    負け投手
                  </Checkbox>
                </SpaceBetween>

                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!selectedMember?.value || !selectedRole?.value}
                  onClick={handleAdd}
                >
                  投球成績を追加
                </Button>
              </SpaceBetween>
            </Container>

            <Table
              header={
                <Header
                  variant="h2"
                  counter={stats.length > 0 ? `(${stats.length})` : undefined}
                >
                  登録済み投球成績
                </Header>
              }
              columnDefinitions={[
                {
                  id: "member",
                  header: "投手",
                  cell: (item) => item.member_name,
                  width: 120,
                },
                {
                  id: "role",
                  header: "役割",
                  cell: (item) => ROLE_LABELS[item.role] ?? item.role,
                  width: 80,
                },
                {
                  id: "ip",
                  header: "投球回",
                  cell: (item) => String(item.innings_pitched),
                  width: 80,
                },
                {
                  id: "h",
                  header: "被安打",
                  cell: (item) => String(item.hits_allowed),
                  width: 70,
                },
                {
                  id: "r",
                  header: "失点",
                  cell: (item) => String(item.runs_allowed),
                  width: 60,
                },
                {
                  id: "er",
                  header: "自責点",
                  cell: (item) => String(item.earned_runs),
                  width: 70,
                },
                {
                  id: "k",
                  header: "奪三振",
                  cell: (item) => String(item.strikeouts),
                  width: 70,
                },
                {
                  id: "bb",
                  header: "四球",
                  cell: (item) => String(item.walks),
                  width: 60,
                },
                {
                  id: "wp",
                  header: "勝敗",
                  cell: (item) =>
                    item.is_winning_pitcher
                      ? "勝"
                      : item.is_losing_pitcher
                        ? "敗"
                        : "---",
                  width: 60,
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
              items={stats}
              variant="embedded"
              empty={
                <Box
                  textAlign="center"
                  color="text-status-inactive"
                  padding="l"
                >
                  投球成績がまだ登録されていません
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
