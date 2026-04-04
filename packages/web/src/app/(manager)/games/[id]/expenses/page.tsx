import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";

import { PaymentStatusTable } from "@/components/PaymentStatusTable";
import { SettlementActions } from "@/components/SettlementActions";
import { createClient } from "@/lib/supabase/server";
import { calculateSettlement, generatePayPayLink } from "@match-engine/core";

const CATEGORY_LABELS: Record<string, string> = {
  GROUND: "グラウンド",
  UMPIRE: "審判",
  BALL: "ボール代",
  DRINK: "飲料",
  TOURNAMENT_FEE: "大会費",
  OTHER: "その他",
};

const CATEGORY_COLORS: Record<string, "green" | "blue" | "grey"> = {
  GROUND: "green",
  UMPIRE: "blue",
  BALL: "grey",
  DRINK: "grey",
  TOURNAMENT_FEE: "blue",
  OTHER: "grey",
};

const SETTLEMENT_STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  NOTIFIED: "info",
  SETTLED: "success",
};

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  NOTIFIED: "通知済み",
  SETTLED: "精算済み",
};

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <ContentLayout header={<Header variant="h1">経費・精算</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          試合が見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, members:paid_by(name)")
    .eq("game_id", id);

  const { data: settlement } = await supabase
    .from("settlements")
    .select("*")
    .eq("game_id", id)
    .single();

  // 経費合計（ランニングトータル）
  const totalAmount = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const splitAmount = (expenses ?? [])
    .filter((e) => e.split_with_opponent)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // 精算プレビュー計算（settlement 未作成でも表示用に計算）
  const hasExpenses = expenses && expenses.length > 0;
  const previewCalc =
    hasExpenses && settlement?.member_count
      ? calculateSettlement({
          expenses: expenses.map((e) => ({
            amount: Number(e.amount),
            split_with_opponent: e.split_with_opponent,
          })),
          memberCount: settlement.member_count,
        })
      : null;

  // PayPay リンク
  const paypayLink =
    settlement && game.title
      ? generatePayPayLink(settlement.per_member, `${game.title} 精算`)
      : null;

  // 支払いステータス用のメンバー情報を取得
  const { data: notifications } = await supabase
    .from("notification_logs")
    .select("recipient_id, created_at")
    .eq("game_id", id)
    .eq("notification_type", "SETTLEMENT");

  const notifiedIds = new Set((notifications ?? []).map((n) => n.recipient_id));

  // 参加メンバー一覧を取得
  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id, members:member_id(id, name)")
    .eq("game_id", id);

  let paymentMembers: { id: string; name: string; notified: boolean }[] = [];

  if (attendances && attendances.length > 0) {
    paymentMembers = attendances.map((a) => {
      const member = a.members as unknown as { id: string; name: string };
      return {
        id: member?.id ?? a.member_id,
        name: member?.name ?? "不明",
        notified: notifiedIds.has(a.member_id),
      };
    });
  } else {
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("member_id, members:member_id(id, name)")
      .eq("game_id", id)
      .eq("response", "AVAILABLE");

    if (rsvps) {
      paymentMembers = rsvps.map((r) => {
        const member = r.members as unknown as { id: string; name: string };
        return {
          id: member?.id ?? r.member_id,
          name: member?.name ?? "不明",
          notified: notifiedIds.has(r.member_id),
        };
      });
    }
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={<Link href={`/games/${id}`}>← 試合詳細に戻る</Link>}
        >
          {game.title} — 経費・精算
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* 経費一覧テーブル */}
        {hasExpenses ? (
          <Table
            header={
              <Header variant="h2" counter={`(${expenses.length})`}>
                経費一覧
              </Header>
            }
            columnDefinitions={[
              {
                id: "category",
                header: "カテゴリ",
                cell: (item) => (
                  <Badge color={CATEGORY_COLORS[item.category] ?? "grey"}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </Badge>
                ),
              },
              {
                id: "amount",
                header: "金額",
                cell: (item) => `¥${Number(item.amount).toLocaleString()}`,
              },
              {
                id: "paid_by",
                header: "支払者",
                cell: (item) => {
                  const member = item.members as { name: string } | null;
                  return member?.name ?? "—";
                },
              },
              {
                id: "split_with_opponent",
                header: "対戦相手と折半",
                cell: (item) =>
                  item.split_with_opponent ? (
                    <StatusIndicator type="success">はい</StatusIndicator>
                  ) : (
                    <StatusIndicator type="stopped">いいえ</StatusIndicator>
                  ),
              },
              {
                id: "note",
                header: "備考",
                cell: (item) => item.note ?? "—",
              },
            ]}
            items={expenses}
            variant="embedded"
            footer={
              <Box textAlign="right" fontWeight="bold" padding={{ right: "l" }}>
                合計: ¥{totalAmount.toLocaleString()}
                {splitAmount > 0 && (
                  <Box
                    variant="small"
                    color="text-status-info"
                    display="inline"
                    padding={{ left: "s" }}
                  >
                    (うち折半対象: ¥{splitAmount.toLocaleString()})
                  </Box>
                )}
              </Box>
            }
          />
        ) : (
          <Container header={<Header variant="h2">経費一覧</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              経費が登録されていません
            </Box>
          </Container>
        )}

        {/* ランニングトータル & 精算プレビュー */}
        {hasExpenses && (
          <Container header={<Header variant="h2">費用サマリ</Header>}>
            <ColumnLayout columns={3} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">合計費用</Box>
                <Box variant="awsui-value-large">
                  ¥{totalAmount.toLocaleString()}
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">折半対象額</Box>
                <Box variant="awsui-value-large">
                  ¥{splitAmount.toLocaleString()}
                </Box>
              </div>
              {previewCalc && (
                <div>
                  <Box variant="awsui-key-label">
                    一人あたり（{previewCalc.memberCount}人）
                  </Box>
                  <Box variant="awsui-value-large">
                    ¥{previewCalc.perMember.toLocaleString()}
                  </Box>
                </div>
              )}
            </ColumnLayout>
          </Container>
        )}

        {/* 精算サマリ */}
        {settlement ? (
          <Container header={<Header variant="h2">精算サマリ</Header>}>
            <SpaceBetween size="l">
              <KeyValuePairs
                items={[
                  {
                    label: "合計費用",
                    value: `¥${Number(settlement.total_cost).toLocaleString()}`,
                  },
                  {
                    label: "対戦相手負担",
                    value: `¥${Number(settlement.opponent_share).toLocaleString()}`,
                  },
                  {
                    label: "チーム負担",
                    value: `¥${Number(settlement.team_cost).toLocaleString()}`,
                  },
                  {
                    label: "一人あたり",
                    value: `¥${Number(settlement.per_member).toLocaleString()}`,
                  },
                  {
                    label: "参加人数",
                    value: `${settlement.member_count}人`,
                  },
                  {
                    label: "ステータス",
                    value: (
                      <StatusIndicator
                        type={
                          SETTLEMENT_STATUS_TYPE[settlement.status] ?? "pending"
                        }
                      >
                        {SETTLEMENT_STATUS_LABELS[settlement.status] ??
                          settlement.status}
                      </StatusIndicator>
                    ),
                  },
                  ...((settlement.status === "NOTIFIED" ||
                    settlement.status === "SETTLED") &&
                  paypayLink
                    ? [
                        {
                          label: "PayPay リンク",
                          value: (
                            <Link href={paypayLink} external>
                              PayPay で ¥
                              {Number(settlement.per_member).toLocaleString()}{" "}
                              を支払う
                            </Link>
                          ),
                        },
                      ]
                    : []),
                ]}
              />

              <SettlementActions
                gameId={id}
                settlementStatus={settlement.status}
                perMember={settlement.per_member}
              />
            </SpaceBetween>
          </Container>
        ) : (
          <Container header={<Header variant="h2">精算サマリ</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              精算データがありません
            </Box>
          </Container>
        )}

        {/* 支払いステータス */}
        {settlement &&
          settlement.status !== "DRAFT" &&
          paymentMembers.length > 0 && (
            <PaymentStatusTable
              members={paymentMembers}
              perMember={settlement.per_member}
              paypayLink={paypayLink}
              settlementStatus={settlement.status}
            />
          )}
      </SpaceBetween>
    </ContentLayout>
  );
}
