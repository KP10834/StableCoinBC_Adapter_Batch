import Database from "better-sqlite3";
import path from "path";

export interface ChainRow {
  chain_id: string;
  name: string;
  rpc_url: string;
  native: string;
  decimals: number;
}

export interface TokenRow {
  chain_id: string;
  symbol: string;
  contract_address: string;
  decimals: number;
}

export function loadChainsAndTokens(dbPath: string): { chains: ChainRow[]; tokensByChain: Map<string, TokenRow[]> } {
  const resolved = path.resolve(dbPath);
  const db = new Database(resolved, { readonly: true });

  try {
    const chains = db
      .prepare("SELECT chain_id, name, rpc_url, native, decimals FROM chain WHERE active = 1")
      .all() as ChainRow[];

    const tokens = db
      .prepare("SELECT chain_id, symbol, contract_address, decimals FROM token WHERE active = 1")
      .all() as TokenRow[];

    const tokensByChain = new Map<string, TokenRow[]>();
    for (const t of tokens) {
      const list = tokensByChain.get(t.chain_id) ?? [];
      list.push(t);
      tokensByChain.set(t.chain_id, list);
    }

    return { chains, tokensByChain };
  } finally {
    db.close();
  }
}
