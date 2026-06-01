import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { CreateDraftEventUseCase } from '../../application/usecases/CreateDraftEventUseCase';
import { ListDraftEventsUseCase } from '../../application/usecases/ListDraftEventsUseCase';
import { GetDraftEventUseCase } from '../../application/usecases/GetDraftEventUseCase';
import { GetEventScorecardUseCase } from '../../application/usecases/GetEventScorecardUseCase';
import { GetTeamDraftScorecardUseCase } from '../../application/usecases/GetTeamDraftScorecardUseCase';
import { SeedDraftPicksUseCase } from '../../application/usecases/SeedDraftPicksUseCase';
import { UpdateDraftPickUseCase } from '../../application/usecases/UpdateDraftPickUseCase';
import { MarkDraftPickOnClockUseCase } from '../../application/usecases/MarkDraftPickOnClockUseCase';
import { CompleteDraftPickUseCase } from '../../application/usecases/CompleteDraftPickUseCase';
import { PrismaDraftDayScorecardRepository } from '../../infrastructure/repositories/PrismaDraftDayScorecardRepository';
import {
  CompleteDraftPickRequestDto,
  CreateDraftEventRequestDto,
  SeedDraftPicksRequestDto,
  UpdateDraftPickRequestDto,
} from '../../application/dtos/DraftDayScorecardDtos';

interface RequestUserIdentity {
  personId?: number;
  id?: number;
  activeRid?: number;
}

export class DraftDayScorecardController {
  private readonly createDraftEventUseCase: CreateDraftEventUseCase;
  private readonly listDraftEventsUseCase: ListDraftEventsUseCase;
  private readonly getDraftEventUseCase: GetDraftEventUseCase;
  private readonly getEventScorecardUseCase: GetEventScorecardUseCase;
  private readonly getTeamDraftScorecardUseCase: GetTeamDraftScorecardUseCase;
  private readonly seedDraftPicksUseCase: SeedDraftPicksUseCase;
  private readonly updateDraftPickUseCase: UpdateDraftPickUseCase;
  private readonly markDraftPickOnClockUseCase: MarkDraftPickOnClockUseCase;
  private readonly completeDraftPickUseCase: CompleteDraftPickUseCase;

  public constructor(prisma: PrismaClient) {
    const repository = new PrismaDraftDayScorecardRepository(prisma);

    this.createDraftEventUseCase = new CreateDraftEventUseCase(repository);
    this.listDraftEventsUseCase = new ListDraftEventsUseCase(repository);
    this.getDraftEventUseCase = new GetDraftEventUseCase(repository);
    this.getEventScorecardUseCase = new GetEventScorecardUseCase(repository);
    this.getTeamDraftScorecardUseCase = new GetTeamDraftScorecardUseCase(repository);
    this.seedDraftPicksUseCase = new SeedDraftPicksUseCase(repository);
    this.updateDraftPickUseCase = new UpdateDraftPickUseCase(repository);
    this.markDraftPickOnClockUseCase = new MarkDraftPickOnClockUseCase(repository);
    this.completeDraftPickUseCase = new CompleteDraftPickUseCase(repository);
  }

  public createEvent = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const body = req.body as CreateDraftEventRequestDto;

    if (!Number.isInteger(body.draftYear)) {
      res.status(400).json({ message: 'draftYear is required.' });
      return;
    }

    const result = await this.createDraftEventUseCase.execute(body);
    res.status(201).json(result);
  };

  public listEvents = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.listDraftEventsUseCase.execute();
    res.status(200).json(result);
  };

  public getEvent = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftEventId = this.parsePositiveInt(req.params.draftEventId);

    if (draftEventId === null) {
      res.status(400).json({ message: 'Invalid draftEventId.' });
      return;
    }

    const result = await this.getDraftEventUseCase.execute(draftEventId);

    if (result === null) {
      res.status(404).json({ message: 'Draft event not found.' });
      return;
    }

    res.status(200).json(result);
  };

  public getEventScorecard = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftEventId = this.parsePositiveInt(req.params.draftEventId);

    if (draftEventId === null) {
      res.status(400).json({ message: 'Invalid draftEventId.' });
      return;
    }

    const result = await this.getEventScorecardUseCase.execute(draftEventId);

    if (result === null) {
      res.status(404).json({ message: 'Draft event not found.' });
      return;
    }

    res.status(200).json(result);
  };

  public getTeamScorecard = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftEventId = this.parsePositiveInt(req.params.draftEventId);
    const teamId = this.parsePositiveInt(req.params.teamId);

    if (draftEventId === null || teamId === null) {
      res.status(400).json({ message: 'Invalid draftEventId or teamId.' });
      return;
    }

    const result = await this.getTeamDraftScorecardUseCase.execute(
      draftEventId,
      teamId,
    );

    if (result === null) {
      res.status(404).json({ message: 'Draft event not found.' });
      return;
    }

    res.status(200).json(result);
  };

  public seedPicks = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftEventId = this.parsePositiveInt(req.params.draftEventId);
    const body = req.body as SeedDraftPicksRequestDto;

    if (draftEventId === null) {
      res.status(400).json({ message: 'Invalid draftEventId.' });
      return;
    }

    if (!Array.isArray(body.picks)) {
      res.status(400).json({ message: 'picks array is required.' });
      return;
    }

    const result = await this.seedDraftPicksUseCase.execute(
      draftEventId,
      body,
      this.getPersonId(req),
    );

    res.status(200).json(result);
  };

  public updatePick = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftPickId = this.parsePositiveInt(req.params.draftPickId);
    const body = req.body as UpdateDraftPickRequestDto;

    if (draftPickId === null) {
      res.status(400).json({ message: 'Invalid draftPickId.' });
      return;
    }

    const result = await this.updateDraftPickUseCase.execute(
      draftPickId,
      body,
      this.getPersonId(req),
    );

    res.status(200).json(result);
  };

  public markOnClock = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftPickId = this.parsePositiveInt(req.params.draftPickId);

    if (draftPickId === null) {
      res.status(400).json({ message: 'Invalid draftPickId.' });
      return;
    }

    const result = await this.markDraftPickOnClockUseCase.execute(
      draftPickId,
      this.getPersonId(req),
    );

    res.status(200).json(result);
  };

  public completePick = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const draftPickId = this.parsePositiveInt(req.params.draftPickId);
    const body = req.body as CompleteDraftPickRequestDto;

    if (draftPickId === null) {
      res.status(400).json({ message: 'Invalid draftPickId.' });
      return;
    }

    const result = await this.completeDraftPickUseCase.execute(
      draftPickId,
      body,
      this.getPersonId(req),
    );

    res.status(200).json(result);
  };

  private parsePositiveInt(value: string | undefined): number | null {
    if (value === undefined) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private getPersonId(req: Request): number | null {
    const user = req.user as RequestUserIdentity | undefined;

    if (user === undefined) {
      return null;
    }

    if (typeof user.personId === 'number') {
      return user.personId;
    }

    if (typeof user.id === 'number') {
      return user.id;
    }

    return null;
  }
}