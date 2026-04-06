"use client";

import { CreateActivityModal } from "@/components/CreateActivityModal";
import { TeamProvider } from "@/contexts/TeamContext";
import type { TeamInfo } from "@/contexts/TeamContext";
import AppLayout from "@cloudscape-design/components/app-layout";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MeData {
  displayName: string;
  teams: TeamInfo[];
  currentTeam: TeamInfo | null;
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamInfo | null>(null);
  const teamId = activeTeam?.teamId ?? "";

  useEffect(() => {
    setMeLoading(true);
    setMeError(null);
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("認証情報の取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        if (data?.data) {
          setMe(data.data);
          const savedTeamId = localStorage.getItem("mound_active_team");
          const saved = data.data.teams?.find(
            (t: TeamInfo) => t.teamId === savedTeamId,
          );
          setActiveTeam(saved ?? data.data.currentTeam ?? null);
        }
      })
      .catch((err) => {
        setMeError(err instanceof Error ? err.message : "認証エラー");
      })
      .finally(() => {
        setMeLoading(false);
      });
  }, []);

  const switchTeam = (team: TeamInfo) => {
    setActiveTeam(team);
    localStorage.setItem("mound_active_team", team.teamId);
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("mound_active_team");
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  const teamMenuItems = (me?.teams ?? []).map((t) => ({
    id: `team-${t.teamId}`,
    text: `${t.teamName}${t.teamId === activeTeam?.teamId ? " ✓" : ""}`,
  }));

  const displayName = meLoading ? "" : (me?.displayName ?? "");

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "/dashboard",
            title: "mound",
          }}
          utilities={[
            ...(me && me.teams.length > 1
              ? [
                  {
                    type: "menu-dropdown" as const,
                    text: activeTeam?.teamName ?? "チーム選択",
                    items: teamMenuItems,
                    onItemClick: ({ detail }: { detail: { id: string } }) => {
                      const team = me.teams.find(
                        (t) => `team-${t.teamId}` === detail.id,
                      );
                      if (team) switchTeam(team);
                    },
                  },
                ]
              : []),
            {
              type: "menu-dropdown" as const,
              text: meLoading ? "..." : displayName,
              iconName: "user-profile" as const,
              items: [
                {
                  id: "team-info",
                  text: activeTeam
                    ? `所属: ${activeTeam.teamName}`
                    : "チーム未所属",
                },
                { id: "logout", text: "ログアウト" },
              ],
              onItemClick: ({ detail }: { detail: { id: string } }) => {
                if (detail.id === "logout") setShowLogoutConfirm(true);
              },
            },
          ]}
        />
      </div>

      {meError ? (
        <Box padding="xxl" textAlign="center">
          <SpaceBetween size="m">
            <Box color="text-status-error">{meError}</Box>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </SpaceBetween>
        </Box>
      ) : meLoading ? (
        <Box padding="xxl" textAlign="center">
          <Spinner size="large" />
        </Box>
      ) : (
        <AppLayout
          navigation={
            <SideNavigation
              activeHref={pathname}
              onFollow={(e) => {
                e.preventDefault();
                if (e.detail.href === "#create") {
                  setShowCreateModal(true);
                } else if (e.detail.href !== "#") {
                  router.push(e.detail.href);
                }
              }}
              header={{ text: "メニュー", href: "/dashboard" }}
              items={[
                { type: "link", text: "ダッシュボード", href: "/dashboard" },
                { type: "link", text: "試合一覧", href: "/games" },
                {
                  type: "link",
                  text: "活動を作成",
                  href: "#create",
                },
                { type: "divider" },
                {
                  type: "section",
                  text: "チーム管理",
                  items: [
                    {
                      type: "link",
                      text: "メンバー",
                      href: teamId ? `/teams/${teamId}` : "#",
                    },
                    {
                      type: "link",
                      text: "助っ人",
                      href: teamId ? `/teams/${teamId}/helpers` : "#",
                    },
                    {
                      type: "link",
                      text: "対戦相手",
                      href: teamId ? `/teams/${teamId}/opponents` : "#",
                    },
                    {
                      type: "link",
                      text: "グラウンド",
                      href: teamId ? `/teams/${teamId}/grounds` : "#",
                    },
                    {
                      type: "link",
                      text: "成績・統計",
                      href: teamId ? `/teams/${teamId}/stats` : "#",
                    },
                    {
                      type: "link",
                      text: "カレンダー",
                      href: teamId ? `/teams/${teamId}/calendar` : "#",
                    },
                    {
                      type: "link",
                      text: "設定",
                      href: "/settings",
                    },
                  ],
                },
              ]}
            />
          }
          navigationOpen={navOpen}
          onNavigationChange={({ detail }) => setNavOpen(detail.open)}
          content={
            <TeamProvider activeTeam={activeTeam}>{children}</TeamProvider>
          }
          toolsHide
          headerSelector="#top-nav"
        />
      )}

      <CreateActivityModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
      />

      <Modal
        visible={showLogoutConfirm}
        onDismiss={() => setShowLogoutConfirm(false)}
        header="ログアウト"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setShowLogoutConfirm(false)}
              >
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleLogout}>
                ログアウト
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        ログアウトしますか？
      </Modal>
    </>
  );
}
