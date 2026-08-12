import { Router } from 'express';
import { z } from 'zod';
import { CombineScoreController } from '../controllers/CombineScoreController';
import { CombineScoreService } from '@/application/combineScore/services/CombineScoreService';
import { PrismaCombineScoreRepository } from '@/infrastructure/repositories/PrismaCombineScoreRepository';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';
import { prisma } from '@/infrastructure/database/prisma';
import {
  CreateCombineScoreDtoSchema,
  UpdateCombineScoreDtoSchema,
  CombineScoreFiltersDtoSchema,
  CombineScoreWorkspaceFiltersDtoSchema,
  PaginationDtoSchema,
  TopPerformersDtoSchema,
  AthleticScoreRangeDtoSchema,
} from '@/application/combineScore/dto/CombineScoreDto';

const router = Router();
const combineScoreRepository = new PrismaCombineScoreRepository();
const combineScoreService = new CombineScoreService(combineScoreRepository);
const combineScoreController = new CombineScoreController(combineScoreService);

const IdParamsSchema = z.object({ id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number) });
const PlayerIdParamsSchema = z.object({ playerId: z.string().regex(/^\d+$/, 'Player ID must be a number').transform(Number) });
const ProspectIdParamsSchema = z.object({ prospectId: z.string().regex(/^\d+$/, 'Prospect ID must be a number').transform(Number) });
const MetricParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
  metric: z.enum(['fortyTime', 'tenYardSplit', 'twentyYardShuttle', 'threeCone', 'verticalLeap', 'broadJump']),
});
const QuerySchema = CombineScoreFiltersDtoSchema.merge(PaginationDtoSchema);
const WorkspaceQuerySchema = CombineScoreWorkspaceFiltersDtoSchema.merge(PaginationDtoSchema);
const PlayerIdsBodySchema = z.object({ playerIds: z.array(z.number().positive()).min(1, 'At least one player ID is required') });
const MetricValueBodySchema = z.object({ value: z.number().positive('Value must be positive') });

router.post('/', requirePermission(prisma, 'SCOUTING', 'CREATE'), validateBody(CreateCombineScoreDtoSchema), combineScoreController.createCombineScore);
router.get('/', validateQuery(QuerySchema), combineScoreController.getAllCombineScores);

// Aggregate scouting workspace is Prospect-based so prospects with no measurements are visible.
router.get('/workspace', validateQuery(WorkspaceQuerySchema), combineScoreController.getWorkspace);

// Named routes must appear before /:id.
router.get('/player/:playerId', validateParams(PlayerIdParamsSchema), combineScoreController.getCombineScoreByPlayerId);
router.get('/prospect/:prospectId', validateParams(ProspectIdParamsSchema), combineScoreController.getCombineScoreByProspectId);
router.post('/players/batch', validateBody(PlayerIdsBodySchema), combineScoreController.getCombineScoresByPlayerIds);
router.get('/top-performers', validateQuery(TopPerformersDtoSchema), combineScoreController.getTopPerformers);
router.get('/athletic-score-range', validateQuery(AthleticScoreRangeDtoSchema), combineScoreController.getCombineScoresByAthleticScore);
router.get('/rankings/athletic', combineScoreController.getAthleticRankings);

router.get('/:id', validateParams(IdParamsSchema), combineScoreController.getCombineScoreById);
router.put('/:id', requirePermission(prisma, 'SCOUTING', 'EDIT'), validateParams(IdParamsSchema), validateBody(UpdateCombineScoreDtoSchema), combineScoreController.updateCombineScore);
router.delete('/:id', requirePermission(prisma, 'SCOUTING', 'DELETE'), validateParams(IdParamsSchema), combineScoreController.deleteCombineScore);
router.patch('/:id/metrics/:metric', requirePermission(prisma, 'SCOUTING', 'EDIT'), validateParams(MetricParamsSchema), validateBody(MetricValueBodySchema), combineScoreController.updateSpecificMetric);

export { router as combineScoreRoutes };
