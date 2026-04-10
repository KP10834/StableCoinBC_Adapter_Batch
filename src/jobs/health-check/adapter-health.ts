import http from "node:http";

export interface AdapterHealthResult {
  url: string;
  status: "ok" | "error";
  latencyMs: number;
  adapterStatus?: string;
  checks?: Record<string, { status: string }>;
  error?: string;
}

export function checkAdapterHealth(url: string, timeoutMs: number): Promise<AdapterHealthResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(body) as {
            status: string;
            checks?: Record<string, { status: string }>;
          };

          resolve({
            url,
            status: json.status === "ok" ? "ok" : "error",
            latencyMs: Date.now() - start,
            adapterStatus: json.status,
            checks: json.checks,
          });
        } catch (parseErr) {
          resolve({
            url,
            status: "error",
            latencyMs: Date.now() - start,
            error: `JSON parse failed: ${parseErr}`,
          });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        url,
        status: "error",
        latencyMs: Date.now() - start,
        error: `timeout after ${timeoutMs}ms`,
      });
    });

    req.on("error", (err) => {
      resolve({
        url,
        status: "error",
        latencyMs: Date.now() - start,
        error: err.message,
      });
    });
  });
}
