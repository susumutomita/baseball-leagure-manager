"use client";

import { CreateActivityModal } from "@/components/CreateActivityModal";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TeamInfo {
  memberId: string;
  teamId: string;
  teamName: string;
  role: string;
}

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
  const [me, setMe] = useState<MeData | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamInfo | null>(null);
  const teamId = activeTeam?.teamId ?? "";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setMe(data.data);
          // ローカルストレージから前回選択したチームを復元
          const savedTeamId = localStorage.getItem("mound_active_team");
          const saved = data.data.teams?.find(
            (t: TeamInfo) => t.teamId === savedTeamId,
          );
          setActiveTeam(saved ?? data.data.currentTeam ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const switchTeam = (team: TeamInfo) => {
    setActiveTeam(team);
    localStorage.setItem("mound_active_team", team.teamId);
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    localStorage.removeItem("mound_active_team");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // チーム切替メニューアイテム
  const teamMenuItems = (me?.teams ?? []).map((t) => ({
    id: `team-${t.teamId}`,
    text: `${t.teamName}${t.teamId === activeTeam?.teamId ? " ✓" : ""}`,
  }));

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
              text: me?.displayName ?? "",
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
                if (detail.id === "logout") handleLogout();
              },
            },
          ]}
        />
      </div>

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
        content={children}
        toolsHide
        headerSelector="#top-nav"
      />
      <CreateActivityModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
      />
    </>
  );
}
