import { DraftEvent_status } from '@prisma/client';
import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import {
  CreateDraftEventRequestDto,
  DraftEventResponseDto,
} from '../dtos/DraftDayScorecardDtos';
import { mapDraftEventToDto } from '../mappers/DraftDayScorecardMapper';

export class CreateDraftEventUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(
    request: CreateDraftEventRequestDto,
  ): Promise<DraftEventResponseDto> {
    const league = request.league ?? 'NFL';
    const name = request.name ?? `${request.draftYear} ${league} Draft`;

    const event = await this.repository.createEvent({
      draftYear: request.draftYear,
      name,
      league,
      startsAt: request.startsAt ? new Date(request.startsAt) : null,
      status: request.status ?? DraftEvent_status.PLANNED,
    });

    return mapDraftEventToDto(event);
  }
}