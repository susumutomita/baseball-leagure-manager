import { describe, expect, it } from "vitest";
import { createTeamInvitationFixture } from "../lib/test-fixtures";
import { calculateViralMetrics } from "../lib/viral-analytics";
import type { InvitationUse } from "../types/domain";

describe("calculateViralMetrics", () => {
  it("バイラル係数を正しく計算する", () => {
    const invitations = [
      createTeamInvitationFixture({ id: "i1", invite_type: "OPPONENT" }),
      createTeamInvitationFixture({ id: "i2", invite_type: "OPPONENT" }),
      createTeamInvitationFixture({ id: "i3", invite_type: "HELPER" }),
    ];
    const uses: InvitationUse[] = [
      {
        id: "u1",
        invitation_id: "i1",
        used_by_user_id: "u1",
        used_by_team_id: null,
        used_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "u2",
        invitation_id: "i1",
        used_by_user_id: "u2",
        used_by_team_id: null,
        used_at: "2026-01-02T00:00:00Z",
      },
      {
        id: "u3",
        invitation_id: "i3",
        used_by_user_id: "u3",
        used_by_team_id: null,
        used_at: "2026-01-03T00:00:00Z",
      },
    ];

    const metrics = calculateViralMetrics(invitations, uses);
    expect(metrics.total_invites).toBe(3);
    expect(metrics.total_conversions).toBe(3);
    expect(metrics.viral_coefficient).toBe(1);
  });

  it("チャネル別の内訳を返す", () => {
    const invitations = [
      createTeamInvitationFixture({ id: "i1", invite_type: "OPPONENT" }),
      createTeamInvitationFixture({ id: "i2", invite_type: "HELPER" }),
    ];
    const uses: InvitationUse[] = [
      {
        id: "u1",
        invitation_id: "i1",
        used_by_user_id: "u1",
        used_by_team_id: null,
        used_at: "2026-01-01T00:00:00Z",
      },
    ];

    const metrics = calculateViralMetrics(invitations, uses);
    expect(metrics.channel_breakdown.OPPONENT.invites).toBe(1);
    expect(metrics.channel_breakdown.OPPONENT.conversions).toBe(1);
    expect(metrics.channel_breakdown.HELPER.invites).toBe(1);
    expect(metrics.channel_breakdown.HELPER.conversions).toBe(0);
    expect(metrics.channel_breakdown.LEAGUE.invites).toBe(0);
  });

  it("招待がないときゼロを返す", () => {
    const metrics = calculateViralMetrics([], []);
    expect(metrics.total_invites).toBe(0);
    expect(metrics.viral_coefficient).toBe(0);
    expect(metrics.conversion_rate).toBe(0);
  });
});
