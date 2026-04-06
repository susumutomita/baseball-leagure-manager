import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import {
  conflict,
  errorResponse,
  notFound,
  parseBody,
  unauthorized,
} from "../lib/api-handler";

describe("parseBody", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
  });

  it("正しいデータをパースする", () => {
    const result = parseBody(schema, { name: "テスト", age: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("テスト");
      expect(result.data.age).toBe(25);
    }
  });

  it("不正なデータでValidationErrを返す", () => {
    const result = parseBody(schema, { name: "", age: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("VALIDATION_ERROR");
      expect(result.status).toBe(400);
    }
  });
});

describe("errorResponse", () => {
  it("NOT_FOUNDエラーを整形する", () => {
    const result = errorResponse({
      type: "NOT_FOUND",
      entity: "game",
      id: "123",
    });
    expect(result.status).toBe(404);
    expect(result.error.type).toBe("NOT_FOUND");
    expect(result.error.message).toContain("game");
  });
});

describe("notFound", () => {
  it("NOT_FOUNDのHandlerResultを返す", () => {
    const result = notFound("game", "abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("NOT_FOUND");
      expect(result.status).toBe(404);
    }
  });
});

describe("unauthorized", () => {
  it("AUTHORIZATION_ERRORのHandlerResultを返す", () => {
    const result = unauthorized("ADMIN", "MEMBER");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHORIZATION_ERROR");
      expect(result.status).toBe(403);
    }
  });
});

describe("conflict", () => {
  it("CONFLICTのHandlerResultを返す", () => {
    const result = conflict("game", "他のユーザーが更新中");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("CONFLICT");
      expect(result.status).toBe(409);
    }
  });
});
