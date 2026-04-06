import { describe, expect, it } from "vitest";
import {
  WEBHOOK_EVENT_TYPES,
  createWebhookEvent,
  isGameTransitionEvent,
  isRsvpRespondedEvent,
} from "../lib/webhook-events";
import type { GameTransitionPayload } from "../lib/webhook-events";

describe("createWebhookEvent", () => {
  it("正しい構造のイベントを生成する", () => {
    const event = createWebhookEvent("game.created", "team-1", {
      gameId: "game-1",
    });
    expect(event.type).toBe("game.created");
    expect(event.teamId).toBe("team-1");
    expect(event.payload).toEqual({ gameId: "game-1" });
    expect(event.id).toMatch(/^evt_/);
    expect(event.timestamp).toBeDefined();
  });

  it("一意のIDを生成する", () => {
    const event1 = createWebhookEvent("game.created", "team-1", {});
    const event2 = createWebhookEvent("game.created", "team-1", {});
    expect(event1.id).not.toBe(event2.id);
  });
});

describe("isGameTransitionEvent", () => {
  it("game.transitionイベントでtrueを返す", () => {
    const event = createWebhookEvent<GameTransitionPayload>(
      "game.transition",
      "team-1",
      {
        gameId: "game-1",
        title: "テスト",
        fromStatus: "DRAFT",
        toStatus: "COLLECTING",
        actorId: "user-1",
      },
    );
    expect(isGameTransitionEvent(event)).toBe(true);
  });

  it("他のイベントでfalseを返す", () => {
    const event = createWebhookEvent("rsvp.responded", "team-1", {});
    expect(isGameTransitionEvent(event)).toBe(false);
  });
});

describe("isRsvpRespondedEvent", () => {
  it("rsvp.respondedイベントでtrueを返す", () => {
    const event = createWebhookEvent("rsvp.responded", "team-1", {});
    expect(isRsvpRespondedEvent(event)).toBe(true);
  });
});

describe("WEBHOOK_EVENT_TYPES", () => {
  it("すべてのイベントタイプが定義されている", () => {
    expect(WEBHOOK_EVENT_TYPES).toContain("game.created");
    expect(WEBHOOK_EVENT_TYPES).toContain("game.transition");
    expect(WEBHOOK_EVENT_TYPES).toContain("rsvp.responded");
    expect(WEBHOOK_EVENT_TYPES).toContain("settlement.completed");
    expect(WEBHOOK_EVENT_TYPES.length).toBeGreaterThanOrEqual(12);
  });
});
