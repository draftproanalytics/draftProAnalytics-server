// src/modules/draft-analysis/presentation/controllers/LiveDraftTrackerController.ts
import { Request, Response } from 'express';
import { TrackLiveDraftPickUseCase } from '../../application/use-cases/TrackLiveDraftPick.usecase';
import { ILiveDraftPickRepository } from '../../domain/repositories/ILiveDraftPickRepository';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export class LiveDraftTrackerController {
  constructor(
    private readonly trackLiveDraftPickUseCase: TrackLiveDraftPickUseCase,
    private readonly liveDraftPickRepository: ILiveDraftPickRepository
  ) {}

  /**
   * POST /api/draft-tracker/track-pick
   * Track a draft pick in real-time
   */
  async trackPick(req: Request, res: Response): Promise<void> {
    try {
      const {
        year,
        round,
        pick,
        teamId,
        playerName,
        position,
        college,
        consensusRanking
      } = req.body;

      const result = await this.trackLiveDraftPickUseCase.execute({
        year,
        round,
        pick,
        teamId,
        playerName,
        position: position as PositionGroup,
        college,
        consensusRanking
      });

      res.status(200).json({
        success: true,
        data: {
          pick: {
            id: result.pick.id,
            year: result.pick.year,
            round: result.pick.round,
            pick: result.pick.pick,
            overallPick: result.pick.overallPick,
            teamId: result.pick.teamId,
            playerName: result.pick.playerName,
            position: result.pick.position,
            college: result.pick.college,
            status: result.pick.status,
            pickedAt: result.pick.pickedAt
          },
          grade: result.grade,
          comparison: result.comparison
        }
      });
    } catch (error) {
      console.error('Error tracking draft pick:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track draft pick',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-tracker/:year/current
   * Get current pick on the clock
   */
  async getCurrentPick(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params;

      const currentPick = await this.liveDraftPickRepository.findCurrentPick(parseInt(year));

      if (!currentPick) {
        res.status(404).json({
          success: false,
          message: 'No current pick found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: currentPick.id,
          year: currentPick.year,
          round: currentPick.round,
          pick: currentPick.pick,
          overallPick: currentPick.overallPick,
          teamId: currentPick.teamId,
          status: currentPick.status
        }
      });
    } catch (error) {
      console.error('Error getting current pick:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get current pick',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-tracker/:year/team/:teamId
   * Get all picks for a team in a given year
   */
  async getTeamPicks(req: Request, res: Response): Promise<void> {
    try {
      const { year, teamId } = req.params;

      const picks = await this.liveDraftPickRepository.findByTeam(
        teamId,
        parseInt(year)
      );

      res.status(200).json({
        success: true,
        data: picks.map(p => ({
          id: p.id,
          round: p.round,
          pick: p.pick,
          overallPick: p.overallPick,
          playerName: p.playerName,
          position: p.position,
          college: p.college,
          status: p.status,
          grade: p.grade ? {
            grade: p.grade.grade,
            score: p.grade.score
          } : null,
          pickedAt: p.pickedAt
        }))
      });
    } catch (error) {
      console.error('Error getting team picks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get team picks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-tracker/:year/round/:round
   * Get all picks in a specific round
   */
  async getRoundPicks(req: Request, res: Response): Promise<void> {
    try {
      const { year, round } = req.params;

      const picks = await this.liveDraftPickRepository.findByRound(
        parseInt(year),
        parseInt(round)
      );

      res.status(200).json({
        success: true,
        data: picks.map(p => ({
          pick: p.pick,
          overallPick: p.overallPick,
          teamId: p.teamId,
          playerName: p.playerName,
          position: p.position,
          college: p.college,
          status: p.status,
          grade: p.grade ? {
            grade: p.grade.grade,
            score: p.grade.score
          } : null
        }))
      });
    } catch (error) {
      console.error('Error getting round picks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get round picks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-tracker/:year/all
   * Get all picks for entire draft
   */
  async getAllPicks(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params;

      const picks = await this.liveDraftPickRepository.findAll(parseInt(year));

      res.status(200).json({
        success: true,
        data: picks.map(p => ({
          id: p.id,
          round: p.round,
          pick: p.pick,
          overallPick: p.overallPick,
          teamId: p.teamId,
          playerName: p.playerName,
          position: p.position,
          college: p.college,
          status: p.status,
          grade: p.grade ? {
            grade: p.grade.grade,
            score: p.grade.score
          } : null,
          pickedAt: p.pickedAt
        }))
      });
    } catch (error) {
      console.error('Error getting all picks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get all picks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}