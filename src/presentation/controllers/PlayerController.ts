// src/presentation/controllers/PlayerController.ts
import { Request, Response, NextFunction } from 'express';
import { PlayerService } from '@/application/player/services/PlayerService';
import { PlayerSyncService } from '@/application/player/services/PlayerSyncService'
import { EspnPlayerClient } from '@/infrastructure/espn/EspnPlayerClient'
import { PrismaPlayerRepository } from '@/infrastructure/repositories/PrismaPlayerRepository'
import { PrismaPlayerTeamRepository } from '@/infrastructure/repositories/PrismaPlayerTeamRepository'
import { ApiResponse, PaginatedResponse } from '@/shared/types/common';
import { 
  PlayerResponseDto, 
  PlayerFiltersDto, 
  PaginationDto,
  PlayerStatisticsDto,
  PositionStatisticsDto,
  PlayerSearchDto,
  PlayerPhysicalRangeDto,
  PlayerBulkUpdateDto
} from '@/application/player/dto/PlayerDto';
import { PrismaJobLogger } from '@/infrastructure/repositories/PrismaJobLogger';
import { prisma } from '@/lib/prisma';

// Define the response types
type SuccessResponse = {
  success: true;
  data: PlayerResponseDto[];
  pagination?: any;
}

type ErrorResponse = {
  success: false;
  message: string;
}

type PlayersByTeamResponse = SuccessResponse | ErrorResponse;

export class PlayerController {
   
  private service: PlayerSyncService

  constructor(private playerService: PlayerService) {
    const jobLogger  = new PrismaJobLogger(prisma);

    this.service = new PlayerSyncService(
      new EspnPlayerClient(),
      new PrismaPlayerRepository(),
      new PrismaPlayerTeamRepository(),
      jobLogger
    )
  }

  createPlayer = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const player = await this.playerService.createPlayer(req.body);
      res.status(201).json({
        success: true,
        data: player,
        message: 'Player created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayerById = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const player = await this.playerService.getPlayerById(id);
      res.json({
        success: true,
        data: player,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPlayers = async (
    req: Request,    
    res: Response<{success: boolean, data: PlayerResponseDto[], pagination: any}>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const filters: PlayerFiltersDto = {
        firstName: req.query.firstName as string,
        lastName: req.query.lastName as string,
        position: req.query.position as string,
        university: req.query.university as string,
        status: req.query.status as string,
        homeState: req.query.homeState as string,
        homeCity: req.query.homeCity as string,
        minAge: req.query.minAge ? parseInt(req.query.minAge as string) : undefined,
        maxAge: req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined,
        minHeight: req.query.minHeight ? parseInt(req.query.minHeight as string) : undefined,
        maxHeight: req.query.maxHeight ? parseInt(req.query.maxHeight as string) : undefined,
        minWeight: req.query.minWeight ? parseInt(req.query.minWeight as string) : undefined,
        maxWeight: req.query.maxWeight ? parseInt(req.query.maxWeight as string) : undefined,
        yearEnteredLeague: req.query.yearEnteredLeague ? parseInt(req.query.yearEnteredLeague as string) : undefined,
        prospectId: req.query.prospectId ? parseInt(req.query.prospectId as string) : undefined,
        search: req.query.search as string,
      };

      const pagination: PaginationDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortField: req.query.sortField as PaginationDto['sortField'],
        sortOrder: req.query.sortOrder ? Number(req.query.sortOrder) as 1 | -1 : undefined,
      };

      const players = await this.playerService.getAllPlayers(filters, pagination);
      res.json({
        success: true,
        data: players.data,
        pagination: players.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

// GET /players/team/:teamId
// PlayerController.ts - Use ARROW FUNCTION (like your working getPlayerById method)

/**
 * Get players by team ID
 * GET /api/v1/players/team/:teamId
 */
getPlayersByTeam = async (
  req: Request,
  res: Response<PlayersByTeamResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId)
    
    if (isNaN(teamId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      })
      return
    }
    
    console.log("===========================");
    console.log("making service call now...");
    console.log("this.playerService exists:", !!this.playerService);
    console.log("===========================");
    
    const players = await this.playerService.getPlayersByTeam(teamId)
    
    console.log("===========================");
    console.log("made service call successfully.");
    console.log("===========================");
    
    res.json({
      success: true,
      data: players
    })
  } catch (error) {
    console.log("===========================");
    console.log("service call FAILED.");      
    console.error('Error fetching team players:', error)
    console.log("===========================");
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team players'
    })
  }
};
  updatePlayer = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const player = await this.playerService.updatePlayer(id, req.body);
      res.json({
        success: true,
        data: player,
        message: 'Player updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deletePlayer = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      await this.playerService.deletePlayer(id);
      res.status(204).json({
        success: true,
        message: 'Player deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Search and filter endpoints
  searchPlayers = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const searchDto: PlayerSearchDto = {
        query: req.query.query as string,
        position: req.query.position as string,
        university: req.query.university as string,
        status: req.query.status as string,
      };

      const players = await this.playerService.searchPlayers(searchDto);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByPosition = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const position = req.params.position;
      const players = await this.playerService.getPlayersByPosition(position);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByUniversity = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const university = req.params.university;
      const players = await this.playerService.getPlayersByUniversity(university);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayerByProspectId = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const prospectId = parseInt(req.params.prospectId);
      const player = await this.playerService.getPlayerByProspectId(prospectId);
      res.json({
        success: true,
        data: player,
      });
    } catch (error) {
      next(error);
    }
  };

  getRookies = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const players = await this.playerService.getRookies();
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getVeterans = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const minYears = req.query.minYears ? parseInt(req.query.minYears as string) : undefined;
      const players = await this.playerService.getVeterans(minYears);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByYearEnteredLeague = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const year = parseInt(req.params.year);
      const players = await this.playerService.getPlayersByYearEnteredLeague(year);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByStatus = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = req.params.status;
      const players = await this.playerService.getPlayersByStatus(status);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByLocation = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const city = req.query.city as string;
      const state = req.query.state as string;
      const players = await this.playerService.getPlayersByLocation(city, state);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlayersByPhysicalRange = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const rangeDto: PlayerPhysicalRangeDto = {
        minHeight: req.query.minHeight ? parseInt(req.query.minHeight as string) : undefined,
        maxHeight: req.query.maxHeight ? parseInt(req.query.maxHeight as string) : undefined,
        minWeight: req.query.minWeight ? parseInt(req.query.minWeight as string) : undefined,
        maxWeight: req.query.maxWeight ? parseInt(req.query.maxWeight as string) : undefined,
      };

      const players = await this.playerService.getPlayersByPhysicalRange(rangeDto);
      res.json({
        success: true,
        data: players,
      });
    } catch (error) {
      next(error);
    }
  };

  sync = async (req: Request, res: Response) => {
    const teamEspnId = req.query.teamEspnId
      ? Number(req.query.teamEspnId)
      : undefined
    try {
      const result = teamEspnId
        ? await this.service.runTeam(teamEspnId)
        : await this.service.runAllTeams()
      res.json({ ok: true, result })
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message })
    }
  }

  // Statistics endpoints
  getPlayerStatistics = async (
    req: Request,
    res: Response<ApiResponse<PlayerStatisticsDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const statistics = await this.playerService.getPlayerStatistics();
      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  getPositionStatistics = async (
    req: Request,
    res: Response<ApiResponse<PositionStatisticsDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const position = req.params.position;
      const statistics = await this.playerService.getPositionStatistics(position);
      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  // Bulk operations
  bulkUpdatePlayers = async (
    req: Request,
    res: Response<ApiResponse<PlayerResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bulkUpdateDto: PlayerBulkUpdateDto = req.body;
      const updatedPlayers = await this.playerService.bulkUpdatePlayers(bulkUpdateDto);
      res.json({
        success: true,
        data: updatedPlayers,
        message: `Successfully updated ${updatedPlayers.length} players`,
      });
    } catch (error) {
      next(error);
    }
  };
}