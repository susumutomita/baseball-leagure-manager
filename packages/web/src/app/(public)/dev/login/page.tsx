import { isDevLoginEnabled } from "@/lib/dev-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { notFound } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  missing_member: "ログイン対象のメンバーが指定されていません。",
  member_not_found:
    "指定されたメンバーが見つからないか、ACTIVE ではありません。",
  member_update_failed:
    "開発用ログインの準備に失敗しました。DB 状態を確認してください。",
};

interface SearchParams {
  error?: string;
}

interface MemberRow {
  id: string;
  name: string;
  teams: { name: string } | { name: string }[] | null;
}

function getTeamName(teams: MemberRow["teams"]) {
  if (!teams) return "チーム不明";
  return Array.isArray(teams) ? (teams[0]?.name ?? "チーム不明") : teams.name;
}

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isDevLoginEnabled()) {
    notFound();
  }

  const { error } = await searchParams;
  const supabase = createAdminClient();
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, name, teams(name)")
    .eq("status", "ACTIVE")
    .order("team_id", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="ローカル開発専用。seed メンバーで疑似ログインします。"
        >
          Dev Login
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container>
          <SpaceBetween size="s">
            <Box variant="p">
              事前にローカル Supabase を起動し、`.env.local` にローカル API URL
              と publishable key を設定してください。
            </Box>
            <Box variant="p">
              選んだメンバーに `line_user_id` が未設定なら、開発用 ID
              を自動で割り当てます。
            </Box>
          </SpaceBetween>
        </Container>

        {error && <Alert type="error">{ERROR_MESSAGES[error] ?? error}</Alert>}

        {membersError ? (
          <Alert type="error">
            メンバー一覧を取得できませんでした: {membersError.message}
          </Alert>
        ) : (members as MemberRow[] | null) &&
          (members as MemberRow[]).length > 0 ? (
          <SpaceBetween size="m">
            {(members as MemberRow[]).map((member) => (
              <Container
                key={member.id}
                header={
                  <Header variant="h2" description={getTeamName(member.teams)}>
                    {member.name}
                  </Header>
                }
              >
                <Button
                  variant="primary"
                  href={`/api/dev/login?member_id=${member.id}&redirect=/dashboard`}
                >
                  このメンバーでログイン
                </Button>
              </Container>
            ))}
          </SpaceBetween>
        ) : (
          <Alert type="warning">
            ACTIVE メンバーが見つかりません。seed を確認してください。
          </Alert>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
