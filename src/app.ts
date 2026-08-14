// (sports_mgmt_app_server/) src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { registerAccessControlModule } from "@/modules/accessControl/infrastructure/di/accessControl.container";

import { apiRoutes } from './presentation/routes';
import { errorHandler } from './presentation/middleware/errorHandler';
import { prisma } from "@/infrastructure/database/prisma";
import { createB4MeAnalysisRouter } from './modules/b4meAnalysis/presentation/routes/b4meAnalysis.routes';
import { createPostDraftReportRouter } from './modules/postDraftReport/presentation/postDraftReport.routes';
import { createPostDraftMetricsRouter } from './modules/postDraftMetrics/presentation/postDraftMetrics.routes';
import { createDraftDayScorecardModule } from './modules/draftDayScorecard/draftDayScorecard.module';
import { buildDpaApiRouter } from './presentation/routes/buildDpaApiRouter';
import { createDraftDayScorecardRouter } from './modules/draftDayScorecard/presentation/routes/draftDayScorecard.routes';
import { createDpaJobsNflImportRouter } from '@/modules/jobs/presentation/routes/dpaJobsNflImport.routes';


const app = express();

const db = prisma;
registerAccessControlModule();


// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes

app.use('/api/b4me', createB4MeAnalysisRouter(prisma));
app.use('/api/post-draft-reports', createPostDraftReportRouter(prisma));
app.use('/api/post-draft-metrics', createPostDraftMetricsRouter(prisma));
app.use('/api/jobs', createDpaJobsNflImportRouter(prisma));
app.use('/api', buildDpaApiRouter(prisma));

app.use('/api/draft-day-scorecard',createDraftDayScorecardRouter(prisma));
app.use(`/api`, apiRoutes);
// 404 handler — MUST come before errorHandler
app.use('*', (req, res, next) => {
  const err: any = new Error('Route not found');
  err.statusCode = 404;
  next(err);
});

// Error handling — MUST be last
app.use(errorHandler);

// Debug logging (unchanged)
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log('📍 Route:', middleware.route.path);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        console.log('📍 Router Route:', handler.route.path);
      }
    });
  }
});

console.log('🔍 All routes registered. Testing endpoint...');
console.log('🧪 Test: curl http://localhost:5000/api/draftpicks/relations/team/1/year/2025');

module.exports = app;
export { app };
