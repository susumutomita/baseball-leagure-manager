import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "packages/core",
    include: ["src/__tests__/**/*.test.ts"],
    globals: false,
  },
});
