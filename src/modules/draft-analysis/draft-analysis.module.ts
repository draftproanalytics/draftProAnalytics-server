// src/modules/draft-analysis/draft-analysis.module.ts
import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

// Repositories - FIX THE IMPORT NAMES
import { IHistoricalDraftPickRepository } from './domain/repositories/IHistoricalDraftPickRepository';
import { ITeamDraftPatternRepository } from './domain/repositories/ITeamDraftPatternRepository';
import { ITeamRosterRepository } from './domain/repositories/ITeamRosterRepository';
import { ILiveDraftPickRepository } from './domain/repositories/ILiveDraftPickRepository';

import { PrismaHistoricalDraftPickRepository } from './infrastructure/repositories/PrismaHistoricalDraftPickRepository'; // Changed
import { PrismaTeamDraftPatternRepository } from './infrastructure/repositories/PrismaTeamDraftPatternRepository';
import { PrismaTeamRosterRepository } from './infrastructure/repositories/PrismaTeamRosterRepository';
import { PrismaLiveDraftPickRepository } from './infrastructure/repositories/PrismaLiveDraftPickRepository'; // Changed

// Domain Services
import { DraftPatternAnalyzerService } from './domain/services/DraftPatternAnalyzer.service';
import { DraftPredictionEngineService } from './domain/services/DraftPredictionEngine.service';
import { TeamNeedsCalculatorService } from './domain/services/TeamNeedsCalculator.service';

// Use Cases
import { AnalyzeTeamDraftPatternUseCase } from './application/use-cases/AnalyzeTeamDraftPattern.usecase';
import { PredictDraftSelectionUseCase } from './application/use-cases/PredictDraftSelection.usecase';
import { GradeDraftPickUseCase } from './application/use-cases/GradeDraftPick.usecase';
import { TrackLiveDraftPickUseCase } from './application/use-cases/TrackLiveDraftPick.usecase';
import { GenerateDraftReportUseCase } from './application/use-cases/GenerateDraftReport.usecase';

// Controllers
import { DraftAnalysisController } from './presentation/controllers/DraftAnalysisController';
import { LiveDraftTrackerController } from './presentation/controllers/LiveDraftTrackerController';

// Routes
import { DraftAnalysisRoutes } from './presentation/routes/draft-analysis.routes';

class DraftAnalysisModule {
  private static instance: DraftAnalysisModule;
  private prisma: PrismaClient;
  
  // Repositories
  private readonly historicalDraftPickRepository: IHistoricalDraftPickRepository;
  private readonly teamDraftPatternRepository: ITeamDraftPatternRepository;
  private readonly teamRosterRepository: ITeamRosterRepository;
  private readonly liveDraftPickRepository: ILiveDraftPickRepository;
  
  // Domain Services
  private readonly draftPatternAnalyzerService: DraftPatternAnalyzerService;
  private readonly draftPredictionEngineService: DraftPredictionEngineService;
  private readonly teamNeedsCalculatorService: TeamNeedsCalculatorService;
  
  // Use Cases
  private readonly analyzeTeamDraftPatternUseCase: AnalyzeTeamDraftPatternUseCase;
  private readonly predictDraftSelectionUseCase: PredictDraftSelectionUseCase;
  private readonly gradeDraftPickUseCase: GradeDraftPickUseCase;
  private readonly trackLiveDraftPickUseCase: TrackLiveDraftPickUseCase;
  private readonly generateDraftReportUseCase: GenerateDraftReportUseCase;
  
  // Controllers
  private readonly draftAnalysisController: DraftAnalysisController;
  private readonly liveDraftTrackerController: LiveDraftTrackerController;

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    
    // Initialize repositories
    this.historicalDraftPickRepository = new PrismaHistoricalDraftPickRepository(this.prisma);
    this.teamDraftPatternRepository = new PrismaTeamDraftPatternRepository(this.prisma);
    this.teamRosterRepository = new PrismaTeamRosterRepository(this.prisma);
    this.liveDraftPickRepository = new PrismaLiveDraftPickRepository(this.prisma);
    
    // Initialize domain services
    this.draftPatternAnalyzerService = new DraftPatternAnalyzerService();
    this.draftPredictionEngineService = new DraftPredictionEngineService();
    this.teamNeedsCalculatorService = new TeamNeedsCalculatorService(
      this.teamRosterRepository
    );
    
    // Initialize use cases
    this.analyzeTeamDraftPatternUseCase = new AnalyzeTeamDraftPatternUseCase(
      this.historicalDraftPickRepository,
      this.draftPatternAnalyzerService
    );

    this.predictDraftSelectionUseCase = new PredictDraftSelectionUseCase(
      this.teamDraftPatternRepository,
      this.teamRosterRepository,
      this.draftPredictionEngineService
    );

    this.gradeDraftPickUseCase = new GradeDraftPickUseCase(
      this.teamDraftPatternRepository
    );

    this.trackLiveDraftPickUseCase = new TrackLiveDraftPickUseCase(
      this.liveDraftPickRepository,
      this.gradeDraftPickUseCase
    );

    this.generateDraftReportUseCase = new GenerateDraftReportUseCase(
      this.liveDraftPickRepository,
      this.teamDraftPatternRepository
    );
    
    // Initialize controllers
    this.draftAnalysisController = new DraftAnalysisController(
      this.analyzeTeamDraftPatternUseCase,
      this.predictDraftSelectionUseCase,
      this.gradeDraftPickUseCase,
      this.generateDraftReportUseCase
    );

    this.liveDraftTrackerController = new LiveDraftTrackerController(
      this.trackLiveDraftPickUseCase,
      this.liveDraftPickRepository
    );
  }

  public static initialize(prisma: PrismaClient): DraftAnalysisModule {
    if (!DraftAnalysisModule.instance) {
      DraftAnalysisModule.instance = new DraftAnalysisModule(prisma);
    }
    return DraftAnalysisModule.instance;
  }

  public getRouter(): Router {
    const routes = new DraftAnalysisRoutes(
      this.draftAnalysisController,
      this.liveDraftTrackerController
    );
    return routes.getRouter();
  }

  public getControllers() {
    return {
      draftAnalysisController: this.draftAnalysisController,
      liveDraftTrackerController: this.liveDraftTrackerController
    };
  }

  public getUseCases() {
    return {
      analyzeTeamDraftPattern: this.analyzeTeamDraftPatternUseCase,
      predictDraftSelection: this.predictDraftSelectionUseCase,
      gradeDraftPick: this.gradeDraftPickUseCase,
      trackLiveDraftPick: this.trackLiveDraftPickUseCase,
      generateDraftReport: this.generateDraftReportUseCase
    };
  }
}

export = DraftAnalysisModule;