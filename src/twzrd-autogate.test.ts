import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isMissingTwzrdGateModule,
  isTwzrdAutoGateEnabled,
  maybeComposeTwzrdAutoGate,
  runTwzrdGateWithTimeout,
  twzrdAutoGateInstallOptions,
  twzrdGateFailOpen,
  twzrdGateTimeoutMs,
  TWZRD_GATE_TIMEOUT_MS,
  type BeforePaymentCreationContext,
  type BeforePaymentCreationResult,
  type TwzrdGateInstallOptions,
  type X402ClientLike,
} from "./twzrd-autogate.js";
import { VERSION } from "./version.js";

function fakeClient(): {
  client: X402ClientLike;
  hooks: Array<(ctx: BeforePaymentCreationContext) => Promise<BeforePaymentCreationResult>>;
} {
  const hooks: Array<(ctx: BeforePaymentCreationContext) => Promise<BeforePaymentCreationResult>> =
    [];
  const client: X402ClientLike = {
    onBeforePaymentCreation(hook) {
      hooks.push(hook);
    },
  };
  return { client, hooks };
}

describe("isTwzrdAutoGateEnabled", () => {
  it("is off by default when both flags are unset", () => {
    expect(isTwzrdAutoGateEnabled({})).toBe(false);
  });

  it("opts in on TWZRD_AUTO_GATE=1", () => {
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "1" })).toBe(true);
  });

  it("opts in on TWZRD_GATE_ENABLED=true", () => {
    expect(isTwzrdAutoGateEnabled({ TWZRD_GATE_ENABLED: "true" })).toBe(true);
  });

  it("treats true/yes/on as enable and 0/false as disable", () => {
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "yes" })).toBe(true);
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "on" })).toBe(true);
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "0" })).toBe(false);
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "false" })).toBe(false);
    expect(isTwzrdAutoGateEnabled({ TWZRD_GATE_ENABLED: "off" })).toBe(false);
  });

  it("lets an explicit disable win over an enable on the other flag", () => {
    expect(isTwzrdAutoGateEnabled({ TWZRD_AUTO_GATE: "1", TWZRD_GATE_ENABLED: "false" })).toBe(
      false,
    );
  });
});

describe("isMissingTwzrdGateModule", () => {
  it("matches only a missing twzrd-x402-gate package", () => {
    expect(
      isMissingTwzrdGateModule(
        Object.assign(
          new Error("Cannot find package 'twzrd-x402-gate' imported from /app/proxy.js"),
          {
            code: "ERR_MODULE_NOT_FOUND",
          },
        ),
      ),
    ).toBe(true);
    expect(
      isMissingTwzrdGateModule(
        Object.assign(
          new Error(
            "Cannot find package 'some-transitive-dep' imported from /app/node_modules/twzrd-x402-gate/index.js",
          ),
          { code: "ERR_MODULE_NOT_FOUND" },
        ),
      ),
    ).toBe(false);
    expect(isMissingTwzrdGateModule(new Error("boom unrelated"))).toBe(false);
  });
});

describe("twzrdAutoGateInstallOptions", () => {
  it("stamps clawrouter/<version> so a refuse is attributable", () => {
    const opts = twzrdAutoGateInstallOptions({}, () => "run-1");
    expect(opts.attribution.integration).toBe(`clawrouter/${VERSION}`);
    expect(opts.attribution.runId).toBe("run-1");
    expect(opts.refuseWashFlagged).toBe(true);
    expect(opts.gateOnCanSpend).toBe(false);
    expect(opts.unsupportedNetworkMode).toBe("observe");
  });

  it("defaults to fail-open so a gate outage cannot stop payments", () => {
    expect(twzrdAutoGateInstallOptions({}, () => "r").failOpen).toBe(true);
    expect(twzrdGateFailOpen({})).toBe(true);
  });

  it("lets an operator opt back into refuse-on-outage", () => {
    for (const v of ["0", "false", "no", "off", "OFF"]) {
      expect(twzrdGateFailOpen({ TWZRD_FAIL_OPEN: v })).toBe(false);
      expect(twzrdAutoGateInstallOptions({ TWZRD_FAIL_OPEN: v }, () => "r").failOpen).toBe(false);
    }
  });

  it("bounds the answer, and ignores a nonsense budget", () => {
    expect(twzrdGateTimeoutMs({})).toBe(TWZRD_GATE_TIMEOUT_MS);
    expect(twzrdGateTimeoutMs({ TWZRD_GATE_TIMEOUT_MS: "50" })).toBe(50);
    for (const bad of ["", "0", "-1", "abc"]) {
      expect(twzrdGateTimeoutMs({ TWZRD_GATE_TIMEOUT_MS: bad })).toBe(TWZRD_GATE_TIMEOUT_MS);
    }
  });
});

describe("runTwzrdGateWithTimeout", () => {
  const never = () => new Promise<BeforePaymentCreationResult>(() => {});

  it("passes a verdict straight through when the gate answers in time", async () => {
    const abort = { abort: true as const, reason: "wash" };
    await expect(
      runTwzrdGateWithTimeout(async () => abort, { timeoutMs: 500, failOpen: true }),
    ).resolves.toEqual(abort);
  });

  it("proceeds when the gate hangs — SpendControl still applies", async () => {
    const warn = vi.fn();
    const out = await runTwzrdGateWithTimeout(never, {
      timeoutMs: 10,
      failOpen: true,
      log: { log: vi.fn(), warn },
    });
    expect(out).toBeUndefined();
    expect(warn.mock.calls[0]?.[0]).toContain("did not answer within 10ms");
  });

  it("refuses when the gate hangs under TWZRD_FAIL_OPEN=false", async () => {
    const out = await runTwzrdGateWithTimeout(never, {
      timeoutMs: 10,
      failOpen: false,
      log: { log: vi.fn(), warn: vi.fn() },
    });
    expect(out).toEqual({
      abort: true,
      reason: "twzrd gate did not answer within 10ms",
    });
  });

  it("treats a throwing gate as a failure instead of propagating into x402", async () => {
    const warn = vi.fn();
    const out = await runTwzrdGateWithTimeout(
      async () => {
        throw new Error("intel.twzrd.xyz unreachable");
      },
      { timeoutMs: 500, failOpen: true, log: { log: vi.fn(), warn } },
    );
    expect(out).toBeUndefined();
    expect(warn.mock.calls[0]?.[0]).toContain("intel.twzrd.xyz unreachable");

    const refused = await runTwzrdGateWithTimeout(
      async () => {
        throw new Error("boom");
      },
      { timeoutMs: 500, failOpen: false, log: { log: vi.fn(), warn: vi.fn() } },
    );
    expect(refused).toEqual({ abort: true, reason: "twzrd gate threw: boom" });
  });

  it("does not leave a late rejection unhandled", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on("unhandledRejection", onUnhandled);
    try {
      await runTwzrdGateWithTimeout(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 5)),
        { timeoutMs: 1, failOpen: true, log: { log: vi.fn(), warn: vi.fn() } },
      );
      await new Promise((r) => setTimeout(r, 30));
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });
});

describe("maybeComposeTwzrdAutoGate", () => {
  const prevAuto = process.env.TWZRD_AUTO_GATE;
  const prevGate = process.env.TWZRD_GATE_ENABLED;

  afterEach(() => {
    if (prevAuto === undefined) delete process.env.TWZRD_AUTO_GATE;
    else process.env.TWZRD_AUTO_GATE = prevAuto;
    if (prevGate === undefined) delete process.env.TWZRD_GATE_ENABLED;
    else process.env.TWZRD_GATE_ENABLED = prevGate;
  });

  it("does not load or register anything on the default path", async () => {
    const loadGate = vi.fn();
    const { client, hooks } = fakeClient();
    const spendHook = async () => undefined;
    client.onBeforePaymentCreation(spendHook);

    const result = await maybeComposeTwzrdAutoGate(client, {
      env: {},
      loadGate,
      log: { log: vi.fn(), warn: vi.fn() },
    });

    expect(result).toEqual({ status: "skipped" });
    expect(loadGate).not.toHaveBeenCalled();
    expect(hooks).toEqual([spendHook]);
  });

  it("composes installTwzrdAutoGate after an existing SpendControl hook", async () => {
    const { client, hooks } = fakeClient();
    const spendHook = async () => undefined;
    client.onBeforePaymentCreation(spendHook);

    let invoked = 0;
    const installTwzrdAutoGate = vi.fn((x402: X402ClientLike, opts?: TwzrdGateInstallOptions) => {
      expect(opts?.attribution.integration).toBe(`clawrouter/${VERSION}`);
      x402.onBeforePaymentCreation(async () => {
        invoked += 1;
      });
    });

    const result = await maybeComposeTwzrdAutoGate(client, {
      env: { TWZRD_AUTO_GATE: "1" },
      loadGate: async () => ({ installTwzrdAutoGate }),
      log: { log: vi.fn(), warn: vi.fn() },
    });

    expect(result).toEqual({ status: "composed", via: "installTwzrdAutoGate" });
    expect(installTwzrdAutoGate).toHaveBeenCalledTimes(1);
    expect(hooks[0]).toBe(spendHook);
    expect(hooks).toHaveLength(2);

    await hooks[1]!({
      selectedRequirements: { payTo: "Seller1111111111111111111111111111111111111" },
    });
    expect(invoked).toBe(1);
  });

  it("registers createTwzrdBeforePaymentHook itself and invokes it", async () => {
    const { client, hooks } = fakeClient();
    const seen: unknown[] = [];
    const createTwzrdBeforePaymentHook = vi.fn(() => {
      return async (requirements: Record<string, unknown>) => {
        seen.push(requirements);
        return { abort: true as const, reason: "wash" };
      };
    });

    const result = await maybeComposeTwzrdAutoGate(client, {
      env: { TWZRD_AUTO_GATE: "1" },
      loadGate: async () => ({ createTwzrdBeforePaymentHook }),
      log: { log: vi.fn(), warn: vi.fn() },
    });

    expect(result).toEqual({ status: "composed", via: "createTwzrdBeforePaymentHook" });
    const abort = await hooks[0]!({ selectedRequirements: { payTo: "wash" } });
    expect(abort).toEqual({ abort: true, reason: "wash" });
    expect(seen).toEqual([{ payTo: "wash" }]);
  });

  it("prefers the hook factory over installTwzrdAutoGate, which replaces our registrar", async () => {
    // installTwzrdAutoGate monkey-patches client.onBeforePaymentCreation, so
    // every hook registered after it inherits a third-party kill switch. When
    // the gate offers both entry points we must take the one that does not.
    const { client } = fakeClient();
    const installTwzrdAutoGate = vi.fn();
    const createTwzrdBeforePaymentHook = vi.fn(() => async () => undefined);

    const result = await maybeComposeTwzrdAutoGate(client, {
      env: { TWZRD_AUTO_GATE: "1" },
      loadGate: async () => ({ installTwzrdAutoGate, createTwzrdBeforePaymentHook }),
      log: { log: vi.fn(), warn: vi.fn() },
    });

    expect(result).toEqual({ status: "composed", via: "createTwzrdBeforePaymentHook" });
    expect(installTwzrdAutoGate).not.toHaveBeenCalled();
  });

  it("time-boxes the composed hook so a hung gate cannot stall a payment", async () => {
    const { client, hooks } = fakeClient();
    const warn = vi.fn();

    await maybeComposeTwzrdAutoGate(client, {
      env: { TWZRD_AUTO_GATE: "1", TWZRD_GATE_TIMEOUT_MS: "10" },
      loadGate: async () => ({
        createTwzrdBeforePaymentHook: () => () =>
          new Promise<BeforePaymentCreationResult>(() => {}),
      }),
      log: { log: vi.fn(), warn },
    });

    const started = Date.now();
    const out = await hooks[0]!({ selectedRequirements: { payTo: "Seller111" } });
    expect(out).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(warn.mock.calls[0]?.[0]).toContain("did not answer within 10ms");
  });

  it("refuses a hung gate when the operator asked for fail-closed", async () => {
    const { client, hooks } = fakeClient();

    await maybeComposeTwzrdAutoGate(client, {
      env: { TWZRD_AUTO_GATE: "1", TWZRD_GATE_TIMEOUT_MS: "10", TWZRD_FAIL_OPEN: "false" },
      loadGate: async () => ({
        createTwzrdBeforePaymentHook: () => () =>
          new Promise<BeforePaymentCreationResult>(() => {}),
      }),
      log: { log: vi.fn(), warn: vi.fn() },
    });

    const out = await hooks[0]!({ selectedRequirements: { payTo: "Seller111" } });
    expect(out).toEqual({ abort: true, reason: "twzrd gate did not answer within 10ms" });
  });

  it("fails open only when twzrd-x402-gate itself is missing", async () => {
    const warn = vi.fn();
    const result = await maybeComposeTwzrdAutoGate(fakeClient().client, {
      env: { TWZRD_AUTO_GATE: "1" },
      loadGate: async () => {
        throw Object.assign(new Error("Cannot find package 'twzrd-x402-gate' imported from /app"), {
          code: "ERR_MODULE_NOT_FOUND",
        });
      },
      log: { log: vi.fn(), warn },
    });
    expect(result.status).toBe("unavailable");
    expect(warn).toHaveBeenCalled();
  });

  it("fails closed on a real module error", async () => {
    await expect(
      maybeComposeTwzrdAutoGate(fakeClient().client, {
        env: { TWZRD_AUTO_GATE: "1" },
        loadGate: async () => {
          throw new Error("unexpected gate init failure");
        },
        log: { log: vi.fn(), warn: vi.fn() },
      }),
    ).rejects.toThrow("unexpected gate init failure");
  });
});
