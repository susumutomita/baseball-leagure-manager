"use client";

import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

/**
 * CRUD リストコンポーネントの共通状態管理フック。
 *
 * モーダル表示 / 削除確認 / Flashbar メッセージ / router.refresh() を
 * 一括で管理し、MembersList・HelpersList 等の重複を排除する。
 *
 * @template T - `{ id: string; name: string }` を満たすエンティティ型
 *
 * @example
 * ```tsx
 * const crud = useCrudList<Member>({
 *   deleteEndpoint: (id) => `/api/members/${id}`,
 *   entityName: "メンバー",
 * });
 * ```
 */

/** CRUD 対象エンティティが満たすべき最低限の型 */
interface CrudItem {
  id: string;
  name: string;
}

/** useCrudList の設定 */
interface UseCrudListOptions {
  /** DELETE リクエストの送信先 URL を返す関数 */
  deleteEndpoint: (id: string) => string;
  /** Flashbar メッセージに表示するエンティティ名 (例: "メンバー") */
  entityName: string;
}

export function useCrudList<T extends CrudItem>(options: UseCrudListOptions) {
  const router = useRouter();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const clearFlash = useCallback(() => setFlash([]), []);

  const showSuccess = useCallback(
    (message: string) => {
      setFlash([
        {
          type: "success",
          content: message,
          dismissible: true,
          onDismiss: clearFlash,
        },
      ]);
    },
    [clearFlash],
  );

  const showError = useCallback(
    (message: string) => {
      setFlash([
        {
          type: "error",
          content: message,
          dismissible: true,
          onDismiss: clearFlash,
        },
      ]);
    },
    [clearFlash],
  );

  /** 削除確認後に呼ぶ。DELETE API → Flash → router.refresh() */
  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(
        optionsRef.current.deleteEndpoint(deletingItem.id),
        { method: "DELETE" },
      );
      if (res.ok) {
        setDeletingItem(null);
        showSuccess(`${optionsRef.current.entityName}を削除しました`);
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
  }, [deletingItem, router, showSuccess, showError]);

  /** FormModal の onSuccess コールバック。Flash → モーダル閉 → refresh */
  const handleSuccess = useCallback(() => {
    const message = editingItem
      ? `${optionsRef.current.entityName}を更新しました`
      : `${optionsRef.current.entityName}を追加しました`;
    showSuccess(message);
    setShowModal(false);
    setEditingItem(null);
    router.refresh();
  }, [editingItem, router, showSuccess]);

  /** 新規作成モーダルを開く */
  const openCreate = useCallback(() => {
    setEditingItem(null);
    setShowModal(true);
  }, []);

  /** 編集モーダルを開く */
  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setShowModal(true);
  }, []);

  /** モーダルを閉じる */
  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
  }, []);

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
