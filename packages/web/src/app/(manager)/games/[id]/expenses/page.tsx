import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";

import { SettlementActions } from "@/components/SettlementActions";
import { createClient } from "@/lib/supabase/server";
import { generatePayPayLink } from "@match-engine/core";

const CATEGORY_LABELS: Record<string, string> = {
  GROUND: "グラウンド",
  UMPIRE: "審判",
  BALL: "ボール代",
  DRINK: "飲料",
  TOURNAMENT_FEE: "大会費",
  OTHER: "その他",
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
        {expenses && expenses.length > 0 ? (
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
                cell: (item) => CATEGORY_LABELS[item.category] ?? item.category,
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
                cell: (item) => (item.split_with_opponent ? "はい" : "いいえ"),
              },
              {
                id: "note",
                header: "備考",
                cell: (item) => item.note ?? "—",
              },
            ]}
            items={expenses}
            variant="embedded"
          />
        ) : (
          <Container header={<Header variant="h2">経費一覧</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              経費が登録されていません
            </Box>
          </Container>
        )}

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
                  game.title
                    ? [
                        {
                          label: "PayPay リンク",
                          value: (
                            <Link
                              href={generatePayPayLink(
                                settlement.per_member,
                                `${game.title} 精算`,
                              )}
                              external
                            >
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
      </SpaceBetween>
    </ContentLayout>
  );
}
