"use client";

import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import RadioGroup from "@cloudscape-design/components/radio-group";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface RsvpMember {
  member_id: string;
  member_name: string;
}

interface AttendanceRecord {
  person_id: string;
  status: "ATTENDED" | "NO_SHOW" | "CANCELLED_SAME_DAY";
}

const STATUS_LABELS: Record<string, string> = {
  ATTENDED: "出席",
  NO_SHOW: "無断欠席",
  CANCELLED_SAME_DAY: "当日キャンセル",
};

const STATUS_TYPE: Record<string, "success" | "error" | "warning"> = {
  ATTENDED: "success",
  NO_SHOW: "error",
  CANCELLED_SAME_DAY: "warning",
};

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gameTitle, setGameTitle] = useState("");
  const [gameStatus, setGameStatus] = useState("");
  const [members, setMembers] = useState<RsvpMember[]>([]);
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceRecord["status"]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load game info
      const gameRes = await fetch(`/api/games/${id}`);
      if (!gameRes.ok) return;
      const gameData = await gameRes.json();
      const game = gameData.data;
      setGameTitle(game.title);
      setGameStatus(game.status);

      // Load RSVPs with AVAILABLE response
      const rsvpRes = await fetch(`/api/games/${id}/rsvps`);
      if (rsvpRes.ok) {
        const rsvpData = await rsvpRes.json();
        const availableMembers = (rsvpData.data ?? [])
          .filter((r: { response: string }) => r.response === "AVAILABLE")
          .map(
            (r: {
              member_id: string;
              members: { name: string } | null;
            }) => ({
              member_id: r.member_id,
              member_name: r.members?.name ?? "不明",
            }),
          );
        setMembers(availableMembers);

        // Initialize all to ATTENDED
        const initial: Record<string, AttendanceRecord["status"]> = {};
        for (const m of availableMembers) {
          initial[m.member_id] = "ATTENDED";
        }
        setAttendances(initial);
      }

      // Load existing attendances
      const attRes = await fetch(`/api/games/${id}/attendances`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const existing = attData.data ?? [];
        if (existing.length > 0) {
          const map: Record<string, AttendanceRecord["status"]> = {};
          for (const a of existing) {
            if (a.person_type === "MEMBER") {
              map[a.person_id] = a.status;
            }
          }
          setAttendances((prev) => ({ ...prev, ...map }));
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = members.map((m) => ({
        person_type: "MEMBER",
        person_id: m.member_id,
        status: attendances[m.member_id] ?? "ATTENDED",
      }));

      const res = await fetch(`/api/games/${id}/attendances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "保存に失敗しました");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const isValidStatus =
    gameStatus === "CONFIRMED" || gameStatus === "COMPLETED";

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: gameTitle || "試合", href: `/games/${id}` },
            { text: "出席記録", href: `/games/${id}/attendance` },
          ]}
        />
      }
      header={
        <Header variant="h1" description={gameTitle}>
          出席記録
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
                id: "attendance-error",
              },
            ]}
          />
        )}

        {success && (
          <Flashbar
            items={[
              {
                type: "success",
                content: "出席記録を保存しました",
                dismissible: true,
                onDismiss: () => setSuccess(false),
                id: "attendance-success",
              },
            ]}
          />
        )}

        {!isValidStatus && !loading && (
          <Flashbar
            items={[
              {
                type: "warning",
                content:
                  "出席記録は確定済み(CONFIRMED)または完了済み(COMPLETED)の試合のみ記録できます",
                id: "attendance-status-warning",
              },
            ]}
          />
        )}

        <Container
          header={
            <Header
              variant="h2"
              counter={members.length > 0 ? `(${members.length})` : undefined}
              description="参加回答(AVAILABLE)のメンバー一覧"
            >
              出席状況
            </Header>
          }
        >
          {loading ? (
            <Box textAlign="center" padding="xxl">
              <StatusIndicator type="loading">読み込み中...</StatusIndicator>
            </Box>
          ) : members.length === 0 ? (
            <Box textAlign="center" color="text-status-inactive" padding="l">
              参加回答のメンバーがいません
            </Box>
          ) : (
            <SpaceBetween size="l">
              <Table
                columnDefinitions={[
                  {
                    id: "name",
                    header: "メンバー名",
                    cell: (item) => item.member_name,
                    width: 200,
                  },
                  {
                    id: "status",
                    header: "出席状況",
                    cell: (item) => (
                      <RadioGroup
                        value={attendances[item.member_id] ?? "ATTENDED"}
                        onChange={({ detail }) =>
                          setAttendances((prev) => ({
                            ...prev,
                            [item.member_id]:
                              detail.value as AttendanceRecord["status"],
                          }))
                        }
                        items={[
                          { value: "ATTENDED", label: "出席" },
                          { value: "NO_SHOW", label: "無断欠席" },
                          {
                            value: "CANCELLED_SAME_DAY",
                            label: "当日キャンセル",
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    id: "indicator",
                    header: "ステータス",
                    cell: (item) => {
                      const status = attendances[item.member_id] ?? "ATTENDED";
                      return (
                        <StatusIndicator type={STATUS_TYPE[status]}>
                          {STATUS_LABELS[status]}
                        </StatusIndicator>
                      );
                    },
                    width: 150,
                  },
                ]}
                items={members}
                variant="embedded"
              />

              <Button
                variant="primary"
                loading={saving}
                disabled={!isValidStatus}
                onClick={handleSave}
              >
                出席記録を保存
              </Button>
            </SpaceBetween>
          )}
        </Container>

        <Box>
          <Link href={`/games/${id}`}>
            <Button variant="link">試合詳細に戻る</Button>
          </Link>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
