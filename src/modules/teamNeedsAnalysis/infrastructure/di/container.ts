// src/modules/teamNeedsAnalysis/infrastructure/di/container.ts

import { PrismaClient } from '@prisma/client';
import { RosterAnalyzerService } from '../../domain/services/RosterAnalyzer.service';
import { InMemoryTeamNeedsAnalysisRepository } from '../repositories/InMemoryTeamNeedsAnalysisRepository';
import { PrismaRosterRepository } from '../repositories/PrismaRosterRepository';
import { TeamNeedsAnalysisService } from '../../application/services/TeamNeedsAnalysisService';
import { TeamNeedsAnalysisController } from '../..';

/**
 * Manual Dependency Injection Container
 * 
 * This container manages the creation and lifecycle of dependencies
 * without relying on external DI frameworks like tsyringe.
 */
export class TeamNeedsAnalysisContainer {
  private static instance: TeamNeedsAnalysisContainer;

  // Singleton instances
  private _prismaClient?: PrismaClient;
  private _rosterAnalyzer?: RosterAnalyzerService;
  private _analysisRepository?: InMemoryTeamNeedsAnalysisRepository;
  private _rosterRepository?: PrismaRosterRepository;
  private _analysisService?: TeamNeedsAnalysisService;
  private _controller?: TeamNeedsAnalysisController;

  private constructor() {}

  static getInstance(): TeamNeedsAnalysisContainer {
    if (!TeamNeedsAnalysisContainer.instance) {
      TeamNeedsAnalysisContainer.instance = new TeamNeedsAnalysisContainer();
    }
    return TeamNeedsAnalysisContainer.instance;
  }

  // Prisma Client (shared across app)
  setPrismaClient(client: PrismaClient): void {
    this._prismaClient = client;
  }

  private getPrismaClient(): PrismaClient {
    if (!this._prismaClient) {
      throw new Error('PrismaClient not initialized. Call setPrismaClient first.');
    }
    return this._prismaClient;
  }

  // Domain Services
  getRosterAnalyzer(): RosterAnalyzerService {
    if (!this._rosterAnalyzer) {
      this._rosterAnalyzer = new RosterAnalyzerService();
    }
    return this._rosterAnalyzer;
  }

  // Repositories
  getAnalysisRepository(): InMemoryTeamNeedsAnalysisRepository {
    if (!this._analysisRepository) {
      this._analysisRepository = new InMemoryTeamNeedsAnalysisRepository();
    }
    return this._analysisRepository;
  }

  getRosterRepository(): PrismaRosterRepository {
    if (!this._rosterRepository) {
      this._rosterRepository = new PrismaRosterRepository(this.getPrismaClient());
    }
    return this._rosterRepository;
  }

  // Application Services
  getAnalysisService(): TeamNeedsAnalysisService {
    if (!this._analysisService) {
      this._analysisService = new TeamNeedsAnalysisService(
        this.getAnalysisRepository(),
        this.getRosterRepository(),
        this.getRosterAnalyzer()
      );
    }
    return this._analysisService;
  }

  // Controllers
  getController(): TeamNeedsAnalysisController {
    if (!this._controller) {
      this._controller = new TeamNeedsAnalysisController(this.getAnalysisService());
    }
    return this._controller;
  }

  // Reset (useful for testing)
  reset(): void {
    this._rosterAnalyzer = undefined;
    this._analysisRepository = undefined;
    this._rosterRepository = undefined;
    this._analysisService = undefined;
    this._controller = undefined;
  }
}

// Export singleton instance getter
export const getContainer = () => TeamNeedsAnalysisContainer.getInstance();