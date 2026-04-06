"use client";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { GroundFormModal } from "@/components/GroundFormModal";
import { useCrudList } from "@/hooks/useCrudList";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Cards from "@cloudscape-design/components/cards";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

interface Ground {
  id: string;
  name: string;
  municipality?: string | null;
  source_url?: string | null;
  cost_per_slot?: number | null;
  is_hardball_ok?: boolean | null;
  has_night_lights?: boolean | null;
  note?: string | null;
}

interface GroundsListProps {
  initialGrounds: Ground[];
  teamId?: string;
}

export function GroundsList({ initialGrounds }: GroundsListProps) {
  const crud = useCrudList<Ground>({
    deleteEndpoint: (id) => `/api/grounds/${id}`,
    entityName: "グラウンド",
  });

  return (
    <>
      {crud.flash.length > 0 && <Flashbar items={crud.flash} />}

      <Cards
        header={
          <Header
            counter={`(${initialGrounds.length})`}
            actions={
              <Button onClick={crud.openCreate}>グラウンドを追加</Button>
            }
          >
            グラウンド一覧
          </Header>
        }
        cardDefinition={{
          header: (item) => item.name,
          sections: [
            {
              id: "municipality",
              header: "自治体",
              content: (item) => item.municipality ?? "—",
            },
            {
              id: "cost",
              header: "料金",
              content: (item) =>
                item.cost_per_slot
                  ? `¥${item.cost_per_slot.toLocaleString()}/枠`
                  : "—",
            },
            {
              id: "hardball",
              header: "硬式利用",
              content: (item) => (
                <StatusIndicator
                  type={item.is_hardball_ok ? "success" : "stopped"}
                >
                  {item.is_hardball_ok ? "可" : "不可"}
                </StatusIndicator>
              ),
            },
            {
              id: "lights",
              header: "照明",
              content: (item) => (
                <StatusIndicator
                  type={item.has_night_lights ? "success" : "stopped"}
                >
                  {item.has_night_lights ? "あり" : "なし"}
                </StatusIndicator>
              ),
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
        items={initialGrounds}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            グラウンドが登録されていません
          </Box>
        }
      />

      <GroundFormModal
        visible={crud.showModal}
        onDismiss={crud.closeModal}
        onSuccess={crud.handleSuccess}
        ground={crud.editingItem}
      />

      <DeleteConfirmModal
        visible={!!crud.deletingItem}
        onDismiss={() => crud.setDeletingItem(null)}
        onConfirm={crud.handleDelete}
        loading={crud.deleting}
        itemName={crud.deletingItem?.name ?? ""}
        entityName="グラウンド"
      />
    </>
  );
}
