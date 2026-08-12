// src/presentation/routes/prospectRoutes.ts
import { Router } from 'express';
import { ProspectController } from '../controllers/ProspectController';
import { ProspectService } from '@/application/prospect/services/ProspectService';
import { ProspectProfileQueryService } from '@/application/prospect/services/ProspectProfileQueryService';
import { PrismaProspectRepository } from '@/infrastructure/repositories/PrismaProspectRepository';
import { PrismaCombineScoreRepository } from '@/infrastructure/repositories/PrismaCombineScoreRepository';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  CreateProspectDtoSchema,
  UpdateProspectDtoSchema,
  ProspectFiltersDtoSchema,
  PaginationDtoSchema,
  UpdatePersonalInfoDtoSchema,
  UpdateCombineScoresDtoSchema,
  MarkAsDraftedDtoSchema,
  CombineScoreFilterDtoSchema,
} from '@/application/prospect/dto/ProspectDto';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';

const router = Router();

// Dependency injection
const prospectRepository = new PrismaProspectRepository();
const combineScoreRepository = new PrismaCombineScoreRepository();
const prospectService = new ProspectService(prospectRepository, combineScoreRepository);
const prospectProfileQueryService = new ProspectProfileQueryService();
const prospectController = new ProspectController(prospectService, prospectProfileQueryService);

// Parameter validation schemas
const IdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});

const PositionParamsSchema = z.object({
  position: z.string().min(1, 'Position is required').max(10, 'Position cannot exceed 10 characters'),
});

const CollegeParamsSchema = z.object({
  college: z.string().min(1, 'College name is required'),
});

const TeamIdParamsSchema = z.object({
  teamId: z.string().regex(/^\d+$/, 'Team ID must be a number').transform(Number),
});

// Query validation schemas
const QuerySchema = ProspectFiltersDtoSchema.merge(PaginationDtoSchema);
const CombineQuerySchema = CombineScoreFilterDtoSchema.merge(PaginationDtoSchema);
const PaginationQuerySchema = PaginationDtoSchema;

const TopAthletesQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional().default(10),
});

const DraftedQuerySchema = PaginationDtoSchema.extend({
  draftYear: z.coerce.number().min(1990).max(2030).optional(),
});

// Basic CRUD routes
router.post(
  '/',
  requirePermission(prisma, 'SCOUTING', 'CREATE'),
  validateBody(CreateProspectDtoSchema),
  prospectController.createProspect
);

router.get(
  '/',
  validateQuery(QuerySchema),
  prospectController.getAllProspects
);

router.get(
  '/:id/profile',
  validateParams(IdParamsSchema),
  prospectController.getProspectProfile
);

router.get(
  '/:id',
  validateParams(IdParamsSchema),
  prospectController.getProspectById
);

router.put(
  '/:id',
  requirePermission(prisma, 'SCOUTING', 'EDIT'),
  validateParams(IdParamsSchema),
  validateBody(UpdateProspectDtoSchema),
  prospectController.updateProspect
);

router.delete(
  '/:id',
  requirePermission(prisma, 'SCOUTING', 'DELETE'),
  validateParams(IdParamsSchema),
  prospectController.deleteProspect
);

// Specialized query routes
router.get(
  '/position/:position',
  validateParams(PositionParamsSchema),
  validateQuery(PaginationQuerySchema),
  prospectController.getProspectsByPosition
);

router.get(
  '/college/:college',
  validateParams(CollegeParamsSchema),
  validateQuery(PaginationQuerySchema),
  prospectController.getProspectsByCollege
);

router.get(
  '/status/undrafted',
  validateQuery(PaginationQuerySchema),
  prospectController.getUndraftedProspects
);

router.get(
  '/status/drafted',
  validateQuery(DraftedQuerySchema),
  prospectController.getDraftedProspects
);

router.get(
  '/team/:teamId',
  validateParams(TeamIdParamsSchema),
  validateQuery(PaginationQuerySchema),
  prospectController.getProspectsByTeam
);

// Analytics routes
router.get(
  '/analytics/stats',
  prospectController.getProspectStats
);

router.get(
  '/analytics/top-athletes',
  validateQuery(TopAthletesQuerySchema),
  prospectController.getTopAthletes
);

router.get(
  '/analytics/duplicates',
  prospectController.findDuplicateProspects
);

router.get(
  '/search/combine-scores',
  validateQuery(CombineQuerySchema),
  prospectController.getProspectsByCombineScore
);

// Specialized update routes
router.patch(
  '/:id/personal-info',
  requirePermission(prisma, 'SCOUTING', 'EDIT'),
  validateParams(IdParamsSchema),
  validateBody(UpdatePersonalInfoDtoSchema),
  prospectController.updatePersonalInfo
);

router.patch(
  '/:id/combine-scores',
  requirePermission(prisma, 'SCOUTING', 'EDIT'),
  validateParams(IdParamsSchema),
  validateBody(UpdateCombineScoresDtoSchema),
  prospectController.updateCombineScores
);

router.patch(
  '/:id/draft-status/drafted',
  requirePermission(prisma, 'SCOUTING', 'EDIT'),
  validateParams(IdParamsSchema),
  validateBody(MarkAsDraftedDtoSchema),
  prospectController.markAsDrafted
);

router.patch(
  '/:id/draft-status/undrafted',
  requirePermission(prisma, 'SCOUTING', 'EDIT'),
  validateParams(IdParamsSchema),
  prospectController.markAsUndrafted
);

export { router as prospectRoutes };