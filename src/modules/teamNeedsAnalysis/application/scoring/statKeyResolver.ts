type StatRow = {
  name?: string;
  displayName?: string;
  abbreviation?: string;
  value?: number;
  rank?: number; // if ESPN provides it
};

function toNumber(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesAll(hay: string, needles: string[]): boolean {
  return needles.every((n) => hay.includes(n));
}

/**
 * Extract a flat list of stat rows from ESPN core team stats payload.
 * ESPN shapes drift; this tries multiple common patterns.
 */
export function extractStatRows(statsRaw: unknown): StatRow[] {
  if (!statsRaw || typeof statsRaw !== "object") return [];

  const root = statsRaw as Record<string, unknown>;

  // common: { splits: { categories: [ { stats: [...] } ] } }
  const splits = root.splits && typeof root.splits === "object" ? (root.splits as Record<string, unknown>) : undefined;
  const categories = splits && Array.isArray(splits.categories) ? splits.categories : undefined;

  if (categories) {
    const rows: StatRow[] = [];
    for (const c of categories) {
      if (!c || typeof c !== "object") continue;
      const cat = c as Record<string, unknown>;
      const stats = Array.isArray(cat.stats) ? cat.stats : [];
      for (const s of stats) {
        if (!s || typeof s !== "object") continue;
        const o = s as Record<string, unknown>;
        rows.push({
          name: typeof o.name === "string" ? o.name : undefined,
          displayName: typeof o.displayName === "string" ? o.displayName : undefined,
          abbreviation: typeof o.abbreviation === "string" ? o.abbreviation : undefined,
          value: toNumber(o.value),
          rank: toNumber(o.rank),
        });
      }
    }
    return rows;
  }

  // fallback: { stats: [...] }
  const statsArr = Array.isArray(root.stats) ? root.stats : undefined;
  if (statsArr) {
    const rows: StatRow[] = [];
    for (const s of statsArr) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      rows.push({
        name: typeof o.name === "string" ? o.name : undefined,
        displayName: typeof o.displayName === "string" ? o.displayName : undefined,
        abbreviation: typeof o.abbreviation === "string" ? o.abbreviation : undefined,
        value: toNumber(o.value),
        rank: toNumber(o.rank),
      });
    }
    return rows;
  }

  return [];
}

export type ResolvedStat = {
  key: string;
  value?: number;
  rank?: number;
  basis: string;
};

/**
 * Find the "best match" stat by keyword tokens against name/displayName/abbrev.
 * Returns at most one result.
 */
export function resolveStat(rows: StatRow[], key: string, tokens: string[]): ResolvedStat | null {
  const wanted = tokens.map(norm).filter(Boolean);
  let best: { row: StatRow; score: number; basis: string } | null = null;

  for (const r of rows) {
    const fields = [r.name, r.displayName, r.abbreviation].filter((x): x is string => typeof x === "string");
    if (fields.length === 0) continue;

    const joined = norm(fields.join(" "));
    if (!includesAll(joined, wanted)) continue;

    // score: prefer displayName matches and longer token coverage
    const score = joined.length + wanted.length * 20;
    const basis = fields.join(" | ");
    if (!best || score > best.score) best = { row: r, score, basis };
  }

  if (!best) return null;

  return {
    key,
    value: best.row.value,
    rank: best.row.rank,
    basis: best.basis,
  };
}
