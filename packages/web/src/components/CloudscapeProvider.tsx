"use client";

import "@cloudscape-design/global-styles/index.css";
import type { ReactNode } from "react";

export function CloudscapeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
