import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { INflversePlayerProductionRepository } from '../../domain/repositories/INflversePlayerProductionRepository';
const serialize = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
export const createNflversePlayerProductionRouter = (prisma: PrismaClient, repository: INflversePlayerProductionRepository): Router => {
  const router = Router();
  router.get('/review', async (req, res) => {
    const seasonYear = Number(req.query.seasonYear); const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await prisma.nflversePlayerProductionStaging.findMany({ where: { seasonYear: Number.isInteger(seasonYear) ? seasonYear : undefined, matchStatus: status }, orderBy: [{ matchStatus: 'asc' }, { playerName: 'asc' }], take: 1000 });
    res.json(serialize(rows));
  });
  router.get('/review/:id/candidates', async (req, res) => {
    const row = await prisma.nflversePlayerProductionStaging.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!row) { res.status(404).json({ message: 'Staging record not found.' }); return; }
    const team = row.teamAbbreviation ? await prisma.team.findFirst({ where: { abbreviation: row.teamAbbreviation } }) : null;
    const candidates = await prisma.rosterPlayers.findMany({ where: team ? { teamId: team.id } : undefined, select: { id: true, teamId: true, playerName: true, position: true, positionGroup: true }, orderBy: { playerName: 'asc' } });
    res.json(candidates);
  });
  router.patch('/review/:id', async (req, res) => {
    const body = req.body as { matchedRosterPlayerId?: string | null; matchStatus?: string; reviewNotes?: string };
    const row = await prisma.nflversePlayerProductionStaging.update({ where: { id: BigInt(req.params.id) }, data: { matchedRosterPlayerId: body.matchedRosterPlayerId ?? undefined, matchStatus: body.matchStatus ?? (body.matchedRosterPlayerId ? 'CONFIRMED' : undefined), matchConfidence: body.matchedRosterPlayerId ? 100 : undefined, reviewNotes: body.reviewNotes } });
    res.json(serialize(row));
  });
  router.post('/promote', async (req, res) => { const body = req.body as { seasonYear: number; stagingIds?: string[] }; res.json(await repository.promote(Number(body.seasonYear), body.stagingIds)); });
  router.post('/recalculate', async (req, res) => { const body = req.body as { seasonYear: number; draftYear: number; teamId?: number }; res.json(await repository.recalculateAssessments(Number(body.seasonYear), Number(body.draftYear), body.teamId)); });
  return router;
};
