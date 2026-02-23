#!/usr/bin/env node
/**
 * ClawRouter CLI
 *
 * Standalone proxy for deployed setups where the proxy needs to survive gateway restarts.
 *
 * Usage:
 *   npx @blockrun/clawrouter              # Start standalone proxy
 *   npx @blockrun/clawrouter --version    # Show version
 *   npx @blockrun/clawrouter --port 8402  # Custom port
 *
 * For production deployments, use with PM2:
 *   pm2 start "npx @blockrun/clawrouter" --name clawrouter
 */

import { startProxy, getProxyPort } from "./proxy.js";
import { resolveOrGenerateWalletKey } from "./auth.js";
import { BalanceMonitor } from "./balance.js";
import { VERSION } from "./version.js";
import { runDoctor } from "./doctor.js";

function printHelp(): void {
  console.log(`
ClawRouter v${VERSION} - Smart LLM Router

Usage:
  clawrouter [options]
  clawrouter doctor [opus] [question]

Options:
  --version, -v     Show version number
  --help, -h        Show this help message
  --port <number>   Port to listen on (default: ${getProxyPort()})

Commands:
  doctor            AI-powered diagnostics (default: Sonnet ~$0.003)
  doctor opus       Use Opus for deeper analysis (~$0.01)

Examples:
  # Start standalone proxy
  npx @blockrun/clawrouter

  # Run diagnostics (uses Sonnet by default)
  npx @blockrun/clawrouter doctor

  # Use Opus for complex issues
  npx @blockrun/clawrouter doctor opus

  # Ask a specific question
  npx @blockrun/clawrouter doctor "why is my request failing?"

  # Opus + question
  npx @blockrun/clawrouter doctor opus "深度分析我的配置问题"

Environment Variables:
  BLOCKRUN_WALLET_KEY     Private key for x402 payments (auto-generated if not set)
  BLOCKRUN_PROXY_PORT     Default proxy port (default: 8402)

For more info: https://github.com/BlockRunAI/ClawRouter
`);
}

function parseArgs(args: string[]): {
  version: boolean;
  help: boolean;
  doctor: boolean;
  port?: number;
} {
  const result = {
    version: false,
    help: false,
    doctor: false,
    port: undefined as number | undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "doctor" || arg === "--doctor") {
      result.doctor = true;
    } else if (arg === "--port" && args[i + 1]) {
      result.port = parseInt(args[i + 1], 10);
      i++; // Skip next arg
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.doctor) {
    // Parse: doctor [opus|sonnet] [question...]
    const rawArgs = process.argv.slice(2);
    const doctorIndex = rawArgs.findIndex((a) => a === "doctor" || a === "--doctor");
    const afterDoctor = rawArgs.slice(doctorIndex + 1);

    // Check if first arg is model selection
    let model: "sonnet" | "opus" = "sonnet"; // default to cheaper
    let questionArgs = afterDoctor;

    if (afterDoctor[0] === "opus") {
      model = "opus";
      questionArgs = afterDoctor.slice(1);
    } else if (afterDoctor[0] === "sonnet") {
      model = "sonnet";
      questionArgs = afterDoctor.slice(1);
    }

    const userQuestion = questionArgs.join(" ").trim() || undefined;
    await runDoctor(userQuestion, model);
    process.exit(0);
  }

  // Resolve wallet key
  const { key: walletKey, address, source } = await resolveOrGenerateWalletKey();

  if (source === "generated") {
    console.log(`[ClawRouter] Generated new wallet: ${address}`);
  } else if (source === "saved") {
    console.log(`[ClawRouter] Using saved wallet: ${address}`);
  } else {
    console.log(`[ClawRouter] Using wallet from BLOCKRUN_WALLET_KEY: ${address}`);
  }

  // Start the proxy
  const proxy = await startProxy({
    walletKey,
    port: args.port,
    onReady: (port) => {
      console.log(`[ClawRouter] Proxy listening on http://127.0.0.1:${port}`);
      console.log(`[ClawRouter] Health check: http://127.0.0.1:${port}/health`);
    },
    onError: (error) => {
      console.error(`[ClawRouter] Error: ${error.message}`);
    },
    onRouted: (decision) => {
      const cost = decision.costEstimate.toFixed(4);
      const saved = (decision.savings * 100).toFixed(0);
      console.log(`[ClawRouter] [${decision.tier}] ${decision.model} $${cost} (saved ${saved}%)`);
    },
    onLowBalance: (info) => {
      console.warn(`[ClawRouter] Low balance: ${info.balanceUSD}. Fund: ${info.walletAddress}`);
    },
    onInsufficientFunds: (info) => {
      console.error(
        `[ClawRouter] Insufficient funds. Balance: ${info.balanceUSD}, Need: ${info.requiredUSD}`,
      );
      console.error(`[ClawRouter] Need help? Run: npx @blockrun/clawrouter doctor`);
    },
  });

  // Check balance
  const monitor = new BalanceMonitor(address);
  try {
    const balance = await monitor.checkBalance();
    if (balance.isEmpty) {
      console.log(`[ClawRouter] Wallet balance: $0.00 (using FREE model)`);
      console.log(`[ClawRouter] Fund wallet for premium models: ${address}`);
    } else if (balance.isLow) {
      console.log(`[ClawRouter] Wallet balance: ${balance.balanceUSD} (low)`);
    } else {
      console.log(`[ClawRouter] Wallet balance: ${balance.balanceUSD}`);
    }
  } catch {
    console.log(`[ClawRouter] Wallet: ${address} (balance check pending)`);
  }

  console.log(`[ClawRouter] Ready - Ctrl+C to stop`);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[ClawRouter] Received ${signal}, shutting down...`);
    try {
      await proxy.close();
      console.log(`[ClawRouter] Proxy closed`);
      process.exit(0);
    } catch (err) {
      console.error(`[ClawRouter] Error during shutdown: ${err}`);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(`[ClawRouter] Fatal error: ${err.message}`);
  console.error(`[ClawRouter] Need help? Run: npx @blockrun/clawrouter doctor`);
  process.exit(1);
});
