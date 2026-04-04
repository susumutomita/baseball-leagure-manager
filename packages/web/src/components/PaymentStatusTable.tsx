"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";

interface PaymentMember {
  id: string;
  name: string;
  notified: boolean;
}

interface PaymentStatusTableProps {
  members: PaymentMember[];
  perMember: number;
  paypayLink: string | null;
  settlementStatus: string;
}

export function PaymentStatusTable({
  members,
  perMember,
  paypayLink,
  settlementStatus,
}: PaymentStatusTableProps) {
  const notifiedCount = members.filter((m) => m.notified).length;

  return (
    <Container
      header={
        <Header
          variant="h2"
          counter={`(${notifiedCount}/${members.length})`}
          description="精算通知の送信状況"
        >
          支払いステータス
        </Header>
      }
    >
      <Table
        columnDefinitions={[
          {
            id: "name",
            header: "メンバー",
            cell: (item) => item.name,
          },
          {
            id: "amount",
            header: "金額",
            cell: () => `¥${perMember.toLocaleString()}`,
          },
          {
            id: "status",
            header: "通知ステータス",
            cell: (item) =>
              item.notified ? (
                <StatusIndicator type="success">通知済み</StatusIndicator>
              ) : (
                <StatusIndicator type="pending">未通知</StatusIndicator>
              ),
          },
          {
            id: "paypay",
            header: "PayPay",
            cell: () =>
              paypayLink ? (
                <Link href={paypayLink} external>
                  支払いリンク
                </Link>
              ) : (
                <Box color="text-status-inactive">—</Box>
              ),
          },
          {
            id: "settled",
            header: "精算状況",
            cell: () =>
              settlementStatus === "SETTLED" ? (
                <StatusIndicator type="success">精算済み</StatusIndicator>
              ) : (
                <Button variant="inline-link" disabled>
                  未精算
                </Button>
              ),
          },
        ]}
        items={members}
        variant="embedded"
      />
    </Container>
  );
}
