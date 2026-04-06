import { describe, expect, it } from "vitest";
import {
  aggregateRsvps,
  filterRsvpsForVisibility,
} from "../lib/rsvp-visibility";
import { createRsvpFixture } from "../lib/test-fixtures";

const rsvps = [
  createRsvpFixture({ id: "r1", member_id: "m1", response: "AVAILABLE" }),
  createRsvpFixture({ id: "r2", member_id: "m2", response: "AVAILABLE" }),
  createRsvpFixture({ id: "r3", member_id: "m3", response: "UNAVAILABLE" }),
  createRsvpFixture({ id: "r4", member_id: "m4", response: "MAYBE" }),
  createRsvpFixture({ id: "r5", member_id: "m5", response: "NO_RESPONSE" }),
];

describe("aggregateRsvps", () => {
  it("回答別の集計を返す", () => {
    const agg = aggregateRsvps(rsvps);
    expect(agg.available).toBe(2);
    expect(agg.unavailable).toBe(1);
    expect(agg.maybe).toBe(1);
    expect(agg.no_response).toBe(1);
    expect(agg.total).toBe(5);
  });
});

describe("filterRsvpsForVisibility", () => {
  describe("ALLモードのとき", () => {
    it("全RSVPを返す", () => {
      const view = filterRsvpsForVisibility(rsvps, "ALL", false);
      expect(view.mode).toBe("ALL");
      if (view.mode === "ALL") {
        expect(view.rsvps).toHaveLength(5);
      }
    });
  });

  describe("ADMIN_ONLYモードのとき", () => {
    it("管理者には全RSVPを返す", () => {
      const view = filterRsvpsForVisibility(rsvps, "ADMIN_ONLY", true);
      expect(view.mode).toBe("ALL");
    });

    it("一般メンバーには集計のみ返す", () => {
      const view = filterRsvpsForVisibility(rsvps, "ADMIN_ONLY", false);
      expect(view.mode).toBe("ADMIN_ONLY");
      if (view.mode === "ADMIN_ONLY") {
        expect(view.aggregate.total).toBe(5);
      }
    });
  });

  describe("AGGREGATE_ONLYモードのとき", () => {
    it("管理者にも全RSVPを返す", () => {
      const view = filterRsvpsForVisibility(rsvps, "AGGREGATE_ONLY", true);
      expect(view.mode).toBe("ALL");
    });

    it("一般メンバーには集計のみ返す", () => {
      const view = filterRsvpsForVisibility(rsvps, "AGGREGATE_ONLY", false);
      expect(view.mode).toBe("AGGREGATE_ONLY");
      if (view.mode === "AGGREGATE_ONLY") {
        expect(view.aggregate.available).toBe(2);
      }
    });
  });
});
