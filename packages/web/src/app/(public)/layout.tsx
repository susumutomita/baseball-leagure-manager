"use client";

import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useRouter } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

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
              onClick: () => router.push("/login"),
            },
          ]}
        />
      </div>
      {children}
    </>
  );
}
