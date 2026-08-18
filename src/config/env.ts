// src/config/env.ts
//process.env.NODE_ENV ??= 'development';
import dotenv from 'dotenv';
import dotenvFlow from 'dotenv-flow';
import * as env from 'env-var';

/**
 * Normalize env selection *before* loading files.
 */
(function normalizeNodeEnv() {
  const appEnv = process.env.APP_ENV?.trim();
  const nodeEnv = process.env.NODE_ENV?.trim();
  const resolved = (appEnv ?? nodeEnv ?? 'development')
    .replace(/^prod$/, 'production')
    .replace(/^stage$/, 'staging');
  process.env.APP_ENV = resolved;
  process.env.NODE_ENV = resolved;
})();

/**
 * Load .env.* with dotenv-flow
 */
dotenvFlow.config({ silent: true });

// Generated at build/dev startup from package.json version + current Git SHA.
// Load after dotenv-flow so the generated release value wins over any stale
// SENTRY_RELEASE value that may exist in another .env file.
dotenv.config({
  path: '.env.release',
  override: true,
});

/* ===================== helpers ===================== */
const toList = (s?: string | null) =>
  (s ?? '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

const dropTrailingSlash = (s: string) =>
  s.endsWith('/') ? s.slice(0, -1) : s;

const ensurePath = (s: string) =>
  s.startsWith('/') ? s : `/${s}`;

/* ===================== config ===================== */
export type AppEnv = 'development' | 'staging' | 'production';

export const CONFIG = {
  // App identity
  appName:  env.get('APP_NAME').default('SportsMgmt API').asString(),
  appEnv:   env.get('APP_ENV').default(process.env.NODE_ENV!).asEnum<AppEnv>(['development', 'staging', 'production']),
  nodeEnv:  env.get('NODE_ENV').default('development').asString(),

  // Server
  port:     env.get('PORT').default('5000').asPortNumber(),
  logLevel: env.get('LOG_LEVEL').default('info').asString(),

  /** 
   * API base mount path (what your Express attaches to).
   * Keep this in ONE place so Nginx, client, and server agree.
   *
   * Examples:
   *   API_BASE_PATH=/api
   *   API_BASE_PATH=/api/v1.0
   */
  apiBasePath: dropTrailingSlash(
    ensurePath(env.get('API_BASE_PATH').default('/api').asString())
  ),

  /**
   * Public base URL (optional). If you need to build absolute links (emails, logs).
   * Example: PUBLIC_BASE_URL=https://draftproanalytics.local
   */
  publicBaseUrl: dropTrailingSlash(
    env.get('PUBLIC_BASE_URL').default('').asString()
  ) || undefined,

  /**
   * CORS: allow multiple origins (comma-separated)
   * Example:
   *   CORS_ALLOWED_ORIGINS=http://localhost:5173,https://draftproanalytics.local
   * Back-compat: if not set, falls back to CORS_ORIGIN (single).
   */
  corsAllowed: (() => {
    const list = toList(env.get('CORS_ALLOWED_ORIGINS').asString());
    if (list.length) return list;
    return [env.get('CORS_ORIGIN').default('http://localhost:5173').asString()];
  })(),

  // Database
  dbUrl:     env.get('DATABASE_URL').required().asString(),
  prismaOut: env.get('PRISMA_CLIENT_OUTPUT').asString(), // optional

  // Feature flags / Ops
  enableCronJobs: env.get('ENABLE_CRON_JOBS').default('false').asBool(),
  sseLogs:        env.get('ENABLE_SSE_LOGS').default('false').asBool(),

  // Versioning
  apiVersion: env.get('API_VERSION').default('v1.0').asString(), // (renamed from apiVersion for consistency)
  version:    env.get('VERSION').default('b0.1').asString(),

  // Domain defaults
  nflSeason:  env.get('NFL_SEASON').default('2025').asIntPositive(),
  teamKey:    env.get('TEAM').default('kc').asString().toLowerCase(),

  // ESPN / external services — keep only the base here; build routes in services
  espnBaseUrl: dropTrailingSlash(
    env.get('ESPN_BASE_URL').default('https://sports.core.api.espn.com').asString()
  ),

  // Scheduling
  scoreboardCron: env.get('SCOREBOARD_CRON_INTERVAL').default('*/5 * * * *').asString(),
} as const;

export const isDev  = CONFIG.nodeEnv === 'development';
export const isProd = CONFIG.nodeEnv === 'production';

/* ===================== helpers you can export ===================== */
/**
 * Build an absolute URL to your API when needed. If PUBLIC_BASE_URL is set, use it.
 * Otherwise infer from an incoming request (preferred at callsite) or fall back to localhost.
 */
export function buildApiUrl(path = '/', opts?: { req?: { protocol?: string; headers?: Record<string,string> } }) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base =
    CONFIG.publicBaseUrl ??
    (opts?.req?.headers?.['x-forwarded-proto'] && opts?.req?.headers?.host
      ? `${opts.req.headers['x-forwarded-proto']}://${opts.req.headers.host}`
      : `http://localhost:${CONFIG.port}`);
  return `${base}${CONFIG.apiBasePath}${p}`;
}