// ============================================================
// 認可ヘルパー — Role ベースアクセス制御 (RBAC)
// ============================================================
import type { MemberRole } from "../types/domain";

/** Role の権限レベル (大きいほど強い) */
const ROLE_LEVEL: Record<MemberRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

/** 指定された role が required 以上の権限を持つか判定 */
export function hasRole(role: MemberRole, required: MemberRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[required];
}

/** 権限不足エラー */
export class InsufficientRoleError extends Error {
  constructor(required: MemberRole) {
    super(`この操作には ${required} 以上の権限が必要です`);
    this.name = "InsufficientRoleError";
  }
}

/** 権限チェック (不足時は例外) */
export function assertRole(role: MemberRole, required: MemberRole): void {
  if (!hasRole(role, required)) {
    throw new InsufficientRoleError(required);
  }
}
