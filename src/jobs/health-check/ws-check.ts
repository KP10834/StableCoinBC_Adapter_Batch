import WebSocket from "ws";

export interface WsCheckResult {
  url: string;
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

export function checkWebSocket(wsUrl: string, timeoutMs: number): Promise<WsCheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.terminate();
      resolve({ url: wsUrl, status: "error", latencyMs: Date.now() - start, error: `timeout after ${timeoutMs}ms` });
    }, timeoutMs);

    const ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      clearTimeout(timer);
      ws.close();
      resolve({ url: wsUrl, status: "ok", latencyMs: Date.now() - start });
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      ws.terminate();
      resolve({ url: wsUrl, status: "error", latencyMs: Date.now() - start, error: String(err.message ?? err) });
    });
  });
}
