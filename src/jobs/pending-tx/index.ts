import { createLogger, shutdownLogger } from "@infra/logger";
import { loadPendingTxConfig } from "@infra/config";
import { loadPendingEntries } from "./outbox-db";

const logger = createLogger("PendingTxCheck");

async function run(): Promise<void> {
  const config = loadPendingTxConfig();

  logger.info({ thresholdMinutes: config.thresholdMinutes }, "pending tx check started");

  const entries = loadPendingEntries(config.outboxDbPath, config.thresholdMinutes);

  if (entries.length === 0) {
    logger.info({ type: "PENDING_TX_OK", count: 0 }, "no stale pending tx");
    return;
  }

  const oldestMinutes = Math.max(...entries.map((e) => e.ageMinutes));

  for (const entry of entries) {
    logger.warn(
      {
        type: "PENDING_TX_STALE",
        id: entry.id,
        topic: entry.topic,
        txHash: entry.txHash,
        chainId: entry.chainId,
        createdAt: entry.createdAt,
        ageMinutes: entry.ageMinutes,
      },
      "stale pending tx detected",
    );
  }

  logger.warn(
    { type: "PENDING_TX_SUMMARY", count: entries.length, oldestMinutes },
    "pending tx check completed",
  );
}

run()
  .catch((err) => {
    logger.error({ err }, "pending tx check failed");
    process.exitCode = 1;
  })
  .finally(() => shutdownLogger());
