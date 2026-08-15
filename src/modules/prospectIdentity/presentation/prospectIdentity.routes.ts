import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/modules/auth/presentation/http/middleware/requireAuth.middleware';
import { requireRbacEditOrAdminRole4 } from '@/modules/accessControl/presentation/security/requireRbacEditOrAdminRole4';
import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';
import { PrismaProspectIdentityRepository } from '../infrastructure/PrismaProspectIdentityRepository';
import { ProspectIdentityService } from '../application/ProspectIdentityService';
import { ProspectIdentityController } from './ProspectIdentityController';
import { PrismaJobQueueRepository } from '@/modules/jobs/infrastructure/persistence/PrismaJobQueueRepository';
import { EnqueueDetectProspectDuplicatesJobUseCase } from '../application/EnqueueDetectProspectDuplicatesJobUseCase';

export const createProspectIdentityRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  const repository = new PrismaProspectIdentityRepository(prisma);
  const controller = new ProspectIdentityController(new ProspectIdentityService(repository));
  const enqueueDuplicateScan = new EnqueueDetectProspectDuplicatesJobUseCase(new PrismaJobQueueRepository(prisma));
  router.use(requireAuth);
  router.get('/preflight', requirePermission(prisma, 'B4ME_ANALYSIS', 'RUN'), controller.preflight);
  router.use(requireRbacEditOrAdminRole4);
  router.get('/duplicates', controller.listDuplicates);
  router.post('/duplicates/detect', controller.detectDuplicates);
  router.post('/duplicates/detect-job', async (req, res, next) => {
    try { res.status(202).json(await enqueueDuplicateScan.execute(req.user?.personId ?? null)); } catch (error) { next(error); }
  });
  router.patch('/duplicates/:reviewId', controller.resolveDuplicate);
  router.get('/merge-preview/:survivorId/:duplicateId', controller.previewMerge);
  router.post('/merge/:survivorId/:duplicateId', controller.merge);
  router.delete('/prospects/:prospectId', controller.deleteProspect);
  router.post('/prospects/:prospectId/delete', controller.deleteProspect);
  router.get('/identity-reviews', controller.listIdentityReviews);
  router.patch('/identity-reviews/:reviewId', controller.resolveIdentity);
  router.get('/merge-audits', controller.listMergeAudits);
  return router;
};
