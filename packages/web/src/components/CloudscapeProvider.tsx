"use client";

import "@cloudscape-design/global-styles/index.css";
import { Mode, applyMode } from "@cloudscape-design/global-styles";
import { type ReactNode, useEffect } from "react";

export function CloudscapeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyMode(Mode.Light);
    document.body.classList.add("awsui-visual-refresh");
    document.body.style.backgroundColor = "#f2f3f3";
    document.body.style.color = "#000716";
  }, []);

  return <>{children}</>;
}
