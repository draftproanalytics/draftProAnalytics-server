import type { Request, Response } from 'express'
import { GetTeamNeedsPageUseCase } from '../../application/usecases/GetTeamNeedsPageUseCase'
import { UpsertTeamNeedUseCase } from '../../application/usecases/UpsertTeamNeedUseCase'
import { DeleteTeamNeedUseCase } from '../../application/usecases/DeleteTeamNeedUseCase'
import { ReviewTeamNeedUseCase } from '../../application/usecases/ReviewTeamNeedUseCase'
import type { TeamNeedSource, TeamNeedStatus } from '../../domain/dtos/TeamNeedDtos'

interface UpsertBody {
  position: string;
  priority: number;
  draftYear: number;
  needScore?: number | null;
  source?: TeamNeedSource;
  status?: TeamNeedStatus;
}

const parseRequiredYear = (value: unknown): number | null => {
  const year = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  return Number.isInteger(year) && year >= 1936 && year <= 2155 ? year : null
}

export class TeamNeedsController {
  public constructor(
    private readonly getPageUseCase: GetTeamNeedsPageUseCase,
    private readonly upsertUseCase: UpsertTeamNeedUseCase,
    private readonly deleteUseCase: DeleteTeamNeedUseCase,
    private readonly reviewUseCase: ReviewTeamNeedUseCase
  ) {}

  public getNeedsPage = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId)
    const draftYear = parseRequiredYear(req.query.draftYear)
    if (!Number.isInteger(teamId)) { res.status(400).json({ message: 'Invalid teamId' }); return }
    if (draftYear === null) { res.status(400).json({ message: 'draftYear is required' }); return }

    const evaluationYearRaw = req.query.evaluationYear
    const evaluationYear = typeof evaluationYearRaw === 'string' && evaluationYearRaw.length > 0
      ? Number(evaluationYearRaw)
      : undefined

    const dto = await this.getPageUseCase.execute({
      teamId,
      evaluationYear: Number.isInteger(evaluationYear) ? evaluationYear : undefined,
      draftYear
    })
    res.status(200).json(dto)
  }

  public upsertTeamNeed = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId)
    if (!Number.isInteger(teamId)) { res.status(400).json({ message: 'Invalid teamId' }); return }

    const body = req.body as Partial<UpsertBody>
    const draftYear = parseRequiredYear(body.draftYear)
    if (typeof body.position !== 'string') { res.status(400).json({ message: 'position is required' }); return }
    if (!Number.isInteger(body.priority)) { res.status(400).json({ message: 'priority is required' }); return }
    if (draftYear === null) { res.status(400).json({ message: 'draftYear is required' }); return }

    const saved = await this.upsertUseCase.execute({
      teamId,
      position: body.position,
      priority: body.priority as number,
      draftYear,
      needScore: body.needScore,
      source: body.source,
      status: body.status
    })
    res.status(200).json(saved)
  }


  public approveTeamNeed = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id)
    const reviewedByPersonId = typeof req.body?.reviewedByPersonId === 'number' ? req.body.reviewedByPersonId : undefined
    const saved = await this.reviewUseCase.execute(id, 'APPROVED', reviewedByPersonId)
    res.status(200).json(saved)
  }

  public rejectTeamNeed = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id)
    const reviewedByPersonId = typeof req.body?.reviewedByPersonId === 'number' ? req.body.reviewedByPersonId : undefined
    const saved = await this.reviewUseCase.execute(id, 'REJECTED', reviewedByPersonId)
    res.status(200).json(saved)
  }

  public deleteTeamNeed = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId)
    const draftYear = parseRequiredYear(req.query.draftYear)
    const position = String(req.params.position ?? '')
    if (!Number.isInteger(teamId)) { res.status(400).json({ message: 'Invalid teamId' }); return }
    if (draftYear === null) { res.status(400).json({ message: 'draftYear is required' }); return }

    await this.deleteUseCase.execute(teamId, draftYear, position)
    res.status(204).send()
  }
}
