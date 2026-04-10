import { createLogger, shutdownLogger } from "@infra/logger";
import { loadHealthCheckConfig } from "@infra/config";
import { loadChainsAndTokens } from "@jobs/balance/config-db";
import { checkRpc, RpcCheckResult } from "./rpc-check";
import { checkWebSocket, WsCheckResult } from "./ws-check";
import { checkPm2, Pm2CheckResult } from "./pm2-check";
import { checkAdapterHealth, AdapterHealthResult } from "./adapter-health";

const logger = createLogger("HealthCheck");

async function run(): Promise<void> {
  const config = loadHealthCheckConfig();
  const { chains } = loadChainsAndTokens(config.configDbPath);

  logger.info({ chainCount: chains.length }, "health check started");

  const start = Date.now();
  let okCount = 0;
  let warnCount = 0;
  let errorCount = 0;

  // RPC checks (parallel)
  const rpcPromises = chains.map((chain) =>
    checkRpc(chain.rpc_url, chain.chain_id, chain.name, config.rpcTimeoutMs),
  );

  const rpcResults: RpcCheckResult[] = await Promise.all(rpcPromises);
  for (const r of rpcResults) {
    if (r.status === "ok") {
      okCount++;
      logger.info({ type: "RPC_OK", chainId: r.chainId, chain: r.chain, blockNumber: r.blockNumber, latencyMs: r.latencyMs }, "RPC node ok");
    } else {
      errorCount++;
      logger.error({ type: "RPC_DOWN", chainId: r.chainId, chain: r.chain, latencyMs: r.latencyMs, error: r.error }, "RPC node connection failed");
    }
  }

  // WebSocket check
  const wsResult: WsCheckResult = await checkWebSocket(config.adapterWsUrl, config.checkTimeoutMs);
  if (wsResult.status === "ok") {
    okCount++;
    logger.info({ type: "WS_OK", url: wsResult.url, latencyMs: wsResult.latencyMs }, "WebSocket server ok");
  } else {
    errorCount++;
    logger.error({ type: "WS_DOWN", url: wsResult.url, latencyMs: wsResult.latencyMs, error: wsResult.error }, "WebSocket connection failed");
  }

  // PM2 process check
  const pm2Result: Pm2CheckResult = await checkPm2(config.checkTimeoutMs);
  if (pm2Result.status === "ok") {
    okCount++;
    logger.info({ type: "PM2_OK", processes: pm2Result.processes }, "Listener processes ok");
  } else if (pm2Result.status === "warn") {
    warnCount++;
    logger.warn({ type: "PM2_WARN", error: pm2Result.error }, "No Listener processes found");
  } else {
    errorCount++;
    for (const name of pm2Result.problems) {
      const proc = pm2Result.processes.find((p) => p.name === name);
      logger.error({ type: "PROCESS_DOWN", processName: name, status: proc?.status }, "Listener process down");
    }
  }

  // Adapter health check
  const adapterResult: AdapterHealthResult = await checkAdapterHealth(config.adapterHealthUrl, config.checkTimeoutMs);
  if (adapterResult.status === "ok") {
    okCount++;
    logger.info({ type: "ADAPTER_OK", latencyMs: adapterResult.latencyMs }, "Adapter health ok");
  } else {
    errorCount++;
    logger.error(
      { type: "ADAPTER_UNHEALTHY", latencyMs: adapterResult.latencyMs, adapterStatus: adapterResult.adapterStatus, checks: adapterResult.checks, error: adapterResult.error },
      "Adapter health check failed",
    );
  }

  // Summary
  const totalChecks = okCount + warnCount + errorCount;
  const overallStatus = errorCount > 0 ? "error" : warnCount > 0 ? "warn" : "ok";
  const summaryLevel = errorCount > 0 ? "error" : warnCount > 0 ? "warn" : "info";

  logger[summaryLevel](
    { type: "HEALTH_SUMMARY", status: overallStatus, totalChecks, okCount, warnCount, errorCount, durationMs: Date.now() - start },
    "health check completed",
  );
}

run()
  .catch((err) => {
    logger.error({ err }, "health check failed");
    process.exitCode = 1;
  })
  .finally(() => shutdownLogger());
