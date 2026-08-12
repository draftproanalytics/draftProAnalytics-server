// src/presentation/controllers/CombineScoreController.ts
import { Request, Response, NextFunction } from 'express';
import { CombineScoreService } from '@/application/combineScore/services/CombineScoreService';
import { ApiResponse, PaginatedResponse } from '@/shared/types/common';
import { 
  CombineScoreResponseDto, 
  CombineScoreWorkspaceFiltersDto,
  CombineScoreWorkspaceItemDto,
  CombineScoreFiltersDto, 
  PaginationDto,
  TopPerformersDto,
  AthleticScoreRangeDto 
} from '@/application/combineScore/dto/CombineScoreDto';

export class CombineScoreController {
  constructor(private readonly combineScoreService: CombineScoreService) {}

  createCombineScore = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const combineScore = await this.combineScoreService.createCombineScore(req.body);
      res.status(201).json({
        success: true,
        data: combineScore,
        message: 'Combine score created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getCombineScoreById = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const combineScore = await this.combineScoreService.getCombineScoreById(id);
      res.json({
        success: true,
        data: combineScore,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllCombineScores = async (
    req: Request,
    res: Response<{ success: boolean; data: CombineScoreResponseDto[]; pagination: PaginatedResponse<CombineScoreResponseDto>['pagination'] }>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as CombineScoreFiltersDto & PaginationDto;
      const combineScores = await this.combineScoreService.getAllCombineScores(query, {
        page: query.page ?? 1,
        limit: query.limit ?? query.pageSize ?? 10,
      });
      res.json({ success: true, data: combineScores.data, pagination: combineScores.pagination });
    } catch (error) {
      next(error);
    }
  };

  getWorkspace = async (
    req: Request,
    res: Response<{ success: boolean; data: CombineScoreWorkspaceItemDto[]; pagination: PaginatedResponse<CombineScoreWorkspaceItemDto>['pagination'] }>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as CombineScoreWorkspaceFiltersDto & PaginationDto;
      const filters: CombineScoreWorkspaceFiltersDto = {
        draftYear: query.draftYear,
        position: query.position,
        college: query.college,
        playerName: query.playerName,
        combineStatus: query.combineStatus,
        sortField: query.sortField ?? 'name',
        sortOrder: query.sortOrder ?? 'asc',
      };
      const pageSize = query.pageSize ?? query.limit ?? 25;
      const result = await this.combineScoreService.getWorkspace(filters, {
        page: query.page ?? 1,
        limit: pageSize,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  updateCombineScore = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const combineScore = await this.combineScoreService.updateCombineScore(id, req.body);
      res.json({
        success: true,
        data: combineScore,
        message: 'Combine score updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCombineScore = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      await this.combineScoreService.deleteCombineScore(id);
      res.status(204).json({
        success: true,
        message: 'Combine score deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getCombineScoreByPlayerId = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const playerId = parseInt(req.params.playerId);
      const combineScore = await this.combineScoreService.getCombineScoreByPlayerId(playerId);
      
      if (!combineScore) {
        res.status(404).json({
          success: false,
          message: `No combine score found for player ${playerId}`,
        });
        return;
      }

      res.json({
        success: true,
        data: combineScore,
      });
    } catch (error) {
      next(error);
    }
  };


  getCombineScoreByProspectId = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const prospectId = parseInt(req.params.prospectId);
      const combineScore = await this.combineScoreService.getCombineScoreByProspectId(prospectId);
      if (!combineScore) {
        res.status(404).json({
          success: false,
          message: `No combine score found for prospect ${prospectId}`,
        });
        return;
      }
      res.json({ success: true, data: combineScore });
    } catch (error) {
      next(error);
    }
  };

  getCombineScoresByPlayerIds = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const playerIds = req.body.playerIds as number[];
      
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Player IDs array is required and cannot be empty',
        });
        return;
      }

      const combineScores = await this.combineScoreService.getCombineScoresByPlayerIds(playerIds);
      res.json({
        success: true,
        data: combineScores,
      });
    } catch (error) {
      next(error);
    }
  };

  getTopPerformers = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { metric, limit } = req.query;
      
      const dto: TopPerformersDto = {
        metric: metric as TopPerformersDto['metric'],
        limit: limit ? parseInt(limit as string) : 10,
      };

      const topPerformers = await this.combineScoreService.getTopPerformers(dto);
      res.json({
        success: true,
        data: topPerformers,
        message: `Top ${topPerformers.length} performers for ${metric}`,
      });
    } catch (error) {
      next(error);
    }
  };

  getCombineScoresByAthleticScore = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { minScore, maxScore } = req.query;
      
      const dto: AthleticScoreRangeDto = {
        minScore: parseInt(minScore as string),
        maxScore: parseInt(maxScore as string),
      };

      const combineScores = await this.combineScoreService.getCombineScoresByAthleticScore(dto);
      res.json({
        success: true,
        data: combineScores,
        message: `Found ${combineScores.length} combine scores in athletic score range ${dto.minScore}-${dto.maxScore}`,
      });
    } catch (error) {
      next(error);
    }
  };

  getAthleticRankings = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const rankings = await this.combineScoreService.getAthleticRankings();
      res.json({
        success: true,
        data: rankings,
        message: 'Athletic rankings retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateSpecificMetric = async (
    req: Request,
    res: Response<ApiResponse<CombineScoreResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { metric } = req.params;
      const { value } = req.body;

      if (typeof value !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Value must be a number',
        });
        return;
      }

      const combineScore = await this.combineScoreService.updateSpecificMetric(id, metric, value);
      res.json({
        success: true,
        data: combineScore,
        message: `${metric} updated successfully`,
      });
    } catch (error) {
      next(error);
    }
  };
}