// src/modules/draft-analysis/presentation/routes/draft-analysis.routes.ts
import { Router } from 'express';
import { DraftAnalysisController } from '../controllers/DraftAnalysisController';
import { LiveDraftTrackerController } from '../controllers/LiveDraftTrackerController';
import { AnalyzeTeamDraftPatternValidator } from '../validators/AnalyzeTeamDraftPatternValidator';
import { PredictDraftSelectionValidator } from '../validators/PredictDraftSelectionValidator';
import { GradeDraftPickValidator } from '../validators/GradeDraftPickValidator';

export class DraftAnalysisRoutes {
  private router: Router;

  constructor(
    private readonly draftAnalysisController: DraftAnalysisController,
    private readonly liveDraftTrackerController: LiveDraftTrackerController
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Draft Analysis Routes
    this.router.post(
      '/analyze-pattern',
      AnalyzeTeamDraftPatternValidator.validateGetPattern(),
      AnalyzeTeamDraftPatternValidator.handleValidationErrors,
      this.draftAnalysisController.analyzePattern.bind(this.draftAnalysisController)
    );

    this.router.post(
      '/predict-selection',
      PredictDraftSelectionValidator.validatePrediction(),
      PredictDraftSelectionValidator.handleValidationErrors,
      this.draftAnalysisController.predictSelection.bind(this.draftAnalysisController)
    );

    this.router.post(
      '/grade-pick',
      GradeDraftPickValidator.validateGradePick(),
      GradeDraftPickValidator.handleValidationErrors,
      this.draftAnalysisController.gradePick.bind(this.draftAnalysisController)
    );

    this.router.get(
      '/report/:teamId/:year',
      this.draftAnalysisController.getDraftReport.bind(this.draftAnalysisController)
    );

    this.router.get(
      '/pattern/:teamId',
      this.draftAnalysisController.getPattern.bind(this.draftAnalysisController)
    );

    // Live Draft Tracker Routes
    this.router.post(
      '/track-pick',
      this.liveDraftTrackerController.trackPick.bind(this.liveDraftTrackerController)
    );

    this.router.get(
      '/:year/current',
      this.liveDraftTrackerController.getCurrentPick.bind(this.liveDraftTrackerController)
    );

    this.router.get(
      '/:year/team/:teamId',
      this.liveDraftTrackerController.getTeamPicks.bind(this.liveDraftTrackerController)
    );

    this.router.get(
      '/:year/round/:round',
      this.liveDraftTrackerController.getRoundPicks.bind(this.liveDraftTrackerController)
    );

    this.router.get(
      '/:year/all',
      this.liveDraftTrackerController.getAllPicks.bind(this.liveDraftTrackerController)
    );
  }

  getRouter(): Router {
    return this.router;
  }
}