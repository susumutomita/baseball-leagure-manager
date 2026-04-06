"use client";

import { OpponentFormModal } from "@/components/OpponentFormModal";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Opponent | null>(null);
  const [deletingItem, setDeletingItem] = useState<Opponent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"; content: string }[]>(
    [],
  );

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/opponents/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingItem(null);
        setFlash([{ type: "success", content: "対戦相手を削除しました" }]);
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
          ? "対戦相手を更新しました"
          : "対戦相手を追加しました",
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

      <Table
        header={
          <Header
            counter={`(${initialOpponents.length})`}
            actions={
              <Button onClick={() => setShowModal(true)}>対戦相手を追加</Button>
            }
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
        visible={showModal}
        onDismiss={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSuccess={handleSuccess}
        teamId={teamId}
        opponent={editingItem}
      />

      <Modal
        visible={!!deletingItem}
        onDismiss={() => setDeletingItem(null)}
        header="対戦相手を削除"
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
