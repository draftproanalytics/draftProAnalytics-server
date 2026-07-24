import express, { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { UpsertWrMetricCommand, WrMetricActor } from '../domain/WrAdvancedMetrics.types';
import { PrismaWrMetricRepository } from '../infrastructure/PrismaWrMetricRepository';
import { PrismaWrAdvancedMetricsProvider } from '../infrastructure/PrismaWrAdvancedMetricsProvider';

function actor(req: Request): WrMetricActor {
  return { personId: req.user?.personId ?? null, userName: req.user?.userName ?? null };
}
function bigintId(value: string): bigint {
  if (!/^\d+$/.test(value) || value === '0') throw Object.assign(new Error('id must be a positive integer.'), { statusCode: 400 });
  return BigInt(value);
}
function csvFromRequest(req: Request): string {
  if (typeof req.body === 'string') return req.body;
  const body = req.body as { csv?: unknown };
  if (typeof body.csv === 'string') return body.csv;
  throw Object.assign(new Error('Provide CSV as text/csv request body or as JSON { "csv": "..." }.'), { statusCode: 400 });
}

export function createPostDraftMetricsRouter(prisma: PrismaClient): Router {
  const router = Router(); const repository = new PrismaWrMetricRepository(prisma); const provider = new PrismaWrAdvancedMetricsProvider(prisma);
  router.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));

  router.post('/wr/manual', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const saved = await repository.upsert(req.body as UpsertWrMetricCommand, actor(req)); res.status(201).json({ ok: true, data: saved }); } catch (error) { next(error); }
  });
  router.post('/wr/import/preview', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ ok: true, data: await repository.previewCsv(csvFromRequest(req)) }); } catch (error) { next(error); }
  });
  router.post('/wr/import', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skipInvalidRows = req.query.skipInvalidRows === 'true'; const allowVerifiedOverwrite = req.query.allowVerifiedOverwrite === 'true';
      res.status(201).json({ ok: true, data: await repository.importCsv(csvFromRequest(req), actor(req), { skipInvalidRows, allowVerifiedOverwrite }) });
    } catch (error) { next(error); }
  });
  router.patch('/wr/:id/verify', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const body = req.body as { notes?: unknown }; const notes = typeof body.notes === 'string' ? body.notes : null; res.json({ ok: true, data: await repository.setVerification(bigintId(req.params.id), true, actor(req), notes) }); } catch (error) { next(error); }
  });
  router.patch('/wr/:id/unverify', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const body = req.body as { notes?: unknown }; const notes = typeof body.notes === 'string' ? body.notes : null; res.json({ ok: true, data: await repository.setVerification(bigintId(req.params.id), false, actor(req), notes) }); } catch (error) { next(error); }
  });
  router.get('/wr/prospects/:prospectId/years/:draftYear/resolved', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prospectId = Number(req.params.prospectId); const draftYear = Number(req.params.draftYear);
      if (!Number.isInteger(prospectId) || prospectId <= 0 || !Number.isInteger(draftYear)) throw Object.assign(new Error('prospectId and draftYear must be valid integers.'), { statusCode: 400 });
      res.json({ ok: true, data: await provider.getMetrics(prospectId, draftYear) });
    } catch (error) { next(error); }
  });
  return router;
}
