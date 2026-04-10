import { ethers } from "ethers";
import { createLogger, shutdownLogger } from "@infra/logger";
import { loadBalanceConfig } from "@infra/config";
import { loadChainsAndTokens } from "./config-db";
import { getNativeBalance, getTokenBalance } from "./chain-query";

const logger = createLogger("BalanceCheck");

interface BalanceResult {
  chain: string;
  chainId: string;
  symbol: string;
  type: "native" | "ERC-20";
  balance: string;
  threshold: string;
  status: "ok" | "low";
}

async function run(): Promise<void> {
  const config = loadBalanceConfig();
  const { chains, tokensByChain } = loadChainsAndTokens(config.configDbPath);

  if (chains.length === 0) {
    logger.error("No active chains found in config DB");
    return;
  }

  logger.info({ address: config.hotWalletAddress, chainCount: chains.length }, "balance check started");

  const results: BalanceResult[] = [];
  let hasLow = false;

  for (const chain of chains) {
    const provider = new ethers.JsonRpcProvider(chain.rpc_url);

    // native balance
    try {
      const balance = await getNativeBalance(provider, config.hotWalletAddress, chain.decimals, config.rpcTimeoutMs);
      const low = parseFloat(balance) < parseFloat(config.thresholds.native);
      if (low) hasLow = true;

      const result: BalanceResult = {
        chain: chain.name,
        chainId: chain.chain_id,
        symbol: chain.native,
        type: "native",
        balance,
        threshold: config.thresholds.native,
        status: low ? "low" : "ok",
      };
      results.push(result);

      const logFn = low ? logger.warn.bind(logger) : logger.info.bind(logger);
      logFn(result, low ? "LOW BALANCE" : "balance ok");
    } catch (err) {
      logger.error({ chain: chain.name, chainId: chain.chain_id, symbol: chain.native, err }, "balance query failed");
    }

    // token balances
    const tokens = tokensByChain.get(chain.chain_id) ?? [];
    for (const token of tokens) {
      try {
        const balance = await getTokenBalance(
          provider,
          config.hotWalletAddress,
          token.contract_address,
          token.decimals,
          config.rpcTimeoutMs,
        );
        const low = parseFloat(balance) < parseFloat(config.thresholds.token);
        if (low) hasLow = true;

        const result: BalanceResult = {
          chain: chain.name,
          chainId: chain.chain_id,
          symbol: token.symbol,
          type: "ERC-20",
          balance,
          threshold: config.thresholds.token,
          status: low ? "low" : "ok",
        };
        results.push(result);

        const logFn = low ? logger.warn.bind(logger) : logger.info.bind(logger);
        logFn(result, low ? "LOW BALANCE" : "balance ok");
      } catch (err) {
        logger.error({ chain: chain.name, chainId: chain.chain_id, symbol: token.symbol, err }, "balance query failed");
      }
    }
  }

  const lowCount = results.filter((r) => r.status === "low").length;
  const errorLevel = hasLow ? "warn" : "info";
  logger[errorLevel](
    { total: results.length, ok: results.length - lowCount, low: lowCount },
    "balance check completed",
  );
}

run()
  .catch((err) => {
    logger.error({ err }, "balance check failed");
    process.exitCode = 1;
  })
  .finally(() => shutdownLogger());
