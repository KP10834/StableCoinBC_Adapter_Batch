import Database from "better-sqlite3";
import path from "path";

export interface PendingEntry {
  id: number;
  topic: string;
  txHash: string;
  chainId: string;
  createdAt: string;
  ageMinutes: number;
}

export function loadPendingEntries(dbPath: string, thresholdMinutes: number): PendingEntry[] {
  const resolved = path.resolve(dbPath);
  const db = new Database(resolved, { readonly: true });

  try {
    const rows = db
      .prepare(
        `SELECT id, topic, tx_hash, chain_id, created_at,
                ROUND((julianday('now') - julianday(created_at)) * 1440) as age_minutes
         FROM outbox
         WHERE created_at < datetime('now', ? || ' minutes')
         ORDER BY created_at ASC`,
      )
      .all(`-${thresholdMinutes}`) as Array<{
      id: number;
      topic: string;
      tx_hash: string;
      chain_id: string;
      created_at: string;
      age_minutes: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      txHash: r.tx_hash,
      chainId: r.chain_id,
      createdAt: r.created_at,
      ageMinutes: Math.round(r.age_minutes),
    }));
  } finally {
    db.close();
  }
}
