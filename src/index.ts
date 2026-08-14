// DraftProAnalytics™ | Copyright © 2025-2026 Darryl Thompson. All rights reserved.
// See LICENSE and TRADEMARKS.md.
import path from 'node:path';
import dotenv from 'dotenv';
import { createDpaJobsNflImportRouter } from './modules/jobs/presentation/routes/dpaJobsNflImport.routes';

const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({
  path: envPath,
  debug: true,
});

console.log('[env] cwd =', process.cwd());
console.log('[env] loaded from =', envPath);
console.log('[env] JWT_ACCESS_SECRET exists =', Boolean(process.env.JWT_ACCESS_SECRET));

if (result.error) {
  console.error('[env] dotenv error:', result.error);
}
// (sports_mgmt_app_server/) src/index.ts
import 'dotenv/config';
import "module-alias/register"; // ✅ must be first for @/... paths to resolve
import "./config/env"; // ✅ loads dotenv-flow next
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import os from "node:os";

import { CONFIG, isDev } from "./config/env";
import { apiRoutes } from "./presentation/routes";
import { errorHandler } from "./presentation/middleware/errorHandler";
import { initScoreboardCron } from "./jobs/scoreboardCron";
import { useCorsFromEnv } from "./presentation/middleware/cors";
import fs from 'node:fs';
import { prisma } from "@/infrastructure/database/prisma";
import { createB4MeAnalysisRouter } from './modules/b4meAnalysis/presentation/routes/b4meAnalysis.routes';
import { createPostDraftReportRouter } from './modules/postDraftReport/presentation/postDraftReport.routes';
import { createPostDraftMetricsRouter } from './modules/postDraftMetrics/presentation/postDraftMetrics.routes';
import { createProspectIdentityRouter } from './modules/prospectIdentity';
//import path from 'node:path';
//import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV ?? 'development';
/*
const envPath = path.resolve(
  process.cwd(),
  nodeEnv === 'development' ? '.env.development' : '.env'
); */

dotenv.config({
  path: fs.existsSync(envPath) ? envPath : path.resolve(process.cwd(), '.env'),
});


const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---- core config
const PORT = CONFIG.port;
const API_BASE = `/api`; // e.g., /api

// ---- middleware
app.use(helmet());
app.use(useCorsFromEnv());

app.use(
  morgan(isDev ? "dev" : "combined", {
    skip: () => process.env.NODE_ENV === "test",
  })
);

// ---- health
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: CONFIG.appName,
    env: CONFIG.appEnv,
    nodeEnv: CONFIG.nodeEnv,
    version: CONFIG.version,
    apiVersion: CONFIG.apiVersion,
    time: new Date().toISOString(),
    pid: process.pid,
    host: os.hostname(),
  });
});

// ---- routes
app.use('/api/jobs',createDpaJobsNflImportRouter(prisma), );
app.use('/api/b4me', createB4MeAnalysisRouter(prisma));
app.use('/api/post-draft-reports', createPostDraftReportRouter(prisma));
app.use('/api/post-draft-metrics', createPostDraftMetricsRouter(prisma));
app.use('/api/prospect-identity', createProspectIdentityRouter(prisma));
app.use(API_BASE, apiRoutes);
// ---- list all registered routes (debugging only)
console.log("Registered routes:");
;(app._router?.stack || [])
  .filter((r: unknown) => {
    const rr = r as { route?: unknown };
    return Boolean(rr.route);
  })
  .forEach((r: unknown) => {
    const rr = r as { route: { methods: Record<string, boolean>; path: string } };
    const methods = Object.keys(rr.route.methods)
      .map((m) => m.toUpperCase())
      .join(",");
    console.log(`${methods.padEnd(10)} ${rr.route.path}`);
  });

// ---- 404
app.use("*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: `Route ${req.originalUrl} not found`,
    hint: `Try ${API_BASE}/* endpoints or /health`,
  });
});

// ---- errors (keep last)
app.use(errorHandler);

// ---- start
const server = app.listen(PORT, () => {
  console.log(`🚀 ${CONFIG.appName} v${CONFIG.version} up on :${PORT}`);
  console.log(`📱 APP_ENV=${CONFIG.appEnv} NODE_ENV=${CONFIG.nodeEnv}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Base: http://localhost:${PORT}${API_BASE}`);
  console.log(`🌐 CORS Allowed: ${CONFIG.corsAllowed.join(", ")}`);
});

// ---- graceful shutdown
function shutdown(sig: string) {
  console.log(`\n${sig} received. Shutting down...`);
  server.close((err) => {
    if (err) {
      console.error("Error closing server", err);
      process.exit(1);
    }
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---- cron (gated)
(async () => {
  if (!CONFIG.enableCronJobs) {
    console.log("⏸️  Cron jobs disabled (ENABLE_CRON_JOBS=false)");
    return;
  }
  try {
    await initScoreboardCron();
    console.log(`🕒 Cron scheduled: ${CONFIG.scoreboardCron}`);
  } catch (err) {
    console.error("cron init failed", err);
  }
})();

export default app;
