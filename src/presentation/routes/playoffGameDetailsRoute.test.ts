import express from 'express';
import { request as httpRequest } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    game: {
      findUnique: prismaMocks.findUnique,
      findFirst: prismaMocks.findFirst,
    },
  },
}));

import { playoffGameDetailsRouter } from './playoffGameDetailsRoute';

const espnSummary = (eventId: string) => ({
  header: {
    season: { year: 2026 },
    competitions: [{
      id: eventId,
      date: '2026-08-15T00:00:00Z',
      status: { type: { detail: 'Scheduled' } },
      competitors: [
        {
          homeAway: 'away',
          score: '0',
          winner: false,
          team: { id: '1', abbreviation: 'AWY', displayName: 'Away Team' },
          records: [{ type: 'total', summary: '0-0' }],
        },
        {
          homeAway: 'home',
          score: '0',
          winner: false,
          team: { id: '2', abbreviation: 'HME', displayName: 'Home Team' },
          records: [{ type: 'total', summary: '0-0' }],
        },
      ],
    }],
  },
  boxscore: { teams: [], players: [] },
  scoringPlays: [],
  plays: [],
});

const requestRouter = async (gameId: string): Promise<{ status: number; body: unknown }> => {
  const app = express();
  app.use('/api/schedules/games', playoffGameDetailsRouter);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Unable to resolve test server port');

    return await new Promise((resolve, reject) => {
      const request = httpRequest({
        hostname: '127.0.0.1',
        port: address.port,
        path: `/api/schedules/games/${gameId}/details`,
        method: 'GET',
      }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(text) as unknown });
        });
      });
      request.on('error', reject);
      request.end();
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

describe('playoffGameDetailsRoute identifier resolution', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    prismaMocks.findUnique.mockReset();
    prismaMocks.findFirst.mockReset();
  });

  afterEach(() => {
    vi.stubGlobal('fetch', realFetch);
  });

  it('loads details when the route parameter is a local Game.id', async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: 77,
      seasonYear: 2026,
      gameWeek: 1,
      gameDate: new Date('2026-08-15T00:00:00Z'),
      gameLocation: null,
      gameCity: null,
      gameStateProvince: null,
      gameStatus: 'SCHEDULED',
      playoffRound: null,
      playoffConference: null,
      isPlayoff: false,
      seasonType: 1,
      espnEventId: '401774029',
      homeScore: null,
      awayScore: null,
      homeTeam: { id: 2, name: 'Home Team', city: null, abbreviation: 'HME' },
      awayTeam: { id: 1, name: 'Away Team', city: null, abbreviation: 'AWY' },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(espnSummary('401774029')), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestRouter('77');

    expect(result.status).toBe(200);
    expect(prismaMocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 77 } }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('event=401774029'), expect.any(Object));
    expect(result.body).toMatchObject({ success: true, data: { gameId: 77, espnEventId: '401774029' } });
  });

  it('loads details directly from ESPN when the event is not persisted locally', async () => {
    prismaMocks.findUnique.mockResolvedValue(null);
    prismaMocks.findFirst.mockResolvedValue(null);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(espnSummary('401774029')), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestRouter('401774029');

    expect(result.status).toBe(200);
    expect(prismaMocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { espnEventId: '401774029' } }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('event=401774029'), expect.any(Object));
    expect(result.body).toMatchObject({
      success: true,
      data: {
        gameId: 401774029,
        espnEventId: '401774029',
        title: 'Away Team at Home Team',
      },
    });
  });
});
