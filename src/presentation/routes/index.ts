// src/presentation/routes/index.ts
import { Router } from "express";

import { authRoutes } from "./authRoutes";
import { teamRoutes } from "./teamRoutes";
import { personRoutes } from "./personRoutes";
import { playerRoutes } from "./playerRoutes";
import { playerAwardRoutes } from "./playerAwardRoutes";
import { combineScoreRoutes } from "./combineScoreRoutes";
import { prospectRoutes } from "./prospectRoutes";
import { scheduleRoutes } from "./scheduleRoutes";
import { teamNeedRoutes } from "./TeamNeedRoutes";
import { bootstrapTeamNeedsAnalysisModule } from '@/modules/teamNeedsAnalysis';
import { playerTeamRoutes } from "./PlayerTeamRoutes";
import { postSeasonResultRoutes } from "./PostSeasonResultRoutes";
import { gameRoutes } from "./gameRoutes";
import { jobRoutes } from "./jobRoutes";
import { scoreboardJobs } from "./jobs.scoreboard";
import { scoreboardScheduleRoutes } from "./job.scoreboard.schedule";
import standingsRoutes from "./standingsRoutes";
import { teamStandingsRoutes } from "./teamStandingsRoutes";
import { buildScoreboardRouter } from "../controllers/ScoreboardController";
import draftPickRoutes from "./draftPickRoute";
import { playoffsRoutes } from "./playoffsRoutes"; // 👈 NEW
import { prisma } from "@/infrastructure/database/prisma";
import { DraftOrderJobController } from "@/modules/draftOrder/presentation/controllers/DraftOrderJobController";
import { buildAccessRoutes } from "@/modules/accessControl/presentation/routes/access.routes";
import { queueJobService, runJobService } from "@/infrastructure/dependencies";
import { buildDraftOrderModule } from "@/modules/draftOrder/moduleFactory";
import { buildDraftOrderJobRoutes } from "@/modules/draftOrder/presentation/routes/draftOrderJobRoutes";
import { buildDraftSimulatorModule } from "@/modules/draftSimulator/moduleFactory";
import DraftAnalysisModule = require("@/modules/draft-analysis/draft-analysis.module");
import { buildAdminAccessRouter } from "@/modules/accessControl/presentation/routes/adminAccess.routes";
import { requireAuth } from "@/modules/auth/presentation/http/middleware/requireAuth.middleware";
import { createRequirePermission } from "@/modules/accessControl/presentation/security/requirePermission";
import { PrismaAccessPermissionRepository } from "@/modules/accessControl/infrastructure/persistence/prisma/PrismaAccessPermissionRepository";
import { bootstrapRosterSyncModule } from "@/modules/rosterSync";
import { RosterContainer } from '@/modules/roster/infrastructure/container/roster.container'
import rosterPlayerRoutes from '@/modules/roster/presentation/routes/rosterPlayer.routes'

const router = Router();
const draftOrderJobController = new DraftOrderJobController(queueJobService, runJobService)

const draftAnalysisModule = DraftAnalysisModule.initialize(prisma);
const permissionRepo = new PrismaAccessPermissionRepository(prisma);
const requirePermission = createRequirePermission({ permissionRepo });

const rosterSyncRouter = bootstrapRosterSyncModule(prisma);
router.use('/roster-sync', rosterSyncRouter);

// 3. Initialize containers FIRST
RosterContainer.initialize(prisma, process.env.ESPN_API_BASE_URL)

// 4. Register routes 
router.use('/roster-players', rosterPlayerRoutes)

/* ─────────────────────────────
 * AUTH
 * ───────────────────────────── */
router.use("/auth", authRoutes);
//router.use("/access", buildAccessRoutes(prisma));
router.use("/access", requireAuth, buildAccessRoutes(prisma));
/* ─────────────────────────────
 * CORE DOMAIN ROUTES
 * ───────────────────────────── */
router.use("/teams", teamRoutes);
router.use("/persons", personRoutes);
router.use("/players", playerRoutes);
router.use("/player-awards", playerAwardRoutes);
router.use("/player-teams", playerTeamRoutes);
router.use('/roster-players', rosterSyncRouter);
router.use("/prospects", prospectRoutes);
router.use("/postseason-results", postSeasonResultRoutes);
router.use("/schedules", scheduleRoutes);

router.use("/games", gameRoutes);
router.use("/draftpicks", draftPickRoutes);

/* ─────────────────────────────
 * STANDINGS / SCOREBOARD / PLAYOFFS
 * ───────────────────────────── */
router.use("/standings", standingsRoutes);
router.use("/teamStandings", standingsRoutes);
//router.use("/team-needs", teamNeedRoutes);
router.use("/team-needs", bootstrapTeamNeedsAnalysisModule);
router.use("/scoreboard", buildScoreboardRouter());
router.use('/draftSimulator', buildDraftSimulatorModule(prisma))
router.use('/draft-order', buildDraftOrderModule(prisma))
router.use("/playoffs", playoffsRoutes); // 👈 NEW

// Protect ALL Draft Analysis endpoints
router.use(
  "/draft-analysis",
  requireAuth,
  requirePermission("DRAFT_ANALYSIS", "VIEW"),
  draftAnalysisModule.getRouter()
);


/* Protect ALL Admin Access endpoints (even if the router already guards internally)
router.use(
  "/admin/access",
  requireAuth,
  requirePermission("ADMIN_USERS", "VIEW"),
  buildAdminAccessRouter(prisma)
);
*/
router.use("/admin/access", buildAdminAccessRouter(prisma));
/* ─────────────────────────────
 * JOBS
 * ───────────────────────────── */
router.use("/jobs", jobRoutes);
router.use("/jobs/kickoff/scoreboard", scoreboardJobs);
router.use("/jobs/scoreboard/schedule", scoreboardScheduleRoutes);

router.use('/draft-order/jobs', buildDraftOrderJobRoutes(draftOrderJobController))
/* ─────────────────────────────
 * ROUTER-LOCAL HEALTH & INFO
 * (these live under /api/*)
 * ───────────────────────────── */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "DraftProAnalytics API v1 is running",
    timestamp: new Date().toISOString(),
  });
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DraftProAnalytics API v1",
  });
});

export { router as apiRoutes };
