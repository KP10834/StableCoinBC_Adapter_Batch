import { execFile } from "node:child_process";

interface Pm2Process {
  name: string;
  status: string;
}

export interface Pm2CheckResult {
  status: "ok" | "warn" | "error";
  latencyMs: number;
  processes: Pm2Process[];
  problems: string[];
  error?: string;
}

export function checkPm2(timeoutMs: number): Promise<Pm2CheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    execFile("pm2", ["jlist"], { timeout: timeoutMs }, (err, stdout) => {
      if (err) {
        resolve({
          status: "error",
          latencyMs: Date.now() - start,
          processes: [],
          problems: [],
          error: err.message,
        });
        return;
      }

      try {
        const list = JSON.parse(stdout) as Array<{
          name: string;
          pm2_env?: { status?: string };
        }>;

        const relevant = list.filter(
          (p) =>
            p.name.startsWith("listener-log-") ||
            p.name.startsWith("listener-trace-") ||
            p.name === "listener-manager",
        );

        const processes = relevant.map((p) => ({
          name: p.name,
          status: p.pm2_env?.status ?? "unknown",
        }));

        const problems = processes.filter((p) => p.status !== "online").map((p) => p.name);

        let status: "ok" | "warn" | "error";
        if (problems.length > 0) {
          status = "error";
        } else if (relevant.length === 0) {
          status = "warn";
        } else {
          status = "ok";
        }

        resolve({ status, latencyMs: Date.now() - start, processes, problems });
      } catch (parseErr) {
        resolve({
          status: "error",
          latencyMs: Date.now() - start,
          processes: [],
          problems: [],
          error: `JSON parse failed: ${parseErr}`,
        });
      }
    });
  });
}
