"use client";

import { createContext, useContext } from "react";

export interface TeamInfo {
  memberId: string;
  teamId: string;
  teamName: string;
  role: string;
}

interface TeamContextValue {
  activeTeam: TeamInfo | null;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({
  children,
  activeTeam,
}: {
  children: React.ReactNode;
  activeTeam: TeamInfo | null;
}) {
  return (
    <TeamContext.Provider value={{ activeTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamInfo | null {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx.activeTeam;
}

export function useRequiredTeam(): TeamInfo {
  const team = useTeam();
  if (!team) throw new Error("チームが選択されていません");
  return team;
}
