import { PrismaClient } from '@prisma/client'
import { prisma } from "@/infrastructure/database/prisma";

/* ───────────────────────────────────────────────────────────────
 * Auth / email infrastructure
 * ─────────────────────────────────────────────────────────────── */
import { Argon2PasswordHasher } from './security/Argon2PasswordHasher'
import { NodeCryptoSecureTokenGenerator } from './security/NodeCryptoSecureTokenGenerator'
import { createMailService } from './mail/MailServiceFactory'
import { prisma as prismaClient } from "@/infrastructure/database/prisma";

import { RegisterUseCase } from '@/application/auth/register/RegisterUseCase'
import { VerifyEmailUseCase } from '@/application/auth/verify-email/VerifyEmailUseCase'
import { LoginUseCase } from '@/application/auth/login/LoginUseCase'
import { RefreshTokenUseCase } from '@/application/auth/refresh/RefreshTokenUseCase'
import { LogoutUseCase } from '@/application/auth/logout/LogoutUseCase'
import { ForgotPasswordUseCase } from '@/application/auth/forgot-password/ForgotPasswordUseCase'
import { ResetPasswordUseCase } from '@/application/auth/reset-password/ResetPasswordUseCase'

import type { AuthTokenService } from '@/domain/auth/services/AuthTokenService';
import { LoginWithGoogleUseCase } from '@/application/auth/login/LoginWithGoogleUseCase';

/* ───────────────────────────────────────────────────────────────
 * Repositories – Domain + Job
 * ─────────────────────────────────────────────────────────────── */
import { ProspectRepository } from './repositories/ProspectRepository'
import { TeamNeedRepository } from './repositories/TeamNeedRepository'
import { PrismaTeamRepository } from './repositories/PrismaTeamRepository'
import { PrismaGameRepository } from './repositories/PrismaGameRepository'

import { PrismaJobRepository } from './repositories/PrismaJobRepository'
import { PrismaJobLogRepository } from './repositories/PrismaJobLogRepository'
import { PrismaPersonRepository } from './repositories/PrismaPersonRepository'

/* ───────────────────────────────────────────────────────────────
 * Infrastructure (Clients, Queue, Scheduler, Logger)
 * ─────────────────────────────────────────────────────────────── */
import { EspnScoreboardClient } from './scoreboardClient'
import { InProcessJobRunner, registerDefaultHandlers } from './queue/InProcessJobRunner'
import { JobLogEmitter } from './queue/JobLogEmitter'
import { CronScheduler } from './schedule/CronScheduler'
import { PrismaJobLogger } from './repositories/PrismaJobLogger'

/* ───────────────────────────────────────────────────────────────
 * Application Services – Core Domain
 * ─────────────────────────────────────────────────────────────── */
import { DraftService } from '@/application/draft/service/DraftService'
import { BackfillSeasonService } from '@/services/backfillSeason'
import { SyncTeamsService } from '@/services/syncTeams'
import { SyncWeekEventsService } from '@/application/schedule/services/SyncWeekEventsService'
import { ScoreboardSyncService } from '@/application/scoreboard/services/ScoreboardSyncService'
import { ImportScoresByDateService } from '@/application/scoreboard/services/ImportScoresByDateService'

/* ───────────────────────────────────────────────────────────────
 * Job management services
 * ─────────────────────────────────────────────────────────────── */
import { QueueJobService } from '@/application/jobs/services/QueueJobService'
import { RunJobService } from '@/application/jobs/services/RunJobService'
import { CancelJobService } from '@/application/jobs/services/CancelJobService'
import { ListJobsService } from '@/application/jobs/services/ListJobService'
import { GetJobDetailService } from '@/application/jobs/services/GetJobDetailService'
import GetJobLogsService from '@/application/jobs/services/GetJobLogService'
import { ScheduleJobService } from '@/application/jobs/services/ScheduleJobService'

/* ───────────────────────────────────────────────────────────────
 * DraftOrder job handler registration
 * ─────────────────────────────────────────────────────────────── */
import { registerAppJobHandlers } from '@/infrastructure/queue/registerAppJobHandlers'
import { buildDraftOrderComposition } from '@/modules/draftOrder/moduleComposition'
import { JwtTokenService } from '@/modules/auth/infrastructure/security/JwtTokenService';
import { LoginWithAppleUseCase } from '@/application/auth/login/loginWithAppleUseCase';
import { AppleAuthServiceImpl } from './auth/AppleAuthServiceImpl';
import { GoogleAuthServiceImpl } from './auth/GoogleAuthServiceImpl';
import { PrismaPersonIdentityRepository } from './repositories/PrismaPersonIdentityRepository';
import { JwtAuthTokenService } from './jwt/JwtAuthTokenService';
import { BcryptPasswordHasher } from './auth/BcryptPasswordHasher';

/* ───────────────────────────────────────────────────────────────
 * 1) Core infrastructure
 * ─────────────────────────────────────────────────────────────── */

const espnClient = new EspnScoreboardClient()
const jobEmitter = new JobLogEmitter()

const inProcessRunner = new InProcessJobRunner()
registerDefaultHandlers(inProcessRunner)

const jobLogger = new PrismaJobLogger(prismaClient)

/* ───────────────────────────────────────────────────────────────
 * 2) Repositories
 * ─────────────────────────────────────────────────────────────── */
const prospectRepository = new ProspectRepository(prismaClient)
const teamNeedRepository = new TeamNeedRepository(prismaClient)
const teamRepository = new PrismaTeamRepository()
const gameRepository = new PrismaGameRepository(prismaClient)

const jobRepository = new PrismaJobRepository(prismaClient)
const jobLogRepository = new PrismaJobLogRepository(prismaClient)

/* ───────────────────────────────────────────────────────────────
 * 3) Domain / application services
 * ─────────────────────────────────────────────────────────────── */
const draftService = new DraftService(prospectRepository, teamNeedRepository)
const backfillSeasonService = new BackfillSeasonService(espnClient, gameRepository, jobLogger)
const syncTeamsService = new SyncTeamsService(jobLogger)

const syncWeekEventsService = new SyncWeekEventsService(gameRepository, teamRepository)

const scoreboardSyncService = new ScoreboardSyncService()
const getScoresByDateService = new ImportScoresByDateService(scoreboardSyncService)

/* ───────────────────────────────────────────────────────────────
 * 4) Register DI-provided job handlers on the ONE runner
 * ─────────────────────────────────────────────────────────────── */
const draftOrder = buildDraftOrderComposition(prismaClient)
registerAppJobHandlers(inProcessRunner, {
  syncWeekEventsSvc: syncWeekEventsService,
  computeCurrentDraftOrderUc: draftOrder.computeCurrentUc,
  computeProjectedDraftOrderUc: draftOrder.computeProjectedUc,
})

/* ───────────────────────────────────────────────────────────────
 * 5) Job services
 * ─────────────────────────────────────────────────────────────── */
const queueJobService = new QueueJobService(jobRepository)
const runJobService = new RunJobService(jobRepository, jobLogRepository, inProcessRunner, jobEmitter)
const cancelJobService = new CancelJobService(jobRepository)
const listJobsService = new ListJobsService(jobRepository)
const getJobDetailService = new GetJobDetailService(jobRepository)
const getJobLogsService = new GetJobLogsService(jobLogRepository)

const cronScheduler = new CronScheduler(queueJobService, runJobService)
const scheduleJobService = new ScheduleJobService(cronScheduler)

/* ───────────────────────────────────────────────────────────────
 * 6) Auth
 * ─────────────────────────────────────────────────────────────── */
export const personRepo = new PrismaPersonRepository()
export const passwordHasher = new BcryptPasswordHasher()
export const tokenGen = new NodeCryptoSecureTokenGenerator()
export const jwtTokens = new JwtTokenService()
export const mailer = createMailService()

const registerUseCase = new RegisterUseCase(personRepo, passwordHasher, tokenGen, mailer)
const resetPasswordUseCase = new ResetPasswordUseCase(personRepo, passwordHasher)
const verifyEmailUseCase = new VerifyEmailUseCase(personRepo)
const loginUseCase = new LoginUseCase(personRepo, passwordHasher, jwtTokens)
const refreshTokenUseCase = new RefreshTokenUseCase(personRepo, passwordHasher, jwtTokens)
const logoutUseCase = new LogoutUseCase(personRepo, passwordHasher)
const forgotPasswordUseCase = new ForgotPasswordUseCase(personRepo, tokenGen, mailer)

// after you create prisma, personRepo, passwordHasher, tokenService, etc.
const personIdentityRepo = new PrismaPersonIdentityRepository(prisma);
const googleAuthService = new GoogleAuthServiceImpl(process.env.GOOGLE_CLIENT_ID!);
const appleAuthService = new AppleAuthServiceImpl();
const authTokenService = new JwtAuthTokenService();

const loginWithGoogleUseCase = new LoginWithGoogleUseCase(
  personRepo,
  personIdentityRepo,
  googleAuthService,
  authTokenService,
  passwordHasher,
);

const loginWithAppleUseCase = new LoginWithAppleUseCase(
  personRepo,
  personIdentityRepo,
  appleAuthService,
  authTokenService,
  passwordHasher,
);

/* ───────────────────────────────────────────────────────────────
 * 7) Export
 * ─────────────────────────────────────────────────────────────── */
export {
  prismaClient as prisma,

  prospectRepository,
  teamNeedRepository,
  teamRepository,
  gameRepository,
  jobRepository,
  jobLogRepository,

  espnClient,
  jobLogger,
  jobEmitter,
  inProcessRunner,
  cronScheduler,

  draftService,
  backfillSeasonService,
  syncTeamsService,
  syncWeekEventsService,
  scoreboardSyncService,
  getScoresByDateService,

  queueJobService,
  runJobService,
  cancelJobService,
  listJobsService,
  getJobDetailService,
  getJobLogsService,
  scheduleJobService,

  loginUseCase,
  logoutUseCase,
  loginWithAppleUseCase,
  loginWithGoogleUseCase,
  registerUseCase,
  resetPasswordUseCase,
  verifyEmailUseCase,
  refreshTokenUseCase,
  forgotPasswordUseCase,

}
