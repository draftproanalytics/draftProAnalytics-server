// src/modules/draft-analysis/presentation/controllers/DraftAnalysisController.ts
import { Request, Response } from 'express';
import { AnalyzeTeamDraftPatternUseCase } from '../../application/use-cases/AnalyzeTeamDraftPattern.usecase';
import { PredictDraftSelectionUseCase } from '../../application/use-cases/PredictDraftSelection.usecase';
import { GradeDraftPickUseCase } from '../../application/use-cases/GradeDraftPick.usecase';
import { GenerateDraftReportUseCase } from '../../application/use-cases/GenerateDraftReport.usecase';
import { 
  AnalyzeTeamDraftPatternRequestDto, 
  AnalyzeTeamDraftPatternResponseDto 
} from '../../application/dto/AnalyzeTeamDraftPattern.dto';
import {
  PredictDraftSelectionRequestDto,
  PredictDraftSelectionResponseDto
} from '../../application/dto/PredictDraftSelection.dto';
import {
  GradeDraftPickRequestDto,
  GradeDraftPickResponseDto
} from '../../application/dto/GradeDraftPick.dto';

export class DraftAnalysisController {
  constructor(
    private readonly analyzeTeamDraftPatternUseCase: AnalyzeTeamDraftPatternUseCase,
    private readonly predictDraftSelectionUseCase: PredictDraftSelectionUseCase,
    private readonly gradeDraftPickUseCase: GradeDraftPickUseCase,
    private readonly generateDraftReportUseCase: GenerateDraftReportUseCase
  ) {}

  /**
   * POST /api/draft-analysis/analyze-pattern
   * Analyze a team's historical draft pattern
   */
  async analyzePattern(req: Request, res: Response): Promise<void> {
    try {
      const dto: AnalyzeTeamDraftPatternRequestDto = req.body;

      const pattern = await this.analyzeTeamDraftPatternUseCase.execute(dto);

      const response: AnalyzeTeamDraftPatternResponseDto = {
        teamId: pattern.teamId,
        regimeStartYear: pattern.regimeStartYear,
        regimeEndYear: pattern.regimeEndYear,
        generalManager: pattern.generalManager,
        headCoach: pattern.headCoach,
        positionMetrics: pattern.getAllMetrics().map(m => ({
          position: m.group,
          totalPicks: m.totalPicks,
          successfulPicks: m.successfulPicks,
          successRate: m.successRate,
          averageRound: m.averageRound,
          preferredRounds: m.preferredRounds,
          competency: m.draftCompetency,
          systemFitBias: m.systemFitBias
        })),
        bestDraftingPositions: pattern.getBestDraftingPositions(),
        worstDraftingPositions: pattern.getWorstDraftingPositions(),
        overallSuccessRate: pattern.getAllMetrics().reduce((sum, m) => sum + m.successRate, 0) / 
                           pattern.getAllMetrics().length,
        totalPicksAnalyzed: pattern.getAllMetrics().reduce((sum, m) => sum + m.totalPicks, 0)
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error analyzing draft pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze draft pattern',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/draft-analysis/predict-selection
   * Predict what position a team will draft
   */
  async predictSelection(req: Request, res: Response): Promise<void> {
    try {
      const dto: PredictDraftSelectionRequestDto = req.body;

      const prediction = await this.predictDraftSelectionUseCase.execute(dto);

      const response: PredictDraftSelectionResponseDto = {
        teamId: prediction.teamId,
        round: prediction.round,
        pick: prediction.pick,
        year: prediction.year,
        predictions: prediction.predictedPositions.map(p => ({
          position: p.position,
          probability: p.probability,
          reasoning: p.reasoning,
          historicalSuccessRate: 0 // Would be populated from pattern
        })),
        mostLikelyPosition: prediction.getMostLikelyPosition(),
        confidenceLevel: prediction.getConfidenceLevel(),
        teamNeedScore: prediction.teamNeed,
        historicalTendencyScore: prediction.historicalTendency,
        isBestPlayerAvailableTeam: prediction.bestPlayerAvailable
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error predicting draft selection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to predict draft selection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/draft-analysis/grade-pick
   * Grade a draft pick in real-time
   */
  async gradePick(req: Request, res: Response): Promise<void> {
    try {
      const dto: GradeDraftPickRequestDto = req.body;

      const gradeResult = await this.gradeDraftPickUseCase.execute(dto);

      const response: GradeDraftPickResponseDto = {
        teamId: dto.teamId,
        playerName: dto.playerName,
        position: dto.position,
        round: dto.round,
        pick: dto.pick,
        grade: {
          grade: gradeResult.grade.grade,
          score: gradeResult.grade.score,
          reasoning: gradeResult.grade.reasoning
        },
        expectedSuccess: gradeResult.expectedSuccess,
        historicalContext: gradeResult.historicalContext,
        valueAnalysis: gradeResult.valueAnalysis,
        warnings: gradeResult.warnings,
        isReach: gradeResult.warnings.some(w => w.toLowerCase().includes('reach')),
        isValue: gradeResult.warnings.some(w => w.toLowerCase().includes('value'))
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error grading draft pick:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to grade draft pick',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-analysis/report/:teamId/:year
   * Generate full draft report for a team
   */
  async getDraftReport(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, year } = req.params;

      const report = await this.generateDraftReportUseCase.execute({
        teamId,
        year: parseInt(year)
      });

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating draft report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate draft report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/draft-analysis/pattern/:teamId
   * Get existing draft pattern for a team
   */
  async getPattern(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      const pattern = await this.analyzeTeamDraftPatternUseCase.execute({
        teamId,
        regimeStartYear: 2017, // Would be dynamically determined
        generalManager: 'Brett Veach',
        headCoach: 'Andy Reid'
      });

      const response: AnalyzeTeamDraftPatternResponseDto = {
        teamId: pattern.teamId,
        regimeStartYear: pattern.regimeStartYear,
        regimeEndYear: pattern.regimeEndYear,
        generalManager: pattern.generalManager,
        headCoach: pattern.headCoach,
        positionMetrics: pattern.getAllMetrics().map(m => ({
          position: m.group,
          totalPicks: m.totalPicks,
          successfulPicks: m.successfulPicks,
          successRate: m.successRate,
          averageRound: m.averageRound,
          preferredRounds: m.preferredRounds,
          competency: m.draftCompetency,
          systemFitBias: m.systemFitBias
        })),
        bestDraftingPositions: pattern.getBestDraftingPositions(),
        worstDraftingPositions: pattern.getWorstDraftingPositions(),
        overallSuccessRate: pattern.getAllMetrics().reduce((sum, m) => sum + m.successRate, 0) / 
                           pattern.getAllMetrics().length,
        totalPicksAnalyzed: pattern.getAllMetrics().reduce((sum, m) => sum + m.totalPicks, 0)
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error getting draft pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get draft pattern',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}