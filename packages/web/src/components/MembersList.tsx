"use client";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { MemberFormModal } from "@/components/MemberFormModal";
import { MemberInvitePanel } from "@/components/MemberInvitePanel";
import { useTeam } from "@/contexts/TeamContext";
import { useCrudList } from "@/hooks/useCrudList";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

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
  const team = useTeam();
  const crud = useCrudList<Member>({
    deleteEndpoint: (id) => `/api/members/${id}`,
    entityName: "メンバー",
  });

  return (
    <>
      {crud.flash.length > 0 && <Flashbar items={crud.flash} />}

      {team?.memberId && (
        <MemberInvitePanel
          teamId={teamId}
          memberId={team.memberId}
          title="メンバー招待"
          description="LINE 連携用の招待リンクを発行して、チームメンバーを追加します"
        />
      )}

      <Cards
        header={
          <Header
            counter={`(${initialMembers.length})`}
            actions={<Button onClick={crud.openCreate}>メンバーを追加</Button>}
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
              content: (item) => item.positions_json?.join(", ") || "—",
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
                  <Button variant="link" onClick={() => crud.openEdit(item)}>
                    編集
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => crud.setDeletingItem(item)}
                  >
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
        visible={crud.showModal}
        onDismiss={crud.closeModal}
        onSuccess={crud.handleSuccess}
        teamId={teamId}
        member={crud.editingItem}
      />

      <DeleteConfirmModal
        visible={!!crud.deletingItem}
        onDismiss={() => crud.setDeletingItem(null)}
        onConfirm={crud.handleDelete}
        loading={crud.deleting}
        itemName={crud.deletingItem?.name ?? ""}
        entityName="メンバー"
      />
    </>
  );
}
