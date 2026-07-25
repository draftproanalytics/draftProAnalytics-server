// src/presentation/controllers/TeamController.ts
import { Request, Response, NextFunction } from 'express';
import { TeamService } from '@/application/team/services/TeamService';
import { ApiResponse, PaginatedResponse } from '@/shared/types/common';
import { TeamResponseDto, TeamFiltersDto, PaginationDto, TeamStatsResponseDto } from '@/application/team/dto/TeamDto';

export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  createTeam = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const team = await this.teamService.createTeam(req.body);
      res.status(201).json({
        success: true,
        data: team,
        message: 'Team created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamById = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const team = await this.teamService.getTeamById(id);
      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllTeams = async (
    req: Request,
    res: Response<{success: boolean, data: TeamResponseDto[], pagination: any}>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const filters: TeamFiltersDto = {
        name: req.query.name as string,
        city: req.query.city as string,
        state: req.query.state as string,
        conference: req.query.conference as string,
        division: req.query.division as string,
        stadium: req.query.stadium as string,
        scheduleId: req.query.scheduleId ? parseInt(req.query.scheduleId as string) : undefined,
      };

      const pagination: PaginationDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortField: (req.query.sortField as PaginationDto['sortField']) ?? 'name',
        sortOrder: req.query.sortOrder === '-1' ? -1 : 1,
      };

      const teams = await this.teamService.getAllTeams(filters, pagination);
      res.json({
        success: true,
        data: teams.data,
        pagination: teams.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTeam = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const team = await this.teamService.updateTeam(id, req.body);
      res.json({
        success: true,
        data: team,
        message: 'Team updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteTeam = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      await this.teamService.deleteTeam(id);
      res.status(204).json({
        success: true,
        message: 'Team deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamByName = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const name = req.params.name;
      const team = await this.teamService.getTeamByName(name);
      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamsByConference = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const conference = req.params.conference;
      const teams = await this.teamService.getTeamsByConference(conference);
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamsByDivision = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const division = req.params.division;
      const teams = await this.teamService.getTeamsByDivision(division);
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamsByState = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const state = req.params.state;
      const teams = await this.teamService.getTeamsByState(state);
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamByScheduleId = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto | null>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scheduleId = parseInt(req.params.scheduleId);
      const team = await this.teamService.getTeamByScheduleId(scheduleId);
      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamsWithSchedules = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teams = await this.teamService.getTeamsWithSchedules();
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamsWithoutSchedules = async (
    req: Request,
    res: Response<ApiResponse<TeamResponseDto[]>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teams = await this.teamService.getTeamsWithoutSchedules();
      res.json({
        success: true,
        data: teams,
      });
    } catch (error) {
      next(error);
    }
  };

  getTeamStats = async (
    req: Request,
    res: Response<ApiResponse<TeamStatsResponseDto>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.teamService.getTeamStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}