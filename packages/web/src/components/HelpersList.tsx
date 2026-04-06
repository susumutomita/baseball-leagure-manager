"use client";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { HelperFormModal } from "@/components/HelperFormModal";
import { useCrudList } from "@/hooks/useCrudList";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

interface Helper {
  id: string;
  name: string;
  email?: string | null;
  line_user_id?: string | null;
  note?: string | null;
  reliability_score?: number | null;
  times_helped?: number | null;
}

interface HelpersListProps {
  initialHelpers: Helper[];
  teamId?: string;
}

export function HelpersList({ initialHelpers }: HelpersListProps) {
  const crud = useCrudList<Helper>({
    deleteEndpoint: (id) => `/api/helpers/${id}`,
    entityName: "助っ人",
  });

  return (
    <>
      {crud.flash.length > 0 && <Flashbar items={crud.flash} />}

      <Cards
        header={
          <Header
            counter={`(${initialHelpers.length})`}
            actions={<Button onClick={crud.openCreate}>助っ人を追加</Button>}
          >
            助っ人一覧
          </Header>
        }
        cardDefinition={{
          header: (item) => item.name,
          sections: [
            {
              id: "reliability",
              header: "信頼度",
              content: (item) => {
                const score = Number(item.reliability_score ?? 0);
                const type =
                  score >= 0.8 ? "success" : score >= 0.5 ? "warning" : "error";
                return (
                  <StatusIndicator
                    type={type as "success" | "warning" | "error"}
                  >
                    {(score * 100).toFixed(0)}%
                  </StatusIndicator>
                );
              },
            },
            {
              id: "times_helped",
              header: "参加回数",
              content: (item) => `${item.times_helped ?? 0}回`,
            },
            {
              id: "email",
              header: "メール",
              content: (item) => item.email || "—",
            },
            {
              id: "note",
              header: "メモ",
              content: (item) => item.note || "—",
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
        items={initialHelpers}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            助っ人が登録されていません
          </Box>
        }
      />

      <HelperFormModal
        visible={crud.showModal}
        onDismiss={crud.closeModal}
        onSuccess={crud.handleSuccess}
        helper={crud.editingItem}
      />

      <DeleteConfirmModal
        visible={!!crud.deletingItem}
        onDismiss={() => crud.setDeletingItem(null)}
        onConfirm={crud.handleDelete}
        loading={crud.deleting}
        itemName={crud.deletingItem?.name ?? ""}
        entityName="助っ人"
      />
    </>
  );
}
