import { IDraftDayScorecardRepository } from '../../domain/repositories/IDraftDayScorecardRepository';
import { DraftEventResponseDto } from '../dtos/DraftDayScorecardDtos';
import { mapDraftEventToDto } from '../mappers/DraftDayScorecardMapper';

export class ListDraftEventsUseCase {
  public constructor(
    private readonly repository: IDraftDayScorecardRepository,
  ) {}

  public async execute(): Promise<DraftEventResponseDto[]> {
    const events = await this.repository.listEvents();
    return events.map(mapDraftEventToDto);
  }
}