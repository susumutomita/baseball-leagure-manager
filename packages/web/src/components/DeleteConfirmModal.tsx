"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";

interface DeleteConfirmModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  itemName: string;
  entityName: string;
}

export function DeleteConfirmModal({
  visible,
  onDismiss,
  onConfirm,
  loading,
  itemName,
  entityName,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={`${entityName}を削除`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={onConfirm} loading={loading}>
              削除
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <strong>{itemName}</strong> を削除しますか？この操作は取り消せません。
    </Modal>
  );
}
