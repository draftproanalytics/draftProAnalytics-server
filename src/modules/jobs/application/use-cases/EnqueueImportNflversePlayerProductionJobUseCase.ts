import type { Prisma } from '@prisma/client';
import type { ImportNflversePlayerProductionPayloadDto } from '../../domain/dtos/NflversePlayerProduction.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
export class EnqueueImportNflversePlayerProductionJobUseCase { public constructor(private readonly jobs: IJobQueueRepository) {} public execute(payload: ImportNflversePlayerProductionPayloadDto) { return this.jobs.enqueueJob({ type: DpaJobType.ImportNflversePlayerProduction, payload: payload as unknown as Prisma.InputJsonObject, requestedByPersonId: payload.requestedByPersonId }); } }
