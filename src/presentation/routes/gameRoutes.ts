// src/presentation/routes/gameRoutes.ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from "@/infrastructure/database/prisma";

import { GameController } from '../controllers/GameController';
import { GameService } from '@/application/game/services/GameService';
import { PrismaGameRepository } from '@/infrastructure/repositories/PrismaGameRepository';
import { PrismaTeamRepository } from '@/infrastructure/repositories/PrismaTeamRepository';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  CreateGameDtoSchema,
  UpdateGameDtoSchema,
  UpdateScoreDtoSchema,
} from '@/application/game/dto/GameDto';

const router = Router();

/* -----------------------------------------------------------------------------
 * Dependencies
 * -------------------------------------------------------------------------- */

const gameRepository = new PrismaGameRepository(prisma);
const teamRepository = new PrismaTeamRepository();
const gameService = new GameService(gameRepository, teamRepository);
const gameController = new GameController(gameService);

/* -----------------------------------------------------------------------------
 * Zod schemas (HTTP edge: params + query only)
 * -------------------------------------------------------------------------- */

// Path param: /:id
const IdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Path params: /team/:teamId/season/:seasonYear
const TeamSeasonParamsSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  seasonYear: z.string().regex(/^\d{4}$/, 'Season year must be a 4-digit year'),
});

// Query for list endpoints (accept flat or nested ?params[...])
const GameQueryInner = z
  .object({
    teamId: z.coerce.number().int().positive().optional(),
    homeTeamId: z.coerce.number().int().positive().optional(),
    awayTeamId: z.coerce.number().int().positive().optional(),
    gameWeek: z.coerce.number().int().min(0).max(25).optional(),
    seasonYear: z.string().regex(/^\d{4}$/, 'seasonYear must be a 4-digit year').optional(),
    // UI sometimes sends `year`/`week`; keep them to pass through (the controller normalizes)
    year: z.string().regex(/^\d{4}$/).optional(),
    week: z.coerce.number().int().min(0).max(25).optional(),
    // allow 0/1 for seasonType flag
    seasonType: z.coerce.number().int().min(1).max(3).optional(),
    gameStatus: z.string().optional(),
    gameCity: z.string().optional(),
    gameCountry: z.string().optional(),
    dateFrom: z.union([z.string(), z.date()]).optional(),
    dateTo: z.union([z.string(), z.date()]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .passthrough();

// Query for list endpoints (accept aliases; controller will normalize)
const GameQuerySchema = z.union([
  GameQueryInner,
  z.object({ params: GameQueryInner }).passthrough(),
]);



/* -----------------------------------------------------------------------------
 * Routes
 * -------------------------------------------------------------------------- */

router.post('/', validateBody(CreateGameDtoSchema), gameController.createGame);

router.get('/', validateQuery(GameQuerySchema), gameController.getAllGames);

router.get('/upcoming', gameController.getUpcomingGames);
router.get('/completed', gameController.getCompletedGames);

router.get(
  '/team/:teamId/seasons',
  validateParams(z.object({ teamId: z.coerce.number().int().positive() })),
  gameController.getTeamSeasonYears
);

router.get(
  '/team/:teamId/statistics',
  validateParams(z.object({ teamId: z.coerce.number().int().positive() })),
  validateQuery(z.object({ seasonYear: z.string().regex(/^\d{4}$/).optional() }).passthrough()),
  gameController.getTeamStatistics
);

router.get(
  '/team/:teamId/season/:seasonYear',
  validateParams(TeamSeasonParamsSchema),
  validateQuery(
    z
      .object({
        seasonType: z.coerce.number().int().min(1).max(3).optional(),
        week: z.coerce.number().int().min(0).max(25).optional(),
      })
      .passthrough()
  ),
  gameController.getTeamGames
);

router.get('/:id', validateParams(IdParamsSchema), gameController.getGameById);

router.get('/seasonType', gameController.getPreseasonGames);
router.get('/regular-season', gameController.getRegularSeasonGames);
router.get('/games/primetime', gameController.primetime)

router.put('/:id', validateParams(IdParamsSchema), validateBody(UpdateGameDtoSchema), gameController.updateGame);

router.patch(
  '/:id/score',
  validateParams(IdParamsSchema),
  validateBody(UpdateScoreDtoSchema),
  gameController.updateGameScore
);

router.delete('/:id', validateParams(IdParamsSchema), gameController.deleteGame);

export { router as gameRoutes };


///Utilities
