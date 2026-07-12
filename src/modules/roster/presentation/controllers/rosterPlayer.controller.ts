// src/modules/roster/presentation/controllers/rosterPlayer.controller.ts

import { Request, Response, NextFunction } from 'express'
import { CreateRosterPlayerUseCase } from '../../application/use-cases/CreateRosterPlayer.usecase'
import { UpdateRosterPlayerUseCase } from '../../application/use-cases/UpdateRosterPlayer.usecase'
import { GetRosterPlayerUseCase } from '../../application/use-cases/GetRosterPlayer.usecase'
import { GetTeamRosterUseCase } from '../../application/use-cases/GetTeamRoster.usecase'
import { GetTeamStartersUseCase } from '../../application/use-cases/GetTeamStarters.usecase'
import { GetRosterByPositionGroupUseCase } from '../../application/use-cases/GetRosterByPositionGroup.usecase'
import { DeleteRosterPlayerUseCase } from '../../application/use-cases/DeleteRosterPlayer.usecase'
import { GetAllRosterPlayersUseCase } from '../../application/use-cases/GetAllRosterPlayers.usecase'
import { 
  CreateRosterPlayerDto, 
  UpdateRosterPlayerDto,
  RosterPlayerResponseDto 
} from '../../application/dto/rosterPlayer.dto'

export class RosterPlayerController {
  constructor(
    private readonly createUseCase: CreateRosterPlayerUseCase,
    private readonly updateUseCase: UpdateRosterPlayerUseCase,
    private readonly getUseCase: GetRosterPlayerUseCase,
    private readonly getTeamRosterUseCase: GetTeamRosterUseCase,
    private readonly getTeamStartersUseCase: GetTeamStartersUseCase,
    private readonly getByPositionGroupUseCase: GetRosterByPositionGroupUseCase,
    private readonly deleteUseCase: DeleteRosterPlayerUseCase,
    private readonly getAllUseCase: GetAllRosterPlayersUseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateRosterPlayerDto = req.body

      const rosterPlayer = await this.createUseCase.execute(dto)
      
      const response: RosterPlayerResponseDto = {
        id: rosterPlayer.id,
        teamId: rosterPlayer.teamId,
        playerId: rosterPlayer.playerId,
        playerName: rosterPlayer.playerName,
        position: rosterPlayer.position,
        positionGroup: rosterPlayer.positionGroup,
        depthChartOrder: rosterPlayer.depthChartOrder,
        age: rosterPlayer.age,
        yearsExperience: rosterPlayer.yearsExperience,
        performanceGrade: rosterPlayer.performanceGrade,
        isStarter: rosterPlayer.isStarter,
        contractYearsRemaining: rosterPlayer.contractYearsRemaining,
        injuryStatus: rosterPlayer.injuryStatus,
        notes: rosterPlayer.notes,
        createdAt: rosterPlayer.createdAt.toISOString(),
        updatedAt: rosterPlayer.updatedAt.toISOString(),
      }

      res.status(201).json(response)
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const dto: UpdateRosterPlayerDto = req.body

      const rosterPlayer = await this.updateUseCase.execute(id, dto)
      
      const response: RosterPlayerResponseDto = {
        id: rosterPlayer.id,
        teamId: rosterPlayer.teamId,
        playerId: rosterPlayer.playerId,
        playerName: rosterPlayer.playerName,
        position: rosterPlayer.position,
        positionGroup: rosterPlayer.positionGroup,
        depthChartOrder: rosterPlayer.depthChartOrder,
        age: rosterPlayer.age,
        yearsExperience: rosterPlayer.yearsExperience,
        performanceGrade: rosterPlayer.performanceGrade,
        isStarter: rosterPlayer.isStarter,
        contractYearsRemaining: rosterPlayer.contractYearsRemaining,
        injuryStatus: rosterPlayer.injuryStatus,
        notes: rosterPlayer.notes,
        createdAt: rosterPlayer.createdAt.toISOString(),
        updatedAt: rosterPlayer.updatedAt.toISOString(),
      }

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const rosterPlayer = await this.getUseCase.execute(id)
      
      if (!rosterPlayer) {
        res.status(404).json({ message: 'RosterPlayer not found' })
        return
      }

      const response: RosterPlayerResponseDto = {
        id: rosterPlayer.id,
        teamId: rosterPlayer.teamId,
        playerId: rosterPlayer.playerId,
        playerName: rosterPlayer.playerName,
        position: rosterPlayer.position,
        positionGroup: rosterPlayer.positionGroup,
        depthChartOrder: rosterPlayer.depthChartOrder,
        age: rosterPlayer.age,
        yearsExperience: rosterPlayer.yearsExperience,
        performanceGrade: rosterPlayer.performanceGrade,
        isStarter: rosterPlayer.isStarter,
        contractYearsRemaining: rosterPlayer.contractYearsRemaining,
        injuryStatus: rosterPlayer.injuryStatus,
        notes: rosterPlayer.notes,
        createdAt: rosterPlayer.createdAt.toISOString(),
        updatedAt: rosterPlayer.updatedAt.toISOString(),
      }

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rosterPlayers = await this.getAllUseCase.execute()
      
      const response = rosterPlayers.map(rp => ({
        id: rp.id,
        teamId: rp.teamId,
        playerName: rp.playerName,
        position: rp.position,
        positionGroup: rp.positionGroup,
        depthChartOrder: rp.depthChartOrder,
        age: rp.age,
        yearsExperience: rp.yearsExperience,
        performanceGrade: rp.performanceGrade,
        isStarter: rp.isStarter,
        injuryStatus: rp.injuryStatus,
      }))

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async getByTeamId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = parseInt(req.params.teamId)

      if (isNaN(teamId)) {
        res.status(400).json({ message: 'Invalid teamId' })
        return
      }

      const rosterPlayers = await this.getTeamRosterUseCase.execute(teamId)
      
      const response = rosterPlayers.map(rp => ({
        id: rp.id,
        teamId: rp.teamId,
        playerName: rp.playerName,
        position: rp.position,
        positionGroup: rp.positionGroup,
        depthChartOrder: rp.depthChartOrder,
        age: rp.age,
        yearsExperience: rp.yearsExperience,
        performanceGrade: rp.performanceGrade,
        isStarter: rp.isStarter,
        injuryStatus: rp.injuryStatus,
      }))

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async getTeamStarters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = parseInt(req.params.teamId)

      if (isNaN(teamId)) {
        res.status(400).json({ message: 'Invalid teamId' })
        return
      }

      const starters = await this.getTeamStartersUseCase.execute(teamId)
      
      const response = starters.map(rp => ({
        id: rp.id,
        teamId: rp.teamId,
        playerName: rp.playerName,
        position: rp.position,
        positionGroup: rp.positionGroup,
        depthChartOrder: rp.depthChartOrder,
        age: rp.age,
        yearsExperience: rp.yearsExperience,
        performanceGrade: rp.performanceGrade,
        isStarter: rp.isStarter,
        injuryStatus: rp.injuryStatus,
      }))

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async getByPositionGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teamId = parseInt(req.params.teamId)
      const { positionGroup } = req.params

      if (isNaN(teamId)) {
        res.status(400).json({ message: 'Invalid teamId' })
        return
      }

      const rosterPlayers = await this.getByPositionGroupUseCase.execute(teamId, positionGroup)
      
      const response = rosterPlayers.map(rp => ({
        id: rp.id,
        teamId: rp.teamId,
        playerName: rp.playerName,
        position: rp.position,
        positionGroup: rp.positionGroup,
        depthChartOrder: rp.depthChartOrder,
        age: rp.age,
        yearsExperience: rp.yearsExperience,
        performanceGrade: rp.performanceGrade,
        isStarter: rp.isStarter,
        injuryStatus: rp.injuryStatus,
      }))

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await this.deleteUseCase.execute(id)

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}