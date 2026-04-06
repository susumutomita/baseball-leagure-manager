"use client";

import { MemberFormModal } from "@/components/MemberFormModal";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "管理者(代表)",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

const ROLE_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  SUPER_ADMIN: "success",
  ADMIN: "info",
  MEMBER: "pending",
};

interface Member {
  id: string;
  name: string;
  tier: string;
  role: string;
  email?: string | null;
  positions_json?: string[] | null;
  jersey_number?: number | null;
  attendance_rate?: number | null;
  status?: string | null;
}

interface MembersListProps {
  initialMembers: Member[];
  teamId: string;
}

export function MembersList({ initialMembers, teamId }: MembersListProps) {
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Member | null>(null);
  const [deletingItem, setDeletingItem] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"; content: string }[]>(
    [],
  );

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingItem(null);
        setFlash([{ type: "success", content: "メンバーを削除しました" }]);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleSuccess = () => {
    setFlash([
      {
        type: "success",
        content: editingItem
          ? "メンバーを更新しました"
          : "メンバーを追加しました",
      },
    ]);
    setEditingItem(null);
    router.refresh();
  };

  return (
    <>
      {flash.length > 0 && (
        <Flashbar
          items={flash.map((f) => ({
            ...f,
            dismissible: true,
            onDismiss: () => setFlash([]),
          }))}
        />
      )}

      <Cards
        header={
          <Header
            counter={`(${initialMembers.length})`}
            actions={
              <Button onClick={() => setShowModal(true)}>メンバーを追加</Button>
            }
          >
            メンバー一覧
          </Header>
        }
        cardDefinition={{
          header: (item) => item.name,
          sections: [
            {
              id: "role",
              header: "ロール",
              content: (item) => (
                <StatusIndicator type={ROLE_TYPE[item.role] ?? "pending"}>
                  {ROLE_LABELS[item.role] ?? item.role}
                </StatusIndicator>
              ),
            },
            {
              id: "tier",
              header: "区分",
              content: (item) => item.tier,
            },
            {
              id: "positions",
              header: "ポジション",
              content: (item) => {
                const positions = item.positions_json as string[];
                return positions?.join(", ") || "—";
              },
            },
            {
              id: "jersey_number",
              header: "背番号",
              content: (item) =>
                item.jersey_number != null ? `#${item.jersey_number}` : "—",
            },
            {
              id: "attendance",
              header: "出席率",
              content: (item) =>
                item.attendance_rate != null ? `${item.attendance_rate}%` : "—",
            },
            {
              id: "status",
              header: "ステータス",
              content: (item) => (
                <StatusIndicator
                  type={item.status === "ACTIVE" ? "success" : "stopped"}
                >
                  {item.status === "ACTIVE"
                    ? "アクティブ"
                    : (item.status ?? "—")}
                </StatusIndicator>
              ),
            },
            {
              id: "actions",
              header: "操作",
              content: (item) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="link"
                    onClick={() => {
                      setEditingItem(item);
                      setShowModal(true);
                    }}
                  >
                    編集
                  </Button>
                  <Button variant="link" onClick={() => setDeletingItem(item)}>
                    削除
                  </Button>
                </SpaceBetween>
              ),
            },
          ],
        }}
        items={initialMembers}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            メンバーがいません
          </Box>
        }
      />

      <MemberFormModal
        visible={showModal}
        onDismiss={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSuccess={handleSuccess}
        teamId={teamId}
        member={editingItem}
      />

      <Modal
        visible={!!deletingItem}
        onDismiss={() => setDeletingItem(null)}
        header="メンバーを削除"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setDeletingItem(null)}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                loading={deleting}
              >
                削除
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Box>
          <strong>{deletingItem?.name}</strong> を削除しますか？
        </Box>
      </Modal>
    </>
  );
}
