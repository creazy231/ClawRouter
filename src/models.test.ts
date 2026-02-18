import { describe, expect, it } from "vitest";

import { resolveModelAlias } from "./models.js";

describe("resolveModelAlias", () => {
  it("maps legacy Claude dot IDs to Anthropic-compatible dash IDs", () => {
    expect(resolveModelAlias("anthropic/claude-sonnet-4.6")).toBe("anthropic/claude-sonnet-4-6");
    expect(resolveModelAlias("anthropic/claude-opus-4.6")).toBe("anthropic/claude-opus-4-6");
    expect(resolveModelAlias("anthropic/claude-haiku-4.5")).toBe("anthropic/claude-haiku-4-5");
  });

  it("resolves legacy IDs even when sent with blockrun/ prefix", () => {
    expect(resolveModelAlias("blockrun/anthropic/claude-sonnet-4.6")).toBe(
      "anthropic/claude-sonnet-4-6",
    );
    expect(resolveModelAlias("blockrun/anthropic/claude-opus-4.6")).toBe(
      "anthropic/claude-opus-4-6",
    );
  });
});
