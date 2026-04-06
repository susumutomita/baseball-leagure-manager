"use client";

import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CrudItem {
  id: string;
  name: string;
}

interface UseCrudListOptions {
  deleteEndpoint: (id: string) => string;
  entityName: string;
}

export function useCrudList<T extends CrudItem>(options: UseCrudListOptions) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const clearFlash = () => setFlash([]);

  const showSuccess = (message: string) => {
    setFlash([
      {
        type: "success",
        content: message,
        dismissible: true,
        onDismiss: clearFlash,
      },
    ]);
  };

  const showError = (message: string) => {
    setFlash([
      {
        type: "error",
        content: message,
        dismissible: true,
        onDismiss: clearFlash,
      },
    ]);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(options.deleteEndpoint(deletingItem.id), {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingItem(null);
        showSuccess(`${options.entityName}を削除しました`);
        router.refresh();
      } else {
        const json = await res.json();
        showError(json.error ?? "削除に失敗しました");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  const handleSuccess = () => {
    showSuccess(
      editingItem
        ? `${options.entityName}を更新しました`
        : `${options.entityName}を追加しました`,
    );
    setEditingItem(null);
    router.refresh();
  };

  const openCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  return {
    showModal,
    editingItem,
    deletingItem,
    deleting,
    flash,
    setDeletingItem,
    handleDelete,
    handleSuccess,
    openCreate,
    openEdit,
    closeModal,
  };
}
