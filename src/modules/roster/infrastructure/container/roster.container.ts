// src/modules/roster/infrastructure/container/roster.container.ts

import { PrismaClient } from '@prisma/client'
import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { PrismaRosterPlayerRepository } from '../repositories/PrismaRosterPlayerRepository'
import { RosterPlayerDomainService } from '../../domain/services/RosterPlayerDomainService'
import { RosterAnalysisService } from '../../application/services/RosterAnalysisService'
import { ESPNPlayerService } from '../external/ESPNPlayerService'
import { CreateRosterPlayerUseCase } from '../../application/use-cases/CreateRosterPlayer.usecase'
import { UpdateRosterPlayerUseCase } from '../../application/use-cases/UpdateRosterPlayer.usecase'
import { GetRosterPlayerUseCase } from '../../application/use-cases/GetRosterPlayer.usecase'
import { GetTeamRosterUseCase } from '../../application/use-cases/GetTeamRoster.usecase'
import { GetTeamStartersUseCase } from '../../application/use-cases/GetTeamStarters.usecase'
import { GetRosterByPositionGroupUseCase } from '../../application/use-cases/GetRosterByPositionGroup.usecase'
import { DeleteRosterPlayerUseCase } from '../../application/use-cases/DeleteRosterPlayer.usecase'
import { GetAllRosterPlayersUseCase } from '../../application/use-cases/GetAllRosterPlayers.usecase'
import { RosterPlayerController } from '../../presentation/controllers/rosterPlayer.controller'

/**
 * Roster Module Dependency Injection Container
 * Manages the creation and lifecycle of roster module dependencies
 */
export class RosterContainer {
  private static instance: RosterContainer | null = null
  
  // Infrastructure
  private _rosterPlayerRepository: IRosterPlayerRepository
  private _espnPlayerService: ESPNPlayerService
  
  // Domain Services
  private _rosterPlayerDomainService: RosterPlayerDomainService
  
  // Application Services
  private _rosterAnalysisService: RosterAnalysisService
  
  // Use Cases
  private _createRosterPlayerUseCase: CreateRosterPlayerUseCase
  private _updateRosterPlayerUseCase: UpdateRosterPlayerUseCase
  private _getRosterPlayerUseCase: GetRosterPlayerUseCase
  private _getTeamRosterUseCase: GetTeamRosterUseCase
  private _getTeamStartersUseCase: GetTeamStartersUseCase
  private _getRosterByPositionGroupUseCase: GetRosterByPositionGroupUseCase
  private _deleteRosterPlayerUseCase: DeleteRosterPlayerUseCase
  private _getAllRosterPlayersUseCase: GetAllRosterPlayersUseCase
  
  // Presentation
  private _rosterPlayerController: RosterPlayerController

  private constructor(prisma: PrismaClient, espnApiBaseUrl?: string) {
    // Infrastructure Layer
    this._rosterPlayerRepository = new PrismaRosterPlayerRepository(prisma)
    this._espnPlayerService = new ESPNPlayerService(espnApiBaseUrl)

    // Domain Services
    this._rosterPlayerDomainService = new RosterPlayerDomainService(
      this._rosterPlayerRepository
    )

    // Application Services
    this._rosterAnalysisService = new RosterAnalysisService(
      this._rosterPlayerRepository,
      this._rosterPlayerDomainService
    )

    // Use Cases
    this._createRosterPlayerUseCase = new CreateRosterPlayerUseCase(
      this._rosterPlayerRepository
    )
    this._updateRosterPlayerUseCase = new UpdateRosterPlayerUseCase(
      this._rosterPlayerRepository
    )
    this._getRosterPlayerUseCase = new GetRosterPlayerUseCase(
      this._rosterPlayerRepository
    )
    this._getTeamRosterUseCase = new GetTeamRosterUseCase(
      this._rosterPlayerRepository
    )
    this._getTeamStartersUseCase = new GetTeamStartersUseCase(
      this._rosterPlayerRepository
    )
    this._getRosterByPositionGroupUseCase = new GetRosterByPositionGroupUseCase(
      this._rosterPlayerRepository
    )
    this._deleteRosterPlayerUseCase = new DeleteRosterPlayerUseCase(
      this._rosterPlayerRepository
    )
    this._getAllRosterPlayersUseCase = new GetAllRosterPlayersUseCase(
      this._rosterPlayerRepository
    )

    // Presentation Layer
    this._rosterPlayerController = new RosterPlayerController(
      this._createRosterPlayerUseCase,
      this._updateRosterPlayerUseCase,
      this._getRosterPlayerUseCase,
      this._getTeamRosterUseCase,
      this._getTeamStartersUseCase,
      this._getRosterByPositionGroupUseCase,
      this._deleteRosterPlayerUseCase,
      this._getAllRosterPlayersUseCase
    )
  }

  /**
   * Initialize the roster module container
   * Call this once during application startup
   * 
   * @param prisma - PrismaClient instance
   * @param espnApiBaseUrl - Optional ESPN API base URL (defaults to production)
   */
  static initialize(prisma: PrismaClient, espnApiBaseUrl?: string): void {
    if (RosterContainer.instance) {
      throw new Error('RosterContainer is already initialized')
    }
    RosterContainer.instance = new RosterContainer(prisma, espnApiBaseUrl)
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RosterContainer {
    if (!RosterContainer.instance) {
      throw new Error('RosterContainer is not initialized. Call initialize() first.')
    }
    return RosterContainer.instance
  }

  /**
   * Reset the container (useful for testing)
   */
  static reset(): void {
    RosterContainer.instance = null
  }

  // Repository Getters
  get rosterPlayerRepository(): IRosterPlayerRepository {
    return this._rosterPlayerRepository
  }

  // External Service Getters
  get espnPlayerService(): ESPNPlayerService {
    return this._espnPlayerService
  }

  // Domain Service Getters
  get rosterPlayerDomainService(): RosterPlayerDomainService {
    return this._rosterPlayerDomainService
  }

  // Application Service Getters
  get rosterAnalysisService(): RosterAnalysisService {
    return this._rosterAnalysisService
  }

  // Use Case Getters
  get createRosterPlayerUseCase(): CreateRosterPlayerUseCase {
    return this._createRosterPlayerUseCase
  }

  get updateRosterPlayerUseCase(): UpdateRosterPlayerUseCase {
    return this._updateRosterPlayerUseCase
  }

  get getRosterPlayerUseCase(): GetRosterPlayerUseCase {
    return this._getRosterPlayerUseCase
  }

  get getTeamRosterUseCase(): GetTeamRosterUseCase {
    return this._getTeamRosterUseCase
  }

  get getTeamStartersUseCase(): GetTeamStartersUseCase {
    return this._getTeamStartersUseCase
  }

  get getRosterByPositionGroupUseCase(): GetRosterByPositionGroupUseCase {
    return this._getRosterByPositionGroupUseCase
  }

  get deleteRosterPlayerUseCase(): DeleteRosterPlayerUseCase {
    return this._deleteRosterPlayerUseCase
  }

  get getAllRosterPlayersUseCase(): GetAllRosterPlayersUseCase {
    return this._getAllRosterPlayersUseCase
  }

  // Controller Getter
  get rosterPlayerController(): RosterPlayerController {
    return this._rosterPlayerController
  }
}