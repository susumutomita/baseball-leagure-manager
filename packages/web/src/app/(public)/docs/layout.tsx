"use client";

import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(true);

  return (
    <AppLayout
      navigation={
        <SideNavigation
          activeHref={pathname}
          onFollow={(e) => {
            e.preventDefault();
            router.push(e.detail.href);
          }}
          header={{ text: "ドキュメント", href: "/docs" }}
          items={[
            { type: "link", text: "概要", href: "/docs" },
            { type: "link", text: "API リファレンス", href: "/docs/api" },
            { type: "link", text: "AI エージェント", href: "/docs/ai" },
          ]}
        />
      }
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      content={children}
      toolsHide
    />
  );
}
