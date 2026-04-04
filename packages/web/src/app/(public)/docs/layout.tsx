"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./layout.module.css";

const NAV_SECTIONS = [
  {
    title: "ドキュメント",
    links: [
      { href: "/docs", label: "概要" },
      { href: "/docs/api", label: "API リファレンス" },
      { href: "/docs/ai", label: "AI エージェント" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.docsLayout}>
      {/* Desktop sidebar */}
      <nav className={styles.sidebar}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>{section.title}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? styles.sidebarLinkActive
                    : styles.sidebarLink
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Mobile nav */}
      <div className={styles.mobileNav}>
        <button
          type="button"
          className={styles.mobileNavToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "メニューを閉じる" : "ドキュメントメニュー"}
        </button>
        {mobileOpen && (
          <div className={styles.mobileNavLinks}>
            {NAV_SECTIONS.flatMap((section) =>
              section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )),
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
