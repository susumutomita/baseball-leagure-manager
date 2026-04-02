"use client";

import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(true);

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "/",
            title: "試合成立エンジン",
          }}
          utilities={[
            {
              type: "button",
              text: "試合作成",
              onClick: () => router.push("/games/new"),
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
              router.push(e.detail.href);
            }}
            header={{ text: "メニュー", href: "/" }}
            items={[
              { type: "link", text: "ダッシュボード", href: "/" },
              { type: "link", text: "試合作成", href: "/games/new" },
              { type: "divider" },
              {
                type: "section",
                text: "管理",
                items: [
                  { type: "link", text: "チーム", href: "/teams" },
                  { type: "link", text: "助っ人", href: "/helpers" },
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
    </>
  );
}
