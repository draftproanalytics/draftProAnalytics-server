import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { PrismaPostDraftDataProvider } from '../infrastructure/PrismaPostDraftDataProvider';
import { PrismaPostDraftReportRepository } from '../infrastructure/PrismaPostDraftReportRepository';
import { PostDraftScoringService } from '../application/PostDraftScoringService';
import { PreviewTeamPostDraftReportUseCase } from '../application/PreviewTeamPostDraftReportUseCase';
import { FinalizeTeamPostDraftReportUseCase } from '../application/FinalizeTeamPostDraftReportUseCase';

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw Object.assign(new Error(`${label} must be a positive integer.`), { statusCode: 400 });
  return parsed;
}

export function createPostDraftReportRouter(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new PrismaPostDraftReportRepository(prisma);
  const preview = new PreviewTeamPostDraftReportUseCase(new PrismaPostDraftDataProvider(prisma), repository, new PostDraftScoringService());
  const finalize = new FinalizeTeamPostDraftReportUseCase(preview, repository);
  const params = (req: Request): [number, number] => [positiveInteger(req.params.teamId, 'teamId'), positiveInteger(req.params.draftYear, 'draftYear')];

  router.post('/teams/:teamId/years/:draftYear/preview', async (req: Request, res: Response, next: NextFunction) => {
    try { const [teamId, year] = params(req); const result = await preview.execute(teamId, year); res.json({ ok: true, data: result.report }); } catch (error) { next(error); }
  });
  router.post('/teams/:teamId/years/:draftYear/finalize', async (req: Request, res: Response, next: NextFunction) => {
    try { const [teamId, year] = params(req); res.status(201).json({ ok: true, data: await finalize.execute(teamId, year) }); } catch (error) { next(error); }
  });
  router.get('/teams/:teamId/years/:draftYear/history', async (req: Request, res: Response, next: NextFunction) => {
    try { const [teamId, year] = params(req); res.json({ ok: true, data: await repository.history(teamId, year) }); } catch (error) { next(error); }
  });
  router.get(
  '/teams/:teamId/years/:draftYear',
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const [teamId, year] = params(req);
      const saved = await repository.getLatest(teamId, year);

      if (saved) {
        res.json({ ok: true, data: saved });
        return;
      }

      const result = await preview.execute(teamId, year);
      res.json({ ok: true, data: result.report });
    } catch (error) {
      next(error);
    }
  }
);
  return router;
}
