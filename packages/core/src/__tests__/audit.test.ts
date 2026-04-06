import { describe, expect, it, vi } from "vitest";
import {
  AUDIT_ACTIONS,
  auditGameTransition,
  writeAuditLog,
} from "../lib/audit";

function createMockSupabase(insertResult: {
  data: { id: string } | null;
  error: { message: string } | null;
}) {
  return {
    from: (_table: string) => ({
      insert: (_entry: unknown) => ({
        select: (_fields: string) => ({
          single: () => Promise.resolve(insertResult),
        }),
      }),
    }),
  } as unknown as ReturnType<
    typeof import("@supabase/supabase-js").createClient
  >;
}

describe("writeAuditLog", () => {
  const entry = {
    actor_type: "USER" as const,
    actor_id: "user-1",
    action: "CREATE_MATCH_REQUEST",
    target_type: "match_request",
    target_id: "mr-1",
    before_json: null,
    after_json: { status: "DRAFT" },
  };

  describe("書き込みが成功したとき", () => {
    it("success: trueとidを返す", async () => {
      const supabase = createMockSupabase({
        data: { id: "audit-1" },
        error: null,
      });
      const result = await writeAuditLog(supabase, entry);
      expect(result.success).toBe(true);
      expect(result.id).toBe("audit-1");
    });
  });

  describe("書き込みが失敗したとき", () => {
    it("success: falseとエラーメッセージを返す", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const supabase = createMockSupabase({
        data: null,
        error: { message: "connection refused" },
      });

      const result = await writeAuditLog(supabase, entry);

      expect(result.success).toBe(false);
      expect(result.error).toBe("connection refused");
      expect(consoleSpy).toHaveBeenCalledWith("監査ログ書き込み失敗:", {
        message: "connection refused",
      });
      vi.restoreAllMocks();
    });
  });
});

describe("auditGameTransition", () => {
  it("ゲーム状態遷移の監査ログを書き込む", async () => {
    let capturedEntry: unknown = null;
    const supabase = {
      from: (_table: string) => ({
        insert: (entry: unknown) => {
          capturedEntry = entry;
          return {
            select: (_fields: string) => ({
              single: () =>
                Promise.resolve({ data: { id: "audit-2" }, error: null }),
            }),
          };
        },
      }),
    } as unknown as ReturnType<
      typeof import("@supabase/supabase-js").createClient
    >;

    const result = await auditGameTransition(
      supabase,
      "user-1",
      "USER",
      "game-1",
      "DRAFT",
      "COLLECTING",
    );

    expect(result.success).toBe(true);
    expect(capturedEntry).toEqual({
      actor_type: "USER",
      actor_id: "user-1",
      action: AUDIT_ACTIONS.GAME_TRANSITION,
      target_type: "game",
      target_id: "game-1",
      before_json: { status: "DRAFT" },
      after_json: { status: "COLLECTING" },
    });
  });
});

describe("AUDIT_ACTIONS", () => {
  it("すべてのアクション定数が定義されている", () => {
    expect(AUDIT_ACTIONS.GAME_CREATED).toBe("GAME_CREATED");
    expect(AUDIT_ACTIONS.GAME_TRANSITION).toBe("GAME_TRANSITION");
    expect(AUDIT_ACTIONS.RSVP_RESPONDED).toBe("RSVP_RESPONDED");
    expect(AUDIT_ACTIONS.SETTLEMENT_CALCULATED).toBe("SETTLEMENT_CALCULATED");
  });
});
