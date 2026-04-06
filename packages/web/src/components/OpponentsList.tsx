"use client";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { OpponentFormModal } from "@/components/OpponentFormModal";
import { useCrudList } from "@/hooks/useCrudList";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";

interface Opponent {
  id: string;
  name: string;
  area?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_line?: string | null;
  contact_phone?: string | null;
  home_ground?: string | null;
  note?: string | null;
  times_played?: number | null;
  last_played_at?: string | null;
}

interface OpponentsListProps {
  initialOpponents: Opponent[];
  teamId: string;
}

export function OpponentsList({
  initialOpponents,
  teamId,
}: OpponentsListProps) {
  const crud = useCrudList<Opponent>({
    deleteEndpoint: (id) => `/api/opponents/${id}`,
    entityName: "対戦相手",
  });

  return (
    <>
      {crud.flash.length > 0 && <Flashbar items={crud.flash} />}

      <Table
        header={
          <Header
            counter={`(${initialOpponents.length})`}
            actions={<Button onClick={crud.openCreate}>対戦相手を追加</Button>}
          >
            対戦相手一覧
          </Header>
        }
        columnDefinitions={[
          {
            id: "name",
            header: "チーム名",
            cell: (item) => item.name,
            sortingField: "name",
          },
          {
            id: "area",
            header: "エリア",
            cell: (item) => item.area ?? "—",
          },
          {
            id: "contact_name",
            header: "連絡先",
            cell: (item) => item.contact_name ?? "—",
          },
          {
            id: "times_played",
            header: "対戦回数",
            cell: (item) => `${item.times_played ?? 0}回`,
            sortingField: "times_played",
          },
          {
            id: "last_played_at",
            header: "最終対戦",
            cell: (item) => item.last_played_at ?? "—",
          },
          {
            id: "note",
            header: "メモ",
            cell: (item) => item.note ?? "—",
          },
          {
            id: "actions",
            header: "操作",
            cell: (item) => (
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
        ]}
        items={initialOpponents}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            対戦相手が登録されていません
          </Box>
        }
        variant="full-page"
        stickyHeader
      />

      <OpponentFormModal
        visible={crud.showModal}
        onDismiss={crud.closeModal}
        onSuccess={crud.handleSuccess}
        teamId={teamId}
        opponent={crud.editingItem}
      />

      <DeleteConfirmModal
        visible={!!crud.deletingItem}
        onDismiss={() => crud.setDeletingItem(null)}
        onConfirm={crud.handleDelete}
        loading={crud.deleting}
        itemName={crud.deletingItem?.name ?? ""}
        entityName="対戦相手"
      />
    </>
  );
}
