"use client";

import { GroundFormModal } from "@/components/GroundFormModal";
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
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Ground | null>(null);
  const [deletingItem, setDeletingItem] = useState<Ground | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"; content: string }[]>(
    [],
  );

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/grounds/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingItem(null);
        setFlash([{ type: "success", content: "グラウンドを削除しました" }]);
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
          ? "グラウンドを更新しました"
          : "グラウンドを追加しました",
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
            counter={`(${initialGrounds.length})`}
            actions={
              <Button onClick={() => setShowModal(true)}>
                グラウンドを追加
              </Button>
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
        items={initialGrounds}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            グラウンドが登録されていません
          </Box>
        }
      />

      <GroundFormModal
        visible={showModal}
        onDismiss={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSuccess={handleSuccess}
        ground={editingItem}
      />

      <Modal
        visible={!!deletingItem}
        onDismiss={() => setDeletingItem(null)}
        header="グラウンドを削除"
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
