
// src/presentation/routes/playerAwardRoutes.ts

import { Router } from 'express';
import { PlayerAwardController } from '../controllers/PlayerAwardController';
import { PlayerAwardService } from '@/application/playerAward/services/PlayerAwardService';
import { PrismaPlayerAwardRepository } from '@/infrastructure/repositories/PrismaPlayerAwardRepository';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  CreatePlayerAwardDtoSchema,
  UpdatePlayerAwardDtoSchema,
  PlayerAwardFiltersDtoSchema,
  PaginationDtoSchema,
} from '@/application/playerAward/dto/PlayerAwardDto';
import { z } from 'zod';

const router = Router();

// Dependency injection
const playerAwardRepository = new PrismaPlayerAwardRepository();
const playerAwardService = new PlayerAwardService(playerAwardRepository);
const playerAwardController = new PlayerAwardController(playerAwardService);

// Parameter validation schemas
const IdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});

const PlayerIdParamsSchema = z.object({
  playerId: z.string().regex(/^\d+$/, 'Player ID must be a number').transform(Number),
});

const AwardNameParamsSchema = z.object({
  awardName: z.string().min(1, 'Award name is required'),
});

const YearParamsSchema = z.object({
  year: z.string().regex(/^\d+$/, 'Year must be a number').transform(Number),
});

const QuerySchema = PlayerAwardFiltersDtoSchema.merge(PaginationDtoSchema);

// Routes
router.post(
  '/',
  validateBody(CreatePlayerAwardDtoSchema),
  playerAwardController.createPlayerAward
);

router.get(
  '/',
  validateQuery(QuerySchema),
  playerAwardController.getAllPlayerAwards
);

// Specific routes must be registered before the generic /:id route.
router.get(
  '/player/:playerId/count',
  validateParams(PlayerIdParamsSchema),
  playerAwardController.getPlayerAwardCount
);

router.get(
  '/player/:playerId',
  validateParams(PlayerIdParamsSchema),
  playerAwardController.getPlayerAwardsByPlayerId
);

router.get(
  '/award/:awardName',
  validateParams(AwardNameParamsSchema),
  playerAwardController.getPlayerAwardsByAwardName
);

router.get(
  '/year/:year',
  validateParams(YearParamsSchema),
  playerAwardController.getPlayerAwardsByYear
);

router.get(
  '/:id',
  validateParams(IdParamsSchema),
  playerAwardController.getPlayerAwardById
);

router.put(
  '/:id',
  validateParams(IdParamsSchema),
  validateBody(UpdatePlayerAwardDtoSchema),
  playerAwardController.updatePlayerAward
);

router.delete(
  '/:id',
  validateParams(IdParamsSchema),
  playerAwardController.deletePlayerAward
);

export { router as playerAwardRoutes };