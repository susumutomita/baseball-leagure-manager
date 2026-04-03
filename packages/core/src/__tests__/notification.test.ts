import { describe, expect, it, mock, spyOn } from "bun:test";
import {
  createDefaultDispatchers,
  queueNotification,
  sendBulkNotifications,
  sendNotification,
} from "../lib/notification";
import type {
  ChannelDispatchers,
  NotificationEntry,
} from "../lib/notification";

// --- テストヘルパー ---

function createMockSupabase(insertResult: {
  data: { id: string } | null;
  error: { message: string } | null;
}) {
  return {
    from: (_table: string) => ({
      insert: (_entry: unknown) => ({
        select: (_cols: string) => ({
          single: () => Promise.resolve(insertResult),
        }),
      }),
    }),
  } as unknown as ReturnType<
    typeof import("@supabase/supabase-js").createClient
  >;
}

function createMockSupabaseForSend(insertResult: {
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

function createEntry(
  overrides: Partial<NotificationEntry> = {},
): NotificationEntry {
  return {
    team_id: "team-1",
    game_id: "game-1",
    recipient_type: "MEMBER",
    recipient_id: "member-1",
    channel: "LINE",
    notification_type: "RSVP_REQUEST",
    content: "出欠を回答してください",
    ...overrides,
  };
}

function createMockDispatchers(
  overrides: Partial<ChannelDispatchers> = {},
): ChannelDispatchers {
  return {
    LINE: async () => true,
    EMAIL: async () => true,
    PUSH: async () => true,
    ...overrides,
  };
}

// --- テスト ---

describe("queueNotification", () => {
  describe("登録が成功したとき", () => {
    it("挿入されたレコードのIDを返す", async () => {
      const supabase = createMockSupabase({
        data: { id: "notif-1" },
        error: null,
      });

      const result = await queueNotification(supabase, createEntry());

      expect(result).toEqual({ id: "notif-1" });
    });
  });

  describe("登録が失敗したとき", () => {
    it("nullを返してエラーをログ出力する", async () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const supabase = createMockSupabase({
        data: null,
        error: { message: "insert failed" },
      });

      const result = await queueNotification(supabase, createEntry());

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "通知キュー登録失敗:",
        expect.objectContaining({ message: "insert failed" }),
      );
      mock.restore();
    });
  });
});

describe("sendNotification", () => {
  describe("LINE チャネルで送信成功したとき", () => {
    it("delivered: true の結果を返す", async () => {
      const supabase = createMockSupabaseForSend({ error: null });
      const dispatchers = createMockDispatchers({
        LINE: async () => true,
      });

      const result = await sendNotification(
        supabase,
        createEntry(),
        dispatchers,
      );

      expect(result).toEqual({
        recipient_id: "member-1",
        channel: "LINE",
        delivered: true,
      });
    });
  });

  describe("送信が失敗したとき", () => {
    it("delivered: false の結果を返す", async () => {
      const supabase = createMockSupabaseForSend({ error: null });
      const dispatchers = createMockDispatchers({
        LINE: async () => false,
      });

      const result = await sendNotification(
        supabase,
        createEntry(),
        dispatchers,
      );

      expect(result.delivered).toBe(false);
    });
  });

  describe("EMAIL チャネルで送信したとき", () => {
    it("EMAIL ディスパッチャーが使われる", async () => {
      const supabase = createMockSupabaseForSend({ error: null });
      let emailCalled = false;
      const dispatchers = createMockDispatchers({
        EMAIL: async () => {
          emailCalled = true;
          return true;
        },
      });

      await sendNotification(
        supabase,
        createEntry({ channel: "EMAIL" }),
        dispatchers,
      );

      expect(emailCalled).toBe(true);
    });
  });
});

describe("sendBulkNotifications", () => {
  describe("複数の通知を送信するとき", () => {
    it("全件分の結果を返す", async () => {
      const supabase = createMockSupabaseForSend({ error: null });
      const dispatchers = createMockDispatchers();

      const entries = [
        createEntry({ recipient_id: "member-1" }),
        createEntry({ recipient_id: "member-2", channel: "EMAIL" }),
        createEntry({ recipient_id: "member-3", channel: "PUSH" }),
      ];

      const results = await sendBulkNotifications(
        supabase,
        entries,
        dispatchers,
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.delivered)).toBe(true);
    });
  });

  describe("一部が失敗したとき", () => {
    it("失敗分はdelivered: falseになる", async () => {
      const supabase = createMockSupabaseForSend({ error: null });
      const dispatchers = createMockDispatchers({
        LINE: async () => false,
        EMAIL: async () => true,
      });

      const entries = [
        createEntry({ recipient_id: "member-1", channel: "LINE" }),
        createEntry({ recipient_id: "member-2", channel: "EMAIL" }),
      ];

      const results = await sendBulkNotifications(
        supabase,
        entries,
        dispatchers,
      );

      expect(results[0]?.delivered).toBe(false);
      expect(results[1]?.delivered).toBe(true);
    });
  });
});

describe("createDefaultDispatchers", () => {
  describe("LINE sender を渡したとき", () => {
    it("LINE チャネルで指定した sender が使われる", async () => {
      let lineCalled = false;
      const dispatchers = createDefaultDispatchers(async () => {
        lineCalled = true;
        return true;
      });

      await dispatchers.LINE("user-1", "hello");

      expect(lineCalled).toBe(true);
    });
  });

  describe("EMAIL チャネルのとき", () => {
    it("スタブが true を返す", async () => {
      spyOn(console, "log").mockImplementation(() => {});
      const dispatchers = createDefaultDispatchers(async () => true);

      const result = await dispatchers.EMAIL("user-1", "hello");

      expect(result).toBe(true);
      mock.restore();
    });
  });

  describe("PUSH チャネルのとき", () => {
    it("スタブが true を返す", async () => {
      spyOn(console, "log").mockImplementation(() => {});
      const dispatchers = createDefaultDispatchers(async () => true);

      const result = await dispatchers.PUSH("user-1", "hello");

      expect(result).toBe(true);
      mock.restore();
    });
  });
});
