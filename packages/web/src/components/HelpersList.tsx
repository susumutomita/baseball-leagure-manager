"use client";

import { HelperFormModal } from "@/components/HelperFormModal";
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
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Helper | null>(null);
  const [deletingItem, setDeletingItem] = useState<Helper | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"; content: string }[]>(
    [],
  );

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/helpers/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingItem(null);
        setFlash([{ type: "success", content: "助っ人を削除しました" }]);
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
        content: editingItem ? "助っ人を更新しました" : "助っ人を追加しました",
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
            counter={`(${initialHelpers.length})`}
            actions={
              <Button onClick={() => setShowModal(true)}>助っ人を追加</Button>
            }
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
        items={initialHelpers}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            助っ人が登録されていません
          </Box>
        }
      />

      <HelperFormModal
        visible={showModal}
        onDismiss={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSuccess={handleSuccess}
        helper={editingItem}
      />

      <Modal
        visible={!!deletingItem}
        onDismiss={() => setDeletingItem(null)}
        header="助っ人を削除"
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
