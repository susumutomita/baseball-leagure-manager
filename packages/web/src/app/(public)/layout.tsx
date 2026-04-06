"use client";

import { LoginModal } from "@/components/LoginModal";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { Suspense, useState } from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "/",
            title: "mound",
          }}
          utilities={[
            {
              type: "button",
              text: "ログイン",
              onClick: () => setShowLogin(true),
            },
          ]}
        />
      </div>
      {children}
      <Suspense>
        <LoginModal visible={showLogin} onDismiss={() => setShowLogin(false)} />
      </Suspense>
    </>
  );
}
