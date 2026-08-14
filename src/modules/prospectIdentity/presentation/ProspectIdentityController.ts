import type { Request, Response, NextFunction } from 'express';
import type { ProspectIdentityService } from '../application/ProspectIdentityService';

const positiveInt = (value: unknown, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
};

export class ProspectIdentityController {
  public constructor(private readonly service: ProspectIdentityService) {}

  public listDuplicates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ rows: await this.service.listDuplicates(typeof req.query.status === 'string' ? req.query.status : undefined) }); } catch (e) { next(e); }
  };
  public listIdentityReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ rows: await this.service.listIdentityReviews(typeof req.query.status === 'string' ? req.query.status : undefined) }); } catch (e) { next(e); }
  };
  public listMergeAudits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ rows: await this.service.listMergeAudits(Number(req.query.limit ?? 100)) }); } catch (e) { next(e); }
  };
  public preflight = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const draftYear = positiveInt(req.query.draftYear, 'draftYear');
      const position = typeof req.query.position === 'string' ? req.query.position.trim().toUpperCase() : '';
      if (position.length === 0) throw new Error('position is required.');
      res.json(await this.service.getPreflightStatus(draftYear, position));
    } catch (e) { next(e); }
  };
  public detectDuplicates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(202).json(await this.service.detectDuplicates()); } catch (e) { next(e); }
  };
  public previewMerge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json(await this.service.previewMerge(positiveInt(req.params.survivorId, 'survivorId'), positiveInt(req.params.duplicateId, 'duplicateId'))); } catch (e) { next(e); }
  };
  public merge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { reason?: unknown };
      const result = await this.service.merge(positiveInt(req.params.survivorId, 'survivorId'), positiveInt(req.params.duplicateId, 'duplicateId'), req.user?.personId ?? null, typeof body.reason === 'string' ? body.reason : '');
      res.json(result);
    } catch (e) { next(e); }
  };
  public resolveDuplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { status?: unknown; resolution?: unknown; notes?: unknown };
      if (typeof body.status !== 'string' || typeof body.resolution !== 'string') throw new Error('status and resolution are required.');
      await this.service.resolveDuplicate(positiveInt(req.params.reviewId, 'reviewId'), body.status, req.user?.personId ?? null, body.resolution, typeof body.notes === 'string' ? body.notes : null);
      res.status(204).end();
    } catch (e) { next(e); }
  };
  public resolveIdentity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { status?: unknown; resolution?: unknown; notes?: unknown };
      if (typeof body.status !== 'string' || typeof body.resolution !== 'string') throw new Error('status and resolution are required.');
      await this.service.resolveIdentity(positiveInt(req.params.reviewId, 'reviewId'), body.status, req.user?.personId ?? null, body.resolution, typeof body.notes === 'string' ? body.notes : null);
      res.status(204).end();
    } catch (e) { next(e); }
  };
  public deleteProspect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { reason?: unknown };
      res.json(await this.service.deleteProspect(positiveInt(req.params.prospectId, 'prospectId'), req.user?.personId ?? null, typeof body.reason === 'string' ? body.reason : ''));
    } catch (e) { next(e); }
  };
}
