import { Job, JobLog, JobStep } from '@prisma/client';
import { JobEntity } from '../../domain/entities/Job.entity';
import { JobLogEntity } from '../../domain/entities/JobLog.entity';
import { JobStepEntity } from '../../domain/entities/JobStep.entity';
import { JobLogLevel } from '../../domain/enums/JobLogLevel.enum';
import { JobStatus } from '../../domain/enums/JobStatus.enum';
import { JobStepStatus } from '../../domain/enums/JobStepStatus.enum';
import { JsonValue } from '../../domain/types/JsonValue';

export class PrismaJobMapper {
  public static toJobEntity(row: Job): JobEntity {
    return {
      id: row.id,
      type: row.type,
      status: row.status as JobStatus,
      payload: row.payload as JsonValue | null,
      resultJson: row.resultJson as JsonValue | null,
      resultCode: row.resultCode,
      errorMessage: row.errorMessage,
      progressPercent: row.progressPercent,
      totalItems: row.totalItems,
      processedItems: row.processedItems,
      requestedByPersonId: row.requestedByPersonId,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      cancelAt: row.cancelAt,
      cancelReason: row.cancelReason,
      //updatedAt: row.updatedAt,
    };
  }

  public static toLogEntity(row: JobLog): JobLogEntity {
    return {
      id: row.id,
      jobId: row.jobId,
      level: row.level as JobLogLevel,
      message: row.message,
      contextJson: row.contextJson as JsonValue | null,
      createdAt: row.createdAt,
    };
  }

  public static toStepEntity(row: JobStep): JobStepEntity {
    return {
      id: row.id,
      jobId: row.jobId,
      stepName: row.stepName,
      status: row.status as JobStepStatus,
      sortOrder: row.sortOrder,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      totalItems: row.totalItems,
      processedItems: row.processedItems,
      resultJson: row.resultJson as JsonValue | null,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
