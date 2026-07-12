// src/modules/teamNeedsAnalysis/presentation/controllers/TeamNeedsAnalysis.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { TeamNeedsAnalysisService } from '../../application/services/TeamNeedsAnalysisService';
import {
  GenerateTeamNeedsRequestSchema,
  GenerateAllTeamsNeedsRequestSchema,
  GetTeamNeedsRequestSchema,
} from '../../application/dto/TeamNeedsAnalysis.dto';

export class TeamNeedsAnalysisController {
  constructor(private readonly service: TeamNeedsAnalysisService) {}

  /**
   * POST /api/team-needs/generate
   * Generate needs analysis for a single team
   */
  generateTeamNeeds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = GenerateTeamNeedsRequestSchema.parse(req.body);

      const result = await this.service.generateTeamNeeds(
        validatedData.teamId,
        validatedData.seasonYear,
        validatedData.forceRefresh
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * POST /api/team-needs/generate-all
   * Generate needs analysis for all teams
   */
  generateAllTeamsNeeds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = GenerateAllTeamsNeedsRequestSchema.parse(req.body);

      const result = await this.service.generateAllTeamsNeeds(
        validatedData.seasonYear,
        validatedData.forceRefresh
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /api/team-needs/:teamId
   * Get team needs analysis
   */
  getTeamNeeds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId);
      const seasonYear = req.query.seasonYear
        ? parseInt(req.query.seasonYear as string)
        : undefined;

      if (isNaN(teamId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid team ID',
        });
        return;
      }

      const result = await this.service.getTeamNeeds(teamId, seasonYear);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Team needs analysis not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/team-needs/season/:year
   * Get all teams needs for a season
   */
  getAllTeamsNeeds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const seasonYear = parseInt(req.params.year);

      if (isNaN(seasonYear)) {
        res.status(400).json({
          success: false,
          error: 'Invalid season year',
        });
        return;
      }

      const result = await this.service.getAllTeamsNeeds(seasonYear);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/team-needs/datatable/teams/:year
   * Get teams needs formatted for DataTable
   */
  getTeamsNeedsDataTable = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const seasonYear = parseInt(req.params.year);

      if (isNaN(seasonYear)) {
        res.status(400).json({
          success: false,
          error: 'Invalid season year',
        });
        return;
      }

      const result = await this.service.getTeamsNeedsDataTable(seasonYear);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/team-needs/datatable/positions/:year
   * Get position-level needs formatted for DataTable
   */
  getPositionNeedsDataTable = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const seasonYear = parseInt(req.params.year);

      if (isNaN(seasonYear)) {
        res.status(400).json({
          success: false,
          error: 'Invalid season year',
        });
        return;
      }

      const result = await this.service.getPositionNeedsDataTable(seasonYear);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}