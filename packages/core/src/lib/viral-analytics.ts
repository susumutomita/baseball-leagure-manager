// ============================================================
// バイラル分析 — Issue #112
// ============================================================
import type {
  InvitationUse,
  InviteType,
  TeamInvitation,
} from "../types/domain";
import { INVITE_TYPES } from "../types/domain";

export type ViralMetrics = {
  total_invites: number;
  total_conversions: number;
  conversion_rate: number;
  viral_coefficient: number;
  channel_breakdown: Record<
    InviteType,
    { invites: number; conversions: number; rate: number }
  >;
};

/**
 * バイラル指標を計算
 */
export function calculateViralMetrics(
  invitations: TeamInvitation[],
  uses: InvitationUse[],
): ViralMetrics {
  const totalInvites = invitations.length;
  const totalConversions = uses.length;
  const conversionRate = totalInvites > 0 ? totalConversions / totalInvites : 0;

  const channelBreakdown = {} as ViralMetrics["channel_breakdown"];

  for (const channel of INVITE_TYPES) {
    const channelInvites = invitations.filter((i) => i.invite_type === channel);
    const channelInviteIds = new Set(channelInvites.map((i) => i.id));
    const channelUses = uses.filter((u) =>
      channelInviteIds.has(u.invitation_id),
    );
    channelBreakdown[channel] = {
      invites: channelInvites.length,
      conversions: channelUses.length,
      rate:
        channelInvites.length > 0
          ? channelUses.length / channelInvites.length
          : 0,
    };
  }

  const viralCoefficient =
    totalInvites > 0 ? totalConversions / totalInvites : 0;

  return {
    total_invites: totalInvites,
    total_conversions: totalConversions,
    conversion_rate: Math.round(conversionRate * 1000) / 1000,
    viral_coefficient: Math.round(viralCoefficient * 1000) / 1000,
    channel_breakdown: channelBreakdown,
  };
}
