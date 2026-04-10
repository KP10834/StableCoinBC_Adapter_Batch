import fs from "node:fs";
import path from "node:path";

export interface ScanStateEntry {
  chainId: string;
  prefix: string;
  lastBlock: number;
}

export function loadScanStates(stateDir: string, chainIds: string[]): ScanStateEntry[] {
  const resolved = path.resolve(stateDir);
  const results: ScanStateEntry[] = [];

  const prefixes = ["log", "trace"];

  for (const chainId of chainIds) {
    for (const prefix of prefixes) {
      const filePath = path.join(resolved, `${prefix}-${chainId}.json`);
      try {
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { lastBlock: number };
          if (data.lastBlock != null) {
            results.push({ chainId, prefix, lastBlock: data.lastBlock });
          }
        }
      } catch {
        // skip unreadable state files
      }
    }
  }

  return results;
}
