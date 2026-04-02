"use client";

import type liff from "@line/liff";
import { useCallback, useEffect, useState } from "react";

interface LiffState {
  isReady: boolean;
  isInClient: boolean;
  profile: { userId: string; displayName: string; pictureUrl?: string } | null;
  accessToken: string | null;
  error: string | null;
}

let liffInstance: typeof liff | null = null;

export function useLiff() {
  const [state, setState] = useState<LiffState>({
    isReady: false,
    isInClient: false,
    profile: null,
    accessToken: null,
    error: null,
  });

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setState((s) => ({ ...s, error: "LIFF ID is not configured" }));
      return;
    }

    (async () => {
      try {
        const liffModule = await import("@line/liff");
        const lf = liffModule.default;
        await lf.init({ liffId });
        liffInstance = lf;

        if (!lf.isLoggedIn()) {
          lf.login();
          return;
        }

        const profile = await lf.getProfile();
        const token = lf.getAccessToken();

        setState({
          isReady: true,
          isInClient: lf.isInClient(),
          profile: {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          },
          accessToken: token,
          error: null,
        });
      } catch (e) {
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : "LIFF initialization failed",
        }));
      }
    })();
  }, []);

  const closeLiff = useCallback(() => {
    if (liffInstance?.isInClient()) {
      liffInstance.closeWindow();
    }
  }, []);

  return { ...state, closeLiff };
}
