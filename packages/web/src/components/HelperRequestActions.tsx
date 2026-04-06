"use client";

import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HelperRequestActionsProps {
  requestId: string;
  currentStatus: string;
}

export function HelperRequestActions({
  requestId,
  currentStatus,
}: HelperRequestActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const handleUpdate = async (status: string) => {
    setPending(status);
    try {
      const res = await fetch(`/api/helper-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  };

  if (currentStatus !== "PENDING") return null;

  return (
    <SpaceBetween direction="horizontal" size="xxs">
      <Button
        variant="primary"
        onClick={() => handleUpdate("ACCEPTED")}
        loading={pending === "ACCEPTED"}
        disabled={pending !== null}
      >
        承諾
      </Button>
      <Button
        onClick={() => handleUpdate("DECLINED")}
        loading={pending === "DECLINED"}
        disabled={pending !== null}
      >
        辞退
      </Button>
      <Button
        variant="link"
        onClick={() => handleUpdate("CANCELLED")}
        loading={pending === "CANCELLED"}
        disabled={pending !== null}
      >
        キャンセル
      </Button>
    </SpaceBetween>
  );
}
