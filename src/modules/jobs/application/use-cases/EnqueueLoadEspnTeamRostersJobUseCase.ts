import type { Prisma } from '@prisma/client';
import type { LoadEspnTeamRostersPayloadDto } from '../../domain/dtos/EspnRosterImport.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueLoadEspnTeamRostersJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}

  public execute(payload: LoadEspnTeamRostersPayloadDto) {
    return this.jobs.enqueueJob({
      type: DpaJobType.LoadEspnTeamRosters,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
