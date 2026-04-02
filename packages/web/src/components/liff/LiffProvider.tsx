"use client";

import { useLiff } from "@/lib/liff/client";
import { createContext, useContext } from "react";

interface LiffContextValue {
  isReady: boolean;
  isInClient: boolean;
  profile: { userId: string; displayName: string; pictureUrl?: string } | null;
  accessToken: string | null;
  error: string | null;
  closeLiff: () => void;
}

const LiffContext = createContext<LiffContextValue>({
  isReady: false,
  isInClient: false,
  profile: null,
  accessToken: null,
  error: null,
  closeLiff: () => {},
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const liff = useLiff();

  if (liff.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-red-600">エラーが発生しました</p>
          <p className="mt-1 text-xs text-gray-500">{liff.error}</p>
        </div>
      </div>
    );
  }

  if (!liff.isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return <LiffContext.Provider value={liff}>{children}</LiffContext.Provider>;
}

export function useLiffContext() {
  return useContext(LiffContext);
}
