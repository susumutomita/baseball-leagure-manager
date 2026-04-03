"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SettlementActionsProps {
  gameId: string;
  settlementStatus: string;
  perMember: number;
}

export function SettlementActions({
  gameId,
  settlementStatus,
  perMember,
}: SettlementActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypayLink, setPaypayLink] = useState<string | null>(null);

  const handleNotify = async () => {
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/settlement/notify`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "精算通知の送信に失敗しました");
        return;
      }

      const data = await res.json();
      setPaypayLink(data.data.paypay_link);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(false);
    }
  };

  const handleComplete = async () => {
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/settlement/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "精算完了に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(false);
    }
  };

  return (
    <SpaceBetween size="s">
      {error && (
        <Flashbar
          items={[
            {
              type: "error",
              content: error,
              dismissible: true,
              onDismiss: () => setError(null),
              id: "settlement-error",
            },
          ]}
        />
      )}

      {settlementStatus === "DRAFT" && (
        <Button variant="primary" loading={pending} onClick={handleNotify}>
          精算通知を送信
        </Button>
      )}

      {(settlementStatus === "NOTIFIED" || settlementStatus === "SETTLED") &&
        paypayLink && (
          <Box>
            <Link href={paypayLink} external>
              PayPay で ¥{perMember.toLocaleString()} を支払う
            </Link>
          </Box>
        )}

      {settlementStatus === "NOTIFIED" && (
        <Button variant="primary" loading={pending} onClick={handleComplete}>
          精算完了
        </Button>
      )}
    </SpaceBetween>
  );
}
