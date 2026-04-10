function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key]?.trim() || defaultValue;
}

export function loadBalanceConfig() {
  return {
    configDbPath: optionalEnv("CONFIG_DATABASE_URL", "file:../StableCoinBC_Adapter/data/config.db").replace(/^file:/, ""),
    hotWalletAddress: requireEnv("HOT_WALLET_ADDRESS"),
    rpcTimeoutMs: Number(optionalEnv("RPC_TIMEOUT_MS", "5000")),
    thresholds: {
      native: optionalEnv("THRESHOLD_NATIVE", "0.1"),
      token: optionalEnv("THRESHOLD_TOKEN", "10"),
    },
  };
}

export type BalanceConfig = ReturnType<typeof loadBalanceConfig>;

export function loadHealthCheckConfig() {
  return {
    configDbPath: optionalEnv("CONFIG_DATABASE_URL", "file:../StableCoinBC_Adapter/data/config.db").replace(/^file:/, ""),
    adapterHealthUrl: optionalEnv("ADAPTER_HEALTH_URL", "http://localhost:8081/health"),
    adapterWsUrl: optionalEnv("ADAPTER_WS_URL", "ws://localhost:8080/ws"),
    checkTimeoutMs: Number(optionalEnv("HEALTH_CHECK_TIMEOUT_MS", "5000")),
    rpcTimeoutMs: Number(optionalEnv("RPC_TIMEOUT_MS", "5000")),
  };
}

export type HealthCheckConfig = ReturnType<typeof loadHealthCheckConfig>;

export function loadPendingTxConfig() {
  return {
    outboxDbPath: optionalEnv("OUTBOX_DATABASE_URL", "file:../StableCoinBC_Adapter/data/outbox.db").replace(/^file:/, ""),
    thresholdMinutes: Number(optionalEnv("PENDING_TX_THRESHOLD_MINUTES", "10")),
  };
}

export type PendingTxConfig = ReturnType<typeof loadPendingTxConfig>;

export function loadBlockScanConfig() {
  return {
    configDbPath: optionalEnv("CONFIG_DATABASE_URL", "file:../StableCoinBC_Adapter/data/config.db").replace(/^file:/, ""),
    listenerStateDir: optionalEnv("LISTENER_STATE_DIR", "../StableCoinBC_Adapter_Listener/.state"),
    blockLagThreshold: Number(optionalEnv("BLOCK_LAG_THRESHOLD", "100")),
    rpcTimeoutMs: Number(optionalEnv("RPC_TIMEOUT_MS", "5000")),
  };
}

export type BlockScanConfig = ReturnType<typeof loadBlockScanConfig>;
