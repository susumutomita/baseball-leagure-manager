"use client";

import { HelperRequestFormModal } from "@/components/HelperRequestFormModal";
import Button from "@cloudscape-design/components/button";
import { useState } from "react";

interface HelperRequestFormWrapperProps {
  gameId: string;
  availableHelpers: { id: string; name: string; reliability_score: number }[];
}

export function HelperRequestFormWrapper({
  gameId,
  availableHelpers,
}: HelperRequestFormWrapperProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setVisible(true)}>
        助っ人を打診
      </Button>
      <HelperRequestFormModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        gameId={gameId}
        availableHelpers={availableHelpers}
      />
    </>
  );
}
