"use client";

import { NegotiationFormModal } from "@/components/NegotiationFormModal";
import Button from "@cloudscape-design/components/button";
import { useState } from "react";

interface NegotiationFormWrapperProps {
  gameId: string;
  opponents: { id: string; name: string; area: string | null }[];
}

export function NegotiationFormWrapper({
  gameId,
  opponents,
}: NegotiationFormWrapperProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setVisible(true)}>
        交渉を作成
      </Button>
      <NegotiationFormModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        gameId={gameId}
        opponents={opponents}
      />
    </>
  );
}
