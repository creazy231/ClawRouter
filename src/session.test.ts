import { describe, expect, it } from "vitest";

import { deriveSessionId, DEFAULT_SESSION_CONFIG, SessionStore } from "./session.js";

describe("deriveSessionId", () => {
  it("returns same ID for same first user message", () => {
    const messages = [{ role: "user", content: "hello world" }];
    const id1 = deriveSessionId(messages);
    const id2 = deriveSessionId(messages);
    expect(id1).toBe(id2);
  });

  it("returns different IDs for different first user messages", () => {
    const a = deriveSessionId([{ role: "user", content: "first conversation" }]);
    const b = deriveSessionId([{ role: "user", content: "second conversation" }]);
    expect(a).not.toBe(b);
  });

  it("is stable regardless of subsequent messages", () => {
    const firstMsg = { role: "user", content: "what is the capital of France?" };
    const id1 = deriveSessionId([firstMsg]);
    const id2 = deriveSessionId([
      firstMsg,
      { role: "assistant", content: "Paris" },
      { role: "user", content: "and Germany?" },
    ]);
    expect(id1).toBe(id2);
  });

  it("skips system messages and uses first user message", () => {
    const withSystem = [
      { role: "system", content: "you are a helpful assistant" },
      { role: "user", content: "my question" },
    ];
    const withoutSystem = [{ role: "user", content: "my question" }];
    expect(deriveSessionId(withSystem)).toBe(deriveSessionId(withoutSystem));
  });

  it("returns undefined when no user messages exist", () => {
    expect(deriveSessionId([])).toBeUndefined();
    expect(deriveSessionId([{ role: "system", content: "only system" }])).toBeUndefined();
  });

  it("returns a short hex string (8 chars)", () => {
    const id = deriveSessionId([{ role: "user", content: "test" }]);
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("DEFAULT_SESSION_CONFIG", () => {
  it("has session persistence enabled by default", () => {
    expect(DEFAULT_SESSION_CONFIG.enabled).toBe(true);
  });
});

describe("SessionStore.setSession", () => {
  it("updates pinned model when fallback model differs from routing decision", () => {
    const store = new SessionStore();
    const sessionId = "abc12345";

    // First call: routing decision pins kimi-k2.5
    store.setSession(sessionId, "moonshot/kimi-k2.5", "MEDIUM");
    expect(store.getSession(sessionId)?.model).toBe("moonshot/kimi-k2.5");

    // Second call: actual model used was fallback (gemini-flash)
    store.setSession(sessionId, "google/gemini-2.5-flash-lite", "MEDIUM");
    expect(store.getSession(sessionId)?.model).toBe("google/gemini-2.5-flash-lite");
  });

  it("subsequent requests use the fallback model when pinned", () => {
    const store = new SessionStore();
    const sessionId = "abc12345";

    store.setSession(sessionId, "moonshot/kimi-k2.5", "MEDIUM");
    store.setSession(sessionId, "google/gemini-2.5-flash-lite", "MEDIUM");

    // Next request reads pinned model — should get the fallback, not the primary
    const pinned = store.getSession(sessionId);
    expect(pinned?.model).toBe("google/gemini-2.5-flash-lite");
    expect(pinned?.requestCount).toBe(2);
  });
});
