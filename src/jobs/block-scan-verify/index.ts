import { createLogger, shutdownLogger } from "@infra/logger";
import { loadBlockScanConfig } from "@infra/config";
import { loadChainsAndTokens, ChainRow } from "@jobs/balance/config-db";
import { loadScanStates } from "./scan-state";

const logger = createLogger("BlockScanVerify");

async function fetchBlockNumber(rpcUrl: string, timeoutMs: number): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      signal: controller.signal,
    });

    const json = (await response.json()) as { result?: string };
    return parseInt(json.result ?? "0", 16);
  } finally {
    clearTimeout(timer);
  }
}

async function run(): Promise<void> {
  const config = loadBlockScanConfig();
  const { chains } = loadChainsAndTokens(config.configDbPath);

  if (chains.length === 0) {
    logger.error("No active chains found in config DB");
    return;
  }

  const chainIds = chains.map((c) => c.chain_id);
  const chainMap = new Map<string, ChainRow>(chains.map((c) => [c.chain_id, c]));
  const states = loadScanStates(config.listenerStateDir, chainIds);

  logger.info({ chainCount: chains.length, stateCount: states.length }, "block scan verify started");

  let hasLag = false;

  for (const state of states) {
    const chain = chainMap.get(state.chainId);
    if (!chain) continue;

    try {
      const currentBlock = await fetchBlockNumber(chain.rpc_url, config.rpcTimeoutMs);
      const lag = currentBlock - state.lastBlock;

      if (lag > config.blockLagThreshold) {
        hasLag = true;
        logger.warn(
          {
            type: "BLOCK_LAG",
            chainId: state.chainId,
            chain: chain.name,
            scanner: state.prefix,
            lastScanned: state.lastBlock,
            currentBlock,
            lag,
            threshold: config.blockLagThreshold,
          },
          "block scan lagging behind",
        );
      } else {
        logger.info(
          {
            type: "BLOCK_SYNC_OK",
            chainId: state.chainId,
            chain: chain.name,
            scanner: state.prefix,
            lastScanned: state.lastBlock,
            currentBlock,
            lag,
          },
          "block scan in sync",
        );
      }
    } catch (err) {
      logger.error(
        { chainId: state.chainId, chain: chain.name, scanner: state.prefix, err },
        "block number query failed",
      );
    }
  }

  // Check for chains with no state files
  for (const chain of chains) {
    const hasState = states.some((s) => s.chainId === chain.chain_id);
    if (!hasState) {
      logger.warn(
        { type: "NO_SCAN_STATE", chainId: chain.chain_id, chain: chain.name },
        "no scan state found for chain",
      );
    }
  }

  const summaryLevel = hasLag ? "warn" : "info";
  logger[summaryLevel](
    { type: "BLOCK_SCAN_SUMMARY", chainsChecked: states.length },
    "block scan verify completed",
  );
}

run()
  .catch((err) => {
    logger.error({ err }, "block scan verify failed");
    process.exitCode = 1;
  })
  .finally(() => shutdownLogger());
