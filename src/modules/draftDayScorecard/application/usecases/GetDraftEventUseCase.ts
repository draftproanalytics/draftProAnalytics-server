import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import { DraftEventResponseDto } from '../dtos/DraftDayScorecardDtos';
import { mapDraftEventToDto } from '../mappers/DraftDayScorecardMapper';

export class GetDraftEventUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(draftEventId: number): Promise<DraftEventResponseDto | null> {
    const event = await this.repository.getEventById(draftEventId);
    return event === null ? null : mapDraftEventToDto(event);
  }
}