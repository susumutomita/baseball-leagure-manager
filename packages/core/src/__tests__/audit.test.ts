import { describe, expect, it, mock, spyOn } from "bun:test";
import { writeAuditLog } from "../lib/audit";

function createMockSupabase(insertResult: {
  error: { message: string } | null;
}) {
  return {
    from: (_table: string) => ({
      insert: (_entry: unknown) => Promise.resolve(insertResult),
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
    it("エラーなく完了する", async () => {
      const supabase = createMockSupabase({ error: null });
      await expect(writeAuditLog(supabase, entry)).resolves.toBeUndefined();
    });
  });

  describe("書き込みが失敗したとき", () => {
    it("console.errorにエラーを出力する", async () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const supabase = createMockSupabase({
        error: { message: "connection refused" },
      });

      await writeAuditLog(supabase, entry);

      expect(consoleSpy).toHaveBeenCalledWith("監査ログ書き込み失敗:", {
        message: "connection refused",
      });
      mock.restore();
    });
  });
});
