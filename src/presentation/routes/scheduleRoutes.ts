// src/presentation/routes/scheduleRoutes.ts
import { Router } from 'express';
import { ScheduleController } from '../controllers/ScheduleController';
import { ScheduleService } from '@/application/schedule/services/ScheduleService';
import { PrismaScheduleRepository } from '@/infrastructure/repositories/PrismaScheduleRepository';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  CreateScheduleDtoSchema,
  UpdateScheduleDtoSchema,
  ScheduleFiltersDtoSchema,
  PaginationDtoSchema,
} from '@/application/schedule/dto/ScheduleDto';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';

import { EspnScheduleClient } from '../../infrastructure/espn/EspnScheduleClient';
import { GetWeekScheduleService } from '@/application/schedule/services/GetWeekScheduleService';
import { PrismaTeamMetaRepository } from '@/infrastructure/repositories/PrismaTeamMetaRepository';
import type { PlayoffConference, PlayoffRound } from '@/utils/schedule/scheduleTypes';

import { GeneratePlayoffBracketService } from '@/application/playoffs/services/GeneratePlayoffBracketService';
import { PrismaGameRepository } from '@/infrastructure/repositories/PrismaGameRepository';
import { PrismaStandingsRepository } from '@/infrastructure/repositories/PrismaStandingsRepository';
import { PlayoffSeedingService } from '@/application/standings/services/PlayoffSeedingService';
import { bracketToEvents } from '@/application/playoffs/mappers/PlayoffBracketToEventsMapper';
import { UtilityMapper } from '@/application/playoffs/mappers/UtilityMapper';
import { TeamHelper } from '@/utils/TeamHelper';
import { $Enums } from '@prisma/client';
import { playoffGameDetailsRouter } from './playoffGameDetailsRoute';

const playoffRoundOrder: PlayoffRound[] = [
  'WILDCARD',
  'DIVISIONAL',
  'CONFERENCE',
  'SUPERBOWL',
];

const playoffRoundToWeek: Record<PlayoffRound, number> = {
  WILDCARD: 1,
  DIVISIONAL: 2,
  CONFERENCE: 3,
  SUPERBOWL: 5,
};

console.log('📦 LOADED scheduleRoutes from:', __filename);

const weekScheduleService = new GetWeekScheduleService(new EspnScheduleClient());
const teamMetaRepo = new PrismaTeamMetaRepository(prisma);
const statusMapper = new UtilityMapper();
const teamHelper = new TeamHelper(prisma);

const roundFromWeek = (w: number): PlayoffRound | null => {
  if (w === 1) return 'WILDCARD';
  if (w === 2) return 'DIVISIONAL';
  if (w === 3) return 'CONFERENCE';
  if (w === 4) return 'SUPERBOWL';
  return null;
};

const router = Router();

// Dependency injection
const scheduleRepository = new PrismaScheduleRepository();
const scheduleService = new ScheduleService(scheduleRepository);
const scheduleController = new ScheduleController(scheduleService);

const gameRepo = new PrismaGameRepository(prisma);
const standingsRepo = new PrismaStandingsRepository(prisma);
const seedingService = new PlayoffSeedingService();
const bracketService = new GeneratePlayoffBracketService(gameRepo, standingsRepo, seedingService);

// ---------------------
// Zod schemas (coerce + passthrough + defaults)
// ---------------------
const IdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .passthrough();

const TeamSeasonParamsSchema = z
  .object({
    teamId: z.coerce.number().int().positive(),
    // keep seasonYear numeric; change to string+regex if your controller expects a string
    seasonYear: z.coerce.number().int().min(1900).max(3000),
  })
  .passthrough();

const OpponentParamsSchema = z
  .object({
    oppTeamId: z.coerce.number().int().positive(),
  })
  .passthrough();

// Bodies often arrive as strings; coerce and validate
const GameResultSchema = z
  .object({
    teamScore: z.coerce.number().int().min(0, 'Team score cannot be negative'),
    oppTeamScore: z.coerce.number().int().min(0, 'Opponent team score cannot be negative'),
    wonLostFlag: z.string().length(1, 'Won/Lost flag must be a single character'),
  })
  .passthrough();

// Keep your existing list filters, but allow extra keys
const QuerySchema = ScheduleFiltersDtoSchema.merge(PaginationDtoSchema).passthrough();

// Optional per-route query with sensible defaults
// (Use when you want defaults like regular season)
const ScheduleQuerySchema = z
  .object({
    week: z.coerce.number().int().min(0).max(25).optional(),
    seasonType: z.coerce.number().int().min(1).max(3).default(2), // 2 = regular season
  })
  .passthrough();

async function detectCurrentPlayoffWeek(
  seasonYear: number
): Promise<{ week: number; round: PlayoffRound | null }> {
  const games = await prisma.game.findMany({
    where: {
      seasonYear: String(seasonYear),
      seasonType: 3, // playoffs
    },
    select: {
      playoffRound: true, // Prisma enum
      gameStatus: true, // Prisma enum
      gameDate: true,
    },
  });

  if (games.length === 0) {
    // No playoff data at all
    return { week: 1, round: null };
  }

  const now = new Date();

  // ---- Map Prisma playoffRound -> domain PlayoffRound ----
  const prismaToDomainRound = (r: $Enums.Game_playoffRound | null): PlayoffRound | null => {
    if (r === null) return null;
    if (r === 'WILDCARD') return 'WILDCARD'; // naming mismatch
    // DIVISIONAL, CONFERENCE, SUPERBOWL match domain type directly
    return r as PlayoffRound;
  };

  type DomainGame = {
    playoffRound: PlayoffRound;
    gameStatus: $Enums.Game_gameStatus;
    gameDate: Date | null;
  };

  const domainGames: DomainGame[] = games
    .map((g) => {
      const round = prismaToDomainRound(g.playoffRound);
      if (!round) return null;
      return {
        playoffRound: round,
        gameStatus: g.gameStatus,
        gameDate: g.gameDate,
      } as DomainGame;
    })
    .filter((g): g is DomainGame => g !== null);

  if (domainGames.length === 0) {
    return { week: 1, round: null };
  }

  // ---- Active game detector works on DOMAIN games ----
  const isActiveGame = (g: DomainGame): boolean => {
    return (
      g.gameStatus === 'in_progress' ||
      g.gameStatus === 'final' ||
      (g.gameDate != null && g.gameDate <= now)
    );
  };

  // 1) Highest round that has "active" games
  for (let i = playoffRoundOrder.length - 1; i >= 0; i--) {
    const round = playoffRoundOrder[i];
    if (domainGames.some((g) => g.playoffRound === round && isActiveGame(g))) {
      return { week: playoffRoundToWeek[round], round };
    }
  }

  // 2) If nothing "active", earliest round that has any games
  for (let i = 0; i < playoffRoundOrder.length; i++) {
    const round = playoffRoundOrder[i];
    if (domainGames.some((g) => g.playoffRound === round)) {
      return { week: playoffRoundToWeek[round], round };
    }
  }

  // Fallback
  return { week: 1, round: null };
}

// ---------------------
// Routes
// ---------------------
router.use('/games', playoffGameDetailsRouter);

router.post('/', validateBody(CreateScheduleDtoSchema), scheduleController.createSchedule);

router.get('/', validateQuery(QuerySchema), scheduleController.getAllSchedules);

router.get('/upcomingSchedule', async (req, res) => {
  try {
    const year = Number(req.query.seasonYear);
    const seasonType = Number(req.query.seasonType);
    const rawWeek = req.query.week;
    const week = rawWeek === undefined ? null : Number(rawWeek);

    console.log('➡️ Incoming params:', { year, seasonType, week, raw: req.query });

    const isAllPreseasonRequest = seasonType === 1 && week === null;
    const isValidPreseasonWeek = seasonType === 1 && week !== null && Number.isInteger(week) && week >= 0 && week <= 3;
    const isValidStandardWeek = seasonType !== 1 && week !== null && Number.isInteger(week) && week >= 1;

    if (!year || !seasonType || (!isAllPreseasonRequest && !isValidPreseasonWeek && !isValidStandardWeek)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid year, seasonType, or week',
      });
    }

    const result = await weekScheduleService.execute(year, seasonType, week);
    return res.json(result);
  } catch (err: any) {
    console.error('❌ /upcomingSchedule failed:', err);
    return res.status(500).json({ success: false, message: err.message, error: err.message });
  }
});

router.get('/upcomingGames', scheduleController.getUpcomingGames);

router.get('/playoffBracket', async (req, res) => {
  try {
    const seasonYearRaw = req.query.seasonYear ?? req.query.year;
    const seasonYear = Number(seasonYearRaw);

    if (!seasonYear) {
      return res.status(400).json({ success: false, message: 'Missing seasonYear' });
    }

    // 1) Ask DB which round/week we *should* be in
    const { week: detectedWeek, round: detectedRound } = await detectCurrentPlayoffWeek(seasonYear);

    console.log('🏈 [Playoff Bracket] Generating bracket for season:', {
      seasonYear,
      detectedWeek,
      detectedRound,
    });

    // 2) Build bracket from seeding / standings (ActualBracketBuilder)
    const bracket = await bracketService.getBracketForSeason(seasonYear, 'actual');

    const events = bracketToEvents(bracket); // domain events with playoffRound

    // 3) Which rounds does the bracket *actually have*?
    const roundsPresent = Array.from(
      new Set(events.map((e) => e.playoffRound).filter((r): r is PlayoffRound => Boolean(r)))
    );

    // 4) Decide the active round:
    //    - Prefer detectedRound if it's present in events
    //    - Else fall back to highest round that exists in events
    let activeRound: PlayoffRound | null = null;

    if (detectedRound && roundsPresent.includes(detectedRound)) {
      activeRound = detectedRound;
    } else if (roundsPresent.length > 0) {
      activeRound = roundsPresent.sort(
        (a, b) => playoffRoundOrder.indexOf(a) - playoffRoundOrder.indexOf(b)
      )[roundsPresent.length - 1];
    }

    // 5) Compute week we will report to the client
    const activeWeek = activeRound != null ? playoffRoundToWeek[activeRound] : (detectedWeek ?? 1);

    // 6) Return ALL events (frontend needs full bracket, not just current round)
    console.log(
      '📊 [Playoff Bracket] Returning',
      events.length,
      'events, activeRound:',
      activeRound,
      'activeWeek:',
      activeWeek
    );

    return res.json({
      success: true,
      seasonYear,
      seasonType: 3,
      weeks: [1, 2, 3, 4],
      currentWeek: activeWeek,
      currentRound: activeRound,
      events, // ✅ Return ALL rounds so frontend can build complete bracket
    });
  } catch (err: unknown) {
    console.error('❌ [Playoff Bracket] Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message: msg, error: msg });
  }
});

router.get('/completed', scheduleController.getCompletedGames);

// Add this route to scheduleRoutes.ts

router.post('/importPlayoffGames', async (req, res) => {
  try {
    const seasonYear = Number(req.body.seasonYear || req.query.seasonYear);

    if (!seasonYear) {
      return res.status(400).json({
        success: false,
        message: 'Missing seasonYear',
      });
    }

    console.log(`📥 [Import] Starting playoff games import for ${seasonYear}`);

    const seasonType = 3; // Playoffs
    const weeks = [1, 2, 3, 4];
    let imported = 0;
    let skipped = 0;

    for (const week of weeks) {
      const playoffRound = statusMapper.mapPlayoffRoundToPrisma(roundFromWeek(week));
      if (!playoffRound) continue;

      console.log(`📥 [Import] Fetching playoff week ${week} (${playoffRound})...`);

      const result = await weekScheduleService.execute(seasonYear, seasonType, week);

      for (const event of result.events || []) {
        try {
          // Check if game already exists
          const existing = await prisma.game.findFirst({
            where: {
              espnEventId: String(event.id),
            },
          });

          const gameDate =
            event.date != null ? new Date(event.date) : new Date(`${seasonYear}-01-01T00:00:00Z`);

          // ✅ Get team IDs first (needed for both create and update)
          const homeTeamId = await teamHelper.getHomeTeamId(event);
          const awayTeamId = await teamHelper.getAwayTeamId(event);

          if (homeTeamId == null || awayTeamId == null) {
            console.warn(
              `⚠️ [Import] Missing team metadata for game ${event.id} (home=${event.homeTeamId}, away=${event.awayTeamId})`
            );
            skipped++;
            continue;
          }

          // ✅ Look up team conferences to determine playoff conference
          const homeTeam = await prisma.team.findUnique({
            where: { id: homeTeamId },
            select: { conference: true }
          });
          
          const awayTeam = await prisma.team.findUnique({
            where: { id: awayTeamId },
            select: { conference: true }
          });

          // ✅ Determine playoff conference - if both teams same conference, use it
          let playoffConference: string | null = null;
          if (homeTeam?.conference && awayTeam?.conference && homeTeam.conference === awayTeam.conference) {
            playoffConference = homeTeam.conference;
          }

          console.log(`🔍 [Import] Game ${event.id}: ${playoffRound} ${playoffConference || 'CROSS-CONF'} - ${homeTeamId} vs ${awayTeamId}`);

          // ✅ Cast to Prisma enum type
          const playoffConferencePrisma = playoffConference as $Enums.Game_playoffConference | null;

          if (existing) {
            // Update existing game
            await prisma.game.update({
              where: { id: existing.id },
              data: {
                homeScore: event.homeScore,
                awayScore: event.awayScore,
                gameStatus: statusMapper.mapGameStatusToPrisma(event.status),
                playoffRound,
                playoffConference: playoffConferencePrisma, // ✅ Use cast value
              },
            });
            console.log(`♻️ [Import] Updated: ${event.awayTeamName} @ ${event.homeTeamName} (${playoffConference || 'SB'})`);
          } else {
            // Create new game
            await prisma.game.create({
              data: {
                espnEventId: String(event.id),
                seasonYear: String(seasonYear),
                seasonType,
                gameWeek: week,
                gameDate: gameDate,
                homeTeamId,
                awayTeamId,
                homeScore: event.homeScore,
                awayScore: event.awayScore,
                gameStatus: statusMapper.mapGameStatusToPrisma(event.status),
                playoffRound,
                playoffConference: playoffConferencePrisma, // ✅ Use cast value
              },
            });
            imported++;
            console.log(`✅ [Import] Created: ${event.awayTeamName} @ ${event.homeTeamName} (${playoffConference || 'SB'})`);
          }
        } catch (err) {
          console.error(`❌ [Import] Error importing game ${event.id}:`, err);
          skipped++;
        }
      }
    }

    console.log(`✅ [Import] Complete! Imported: ${imported}, Skipped: ${skipped}`);

    return res.json({
      success: true,
      message: `Imported ${imported} playoff games, skipped ${skipped}`,
      imported,
      skipped,
    });
  } catch (err: unknown) {
    console.error('❌ [Import] Failed:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: msg,
      error: msg,
    });
  }
});

// Add this simpler GET route for testing
router.get('/importPlayoffGames', async (req, res) => {
  // Just call the same logic but allow GET method
  req.body = {}; // POST handler checks req.body.seasonYear
  const seasonYear = Number(req.query.seasonYear || 2025);
  
  try {
    console.log(`📥 [Import] Starting playoff games import for ${seasonYear}`);

    const seasonType = 3;
    const weeks = [1, 2, 3, 4];
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const week of weeks) {
      const playoffRound = statusMapper.mapPlayoffRoundToPrisma(roundFromWeek(week));
      if (!playoffRound) continue;

      console.log(`📥 [Import] Fetching playoff week ${week} (${playoffRound})...`);

      const result = await weekScheduleService.execute(seasonYear, seasonType, week);
      
      console.log(`📥 [Import] Week ${week} returned ${result.events?.length || 0} events`);

      for (const event of result.events || []) {
        try {
          const existing = await prisma.game.findFirst({
            where: { espnEventId: String(event.id) }
          });

          const gameDate = event.date != null ? new Date(event.date) : new Date(`${seasonYear}-01-01T00:00:00Z`);

          if (existing) {
            await prisma.game.update({
              where: { id: existing.id },
              data: {
                homeScore: event.homeScore,
                awayScore: event.awayScore,
                gameStatus: statusMapper.mapGameStatusToPrisma(event.status),
                playoffRound,
                playoffConference: event.playoffConference || null,
              }
            });
            console.log(`♻️ [Import] Updated: ${event.awayTeamName} @ ${event.homeTeamName}`);
          } else {
            const homeTeamId = await teamHelper.getHomeTeamId(event);
            const awayTeamId = await teamHelper.getAwayTeamId(event);

            console.log(`🔍 [Import] Game ${event.id}: homeTeamId=${homeTeamId}, awayTeamId=${awayTeamId}, espnHome=${event.homeTeamId}, espnAway=${event.awayTeamId}`);

            if (homeTeamId == null || awayTeamId == null) {
              const msg = `Missing team metadata for game ${event.id} (home=${event.homeTeamId}, away=${event.awayTeamId})`;
              console.warn(`⚠️ [Import] ${msg}`);
              errors.push(msg);
              skipped++;
              continue;
            }

            await prisma.game.create({
              data: {
                espnEventId: String(event.id),
                seasonYear: String(seasonYear),
                seasonType,
                gameWeek: week,
                gameDate,
                homeTeamId,
                awayTeamId,
                homeScore: event.homeScore,
                awayScore: event.awayScore,
                gameStatus: statusMapper.mapGameStatusToPrisma(event.status),
                playoffRound,
                playoffConference: event.playoffConference || null,
              }
            });
            imported++;
            console.log(`✅ [Import] Created: ${event.awayTeamName} @ ${event.homeTeamName}`);
          }
        } catch (err) {
          const msg = `Error importing game ${event.id}: ${err}`;
          console.error(`❌ [Import] ${msg}`);
          errors.push(msg);
          skipped++;
        }
      }
    }

    console.log(`✅ [Import] Complete! Imported: ${imported}, Skipped: ${skipped}`);

    return res.json({
      success: true,
      message: `Imported ${imported} playoff games, skipped ${skipped}`,
      imported,
      skipped,
      errors
    });
  } catch (err: unknown) {
    console.error('❌ [Import] Failed:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message: msg });
  }
});

router.get(
  '/team/:teamId/season/:seasonYear',
  validateParams(TeamSeasonParamsSchema),
  validateQuery(ScheduleQuerySchema), // ← adds seasonType default=2, optional week
  scheduleController.getTeamSchedule
);

router.get(
  '/opponent/:oppTeamId',
  validateParams(OpponentParamsSchema),
  scheduleController.getOpponentHistory
);

router.get('/:id', validateParams(IdParamsSchema), scheduleController.getScheduleById);

router.put(
  '/:id',
  validateParams(IdParamsSchema),
  validateBody(UpdateScheduleDtoSchema),
  scheduleController.updateSchedule
);

router.patch(
  '/:id/result',
  validateParams(IdParamsSchema),
  validateBody(GameResultSchema),
  scheduleController.updateGameResult
);

router.delete('/:id', validateParams(IdParamsSchema), scheduleController.deleteSchedule);

export { router as scheduleRoutes };
