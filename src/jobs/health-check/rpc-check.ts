export interface RpcCheckResult {
  chainId: string;
  chain: string;
  status: "ok" | "error";
  blockNumber?: number;
  latencyMs: number;
  error?: string;
}

export async function checkRpc(
  rpcUrl: string,
  chainId: string,
  chainName: string,
  timeoutMs: number,
): Promise<RpcCheckResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const json = (await response.json()) as { result?: string; error?: { message: string } };
    if (json.error) {
      return { chainId, chain: chainName, status: "error", latencyMs: Date.now() - start, error: json.error.message };
    }

    const blockNumber = parseInt(json.result ?? "0", 16);
    return { chainId, chain: chainName, status: "ok", blockNumber, latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { chainId, chain: chainName, status: "error", latencyMs: Date.now() - start, error: message };
  }
}
