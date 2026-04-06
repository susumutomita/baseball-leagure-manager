// ============================================================
// 招待リンク管理 — Issue #112
// ============================================================
import type { InviteType, TeamInvitation } from "../types/domain";

export type CreateInvitationInput = {
  team_id: string;
  invite_type: InviteType;
  created_by: string;
  expires_at?: string;
  max_uses?: number;
  metadata?: Record<string, unknown>;
};

export type InvitationValidationError =
  | "INACTIVE"
  | "EXPIRED"
  | "MAX_USES_REACHED";

/**
 * 8文字の招待コードを生成 (紛らわしい文字を除外)
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 招待データを構築
 */
export function createInvitation(
  input: CreateInvitationInput,
): Omit<TeamInvitation, "id" | "created_at" | "updated_at"> {
  return {
    team_id: input.team_id,
    invite_type: input.invite_type,
    invite_code: generateInviteCode(),
    created_by: input.created_by,
    expires_at: input.expires_at ?? null,
    max_uses: input.max_uses ?? null,
    use_count: 0,
    metadata_json: input.metadata ?? {},
    is_active: true,
  };
}

/**
 * 招待の有効性を検証
 */
export function validateTeamInvitation(
  invitation: TeamInvitation,
  now: Date = new Date(),
): { valid: boolean; error?: InvitationValidationError } {
  if (!invitation.is_active) {
    return { valid: false, error: "INACTIVE" };
  }
  if (invitation.expires_at && new Date(invitation.expires_at) < now) {
    return { valid: false, error: "EXPIRED" };
  }
  if (
    invitation.max_uses !== null &&
    invitation.use_count >= invitation.max_uses
  ) {
    return { valid: false, error: "MAX_USES_REACHED" };
  }
  return { valid: true };
}

/**
 * 招待使用時に use_count をインクリメント
 */
export function useInvitation(invitation: TeamInvitation): TeamInvitation {
  return {
    ...invitation,
    use_count: invitation.use_count + 1,
  };
}

/**
 * 招待URLを構築
 */
export function buildTeamInvitationUrl(
  baseUrl: string,
  inviteCode: string,
): string {
  return `${baseUrl}/invite/${inviteCode}`;
}
