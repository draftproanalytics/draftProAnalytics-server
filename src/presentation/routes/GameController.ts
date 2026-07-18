// src/presentation/controllers/GameController.ts
import { Request, Response, NextFunction } from 'express';
import type { GameService } from '@/application/game/services/GameService';
import { ApiResponse } from '@/shared/types/common';
import { GameResponseDto, UpdateScoreDtoSchema } from '@/application/game/dto/GameDto';
import { z } from 'zod';
import { mapGameToResponse } from '@/application/game/dto/mapGameToResponse';

type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

type ControllerGameFilters = {
  teamId?: number;
  homeTeamId?: number;
  awayTeamId?: number;
  gameWeek?: number;
  seasonYear?: string;
  seasonType?: number;
  gameStatus?: GameStatus;
  gameCity?: string;
  gameCountry?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

function toStatus(input: unknown): GameStatus | undefined {
  if (!input) return undefined;
  const v = String(input).toLowerCase();
  const map: Record<string, GameStatus> = {
    scheduled: 'scheduled',
    in_progress: 'in_progress',
    // accept common synonym from UI/backends
    final: 'completed',
    completed: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    postponed: 'postponed',
  };
  return map[v];
}

function toDate(input: unknown): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input as any);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Accept both flat queries and nested `?params[year]=...` style.
 * Also handle aliases (year→seasonYear, week→gameWeek, team_id→teamId).
 */
function normalizeFilters(qAny: Record<string, any>): ControllerGameFilters {
  const q = qAny?.params && typeof qAny.params === 'object' ? qAny.params : qAny;

  // aliases
  const seasonYear = q.seasonYear ?? q.year;
  const gameWeek = q.gameWeek ?? q.week;
  const teamId = q.teamId ?? q.team_id;

  const out: ControllerGameFilters = {};

  if (teamId != null) out.teamId = Number(teamId);
  if (q.homeTeamId != null) out.homeTeamId = Number(q.homeTeamId);
  if (q.awayTeamId != null) out.awayTeamId = Number(q.awayTeamId);

  if (gameWeek != null) out.gameWeek = Number(gameWeek);
  if (seasonYear != null) out.seasonYear = String(seasonYear);

  if (q.seasonType != null) out.seasonType = Number(q.seasonType);

  out.gameStatus = toStatus(q.gameStatus);

  if (q.gameCity) out.gameCity = String(q.gameCity);
  if (q.gameCountry) out.gameCountry = String(q.gameCountry);

  out.dateFrom = toDate(q.dateFrom);
  out.dateTo = toDate(q.dateTo);

  return out;
}

export class GameController {
  constructor(private readonly gameService: GameService) {}

  createGame = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const game = await this.gameService.createGame(req.body);
      const dto = mapGameToResponse(game);
      res.status(201).json({ success: true, data: dto, message: 'Game created successfully' });
    } catch (error) {
      next(error);
    }
  };

  getGameById = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const game = await this.gameService.getGameById(id);
      const dto = mapGameToResponse(game);
      res.json({ success: true, data: dto });
    } catch (error) {
      next(error);
    }
  };

  // 🔧 Flatten & normalize query BEFORE calling service
  getAllGames = async (req: Request, res: Response<any>, next: NextFunction) => {
    try {
      // support both flat and nested
      const raw = req.query as any;
      const filters = normalizeFilters(raw);

      // page/limit may also be nested under ?params[]
      const qp = raw?.params ?? raw;
      const page = qp.page ? parseInt(String(qp.page), 10) : 1;
      const limit = qp.limit ? parseInt(String(qp.limit), 10) : 25;

      // DEBUG (optional):
      // console.log('→ normalized filters:', filters);
      // console.log('→ page/limit:', { page, limit });

      const { data, pagination } = await this.gameService.getAllGames(filters, { page, limit });
      const dtoGames = data.map(mapGameToResponse);

      res.set('X-Total-Count', String(pagination.total));
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');

      res.json({ success: true, data: dtoGames, pagination });
    } catch (err) {
      next(err);
    }
  };

  getPreseasonGames = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = req.query.teamId ? z.coerce.number().parse(req.query.teamId) : undefined;
      const preseasonWeek = req.query.preseasonWeek
        ? z.coerce.number().parse(req.query.preseasonWeek)
        : undefined;
      const games = await this.gameService.getPreseasonGames(teamId, preseasonWeek);
      const dtoGames = games.map(mapGameToResponse);
      res.json({ success: true, data: dtoGames });
    } catch (error) {
      next(error);
    }
  };

  getRegularSeasonGames = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = req.query.teamId ? z.coerce.number().parse(req.query.teamId) : undefined;
      const seasonYear = (req.query.seasonYear as string) ?? (req.query.year as string);
      const games = await this.gameService.getRegularSeasonGames(teamId, seasonYear);
      const dtoGames = games.map(mapGameToResponse);
      res.json({ success: true, data: dtoGames });
    } catch (error) {
      next(error);
    }
  };

  getTeamGames = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = z.coerce.number().parse(req.params.teamId);
      const seasonYear = z
        .string()
        .regex(/^\d{4}$/)
        .parse(req.params.seasonYear);
      const games = await this.gameService.getTeamSeasonGames(teamId, seasonYear);
      const dtoGames = games.map(mapGameToResponse);
      res.json({ success: true, data: dtoGames });
    } catch (error) {
      next(error);
    }
  };

  updateGame = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const game = await this.gameService.updateGame(id, req.body);
      const dto = mapGameToResponse(game);
      res.json({ success: true, data: dto, message: 'Game updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  updateGameScore = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const parsed = UpdateScoreDtoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid score update payload',
          errors: parsed.error.issues,
        } as any);
        return;
      }
      const game = await this.gameService.updateGameScore(id, parsed.data);
      const dto = mapGameToResponse(game);
      res.json({ success: true, data: dto, message: 'Game score updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  deleteGame = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await this.gameService.deleteGame(id);
      res.status(204).json({ success: true, message: 'Game deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  getUpcomingGames = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = req.query.teamId ? z.coerce.number().parse(req.query.teamId) : undefined;
      const limit = req.query.limit ? z.coerce.number().parse(req.query.limit) : undefined;
      const games = await this.gameService.getUpcomingGames(teamId, limit);
      const dtoGames = games.map(mapGameToResponse);
      res.json({ success: true, data: dtoGames });
    } catch (error) {
      next(error);
    }
  };

  getCompletedGames = async (
    req: Request,
    res: Response<ApiResponse<GameResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = req.query.teamId ? z.coerce.number().parse(req.query.teamId) : undefined;
      const limit = req.query.limit ? z.coerce.number().parse(req.query.limit) : undefined;
      const games = await this.gameService.getCompletedGames(teamId, limit);
      const dtoGames = games.map(mapGameToResponse);
      res.json({ success: true, data: dtoGames });
    } catch (error) {
      next(error);
    }
  };

  getTeamSeasonYears = async (
    req: Request,
    res: Response<ApiResponse<readonly number[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = z.coerce.number().int().positive().parse(req.params.teamId);
      const years = await this.gameService.getTeamSeasonYears(teamId);
      res.json({ success: true, data: years });
    } catch (error) {
      next(error);
    }
  };

  getTeamStatistics = async (
    req: Request,
    res: Response<ApiResponse<any>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = z.coerce.number().parse(req.params.teamId);
      const seasonYear = z
        .string()
        .regex(/^\d{4}$/)
        .parse((req.query.seasonYear as string) ?? String(new Date().getFullYear()));
      const stats = await this.gameService.getTeamStatistics(teamId, seasonYear);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  // src/presentation/controllers/GameController.ts
  primetime = async (req: Request, res: Response) => {
  const year = String(req.query.year ?? '')

  const { data } = await this.gameService.getAllGames(
    { seasonYear: year },
    { page: 1, limit: 500 }
  )

  const primetimeGames = data.filter((g) => {
    if (!g.gameDate) return false
    const hour = new Date(g.gameDate).getHours()
    return hour >= 19 && hour <= 23   // 7pm–11pm primetime
  })

  return res.json(primetimeGames)
}

}
