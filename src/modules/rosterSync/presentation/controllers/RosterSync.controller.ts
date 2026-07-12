// src/modules/rosterSync/presentation/controllers/RosterSync.controller.ts

import { Request, Response, NextFunction } from 'express';
import { RosterSyncService } from '../../application/services/RosterSync.service';

export class RosterSyncController {
  constructor(private readonly service: RosterSyncService) {}

  /**
   * POST /api/roster-sync/team/:teamId
   * Sync roster for a single team
   */
  syncTeamRoster = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId);

      if (isNaN(teamId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid team ID',
        });
        return;
      }

      console.log(`🔄 Starting roster sync for team ${teamId}`);
      const result = await this.service.syncTeamRoster(teamId);

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        data: result,
      });

    } catch (error) {
      console.error('❌ Error in syncTeamRoster:', error);
      next(error);
    }
  };

  /**
   * POST /api/roster-sync/all
   * Sync rosters for all teams
   */
  syncAllTeamRosters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log('🔄 Starting bulk roster sync for all teams');
      const result = await this.service.syncAllTeamRosters();

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        data: result,
        summary: {
          totalTeams: result.totalTeams,
          successfulTeams: result.successfulTeams,
          failedTeams: result.failedTeams,
          totalPlayers: result.totalPlayers,
          totalRosterEntries: result.totalRosterEntries,
          durationSeconds: (result.durationMs / 1000).toFixed(2),
        },
      });

    } catch (error) {
      console.error('❌ Error in syncAllTeamRosters:', error);
      next(error);
    }
  };

  /**
   * GET /api/roster-sync/status
   * Get roster sync status (how many teams have roster data)
   */
  getRosterSyncStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.getRosterSyncStatus();

      res.status(200).json({
        success: true,
        data: result,
      });

    } catch (error) {
      console.error('❌ Error in getRosterSyncStatus:', error);
      next(error);
    }
  };
}