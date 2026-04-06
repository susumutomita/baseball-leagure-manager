import { describe, expect, it } from "vitest";
import { processDeadlineDefaults } from "../lib/rsvp-defaults";
import { createGameFixture, createRsvpFixture } from "../lib/test-fixtures";

describe("processDeadlineDefaults", () => {
  describe("締切を過ぎているとき", () => {
    const game = createGameFixture({
      rsvp_deadline: "2026-04-01T00:00:00Z",
    });
    const now = new Date("2026-04-02T00:00:00Z");

    it("未回答メンバーを不参加扱いにする", () => {
      const rsvps = [
        createRsvpFixture({ id: "r1", member_id: "m1", response: "AVAILABLE" }),
        createRsvpFixture({
          id: "r2",
          member_id: "m2",
          response: "NO_RESPONSE",
        }),
        createRsvpFixture({
          id: "r3",
          member_id: "m3",
          response: "NO_RESPONSE",
        }),
      ];

      const result = processDeadlineDefaults(game, rsvps, now);
      expect(result).not.toBeNull();
      expect(result!.affected_member_ids).toEqual(["m2", "m3"]);
      expect(result!.default_response).toBe("UNAVAILABLE");
    });

    it("未回答がいなければnullを返す", () => {
      const rsvps = [
        createRsvpFixture({ id: "r1", member_id: "m1", response: "AVAILABLE" }),
      ];
      const result = processDeadlineDefaults(game, rsvps, now);
      expect(result).toBeNull();
    });
  });

  describe("締切前のとき", () => {
    it("nullを返す", () => {
      const game = createGameFixture({
        rsvp_deadline: "2026-04-10T00:00:00Z",
      });
      const rsvps = [
        createRsvpFixture({
          id: "r1",
          member_id: "m1",
          response: "NO_RESPONSE",
        }),
      ];
      const result = processDeadlineDefaults(
        game,
        rsvps,
        new Date("2026-04-01T00:00:00Z"),
      );
      expect(result).toBeNull();
    });
  });

  describe("締切が設定されていないとき", () => {
    it("nullを返す", () => {
      const game = createGameFixture({ rsvp_deadline: null });
      const rsvps = [
        createRsvpFixture({
          id: "r1",
          member_id: "m1",
          response: "NO_RESPONSE",
        }),
      ];
      const result = processDeadlineDefaults(game, rsvps);
      expect(result).toBeNull();
    });
  });
});
