import { JobEntity } from '../../domain/entities/Job.entity';
import { JobLogEntity } from '../../domain/entities/JobLog.entity';
import { JobStepEntity } from '../../domain/entities/JobStep.entity';
import { JobDetailDto, JobListItemDto, JobLogDto, JobStepDto } from '../dto/Job.dto';

const iso = (value: Date | null): string | null => value === null ? null : value.toISOString();

export class JobMapper {
  public static toListItem(entity: JobEntity): JobListItemDto {
    return {
      id: entity.id.toString(),
      type: entity.type,
      status: entity.status,
      progressPercent: entity.progressPercent,
      totalItems: entity.totalItems,
      processedItems: entity.processedItems,
      resultCode: entity.resultCode,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt.toISOString(),
      startedAt: iso(entity.startedAt),
      finishedAt: iso(entity.finishedAt),
    };
  }

  public static toDetail(entity: JobEntity): JobDetailDto {
    return {
      ...JobMapper.toListItem(entity),
      payload: entity.payload,
      resultJson: entity.resultJson,
      requestedByPersonId: entity.requestedByPersonId,
      cancelAt: iso(entity.cancelAt),
      cancelReason: entity.cancelReason,
      //updatedAt: entity.updatedAt.toISOString(),
    };
  }

  public static toLogDto(entity: JobLogEntity): JobLogDto {
    return {
      id: entity.id.toString(),
      jobId: entity.jobId.toString(),
      level: entity.level,
      message: entity.message,
      contextJson: entity.contextJson,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  public static toStepDto(entity: JobStepEntity): JobStepDto {
    return {
      id: entity.id.toString(),
      jobId: entity.jobId.toString(),
      stepName: entity.stepName,
      status: entity.status,
      sortOrder: entity.sortOrder,
      totalItems: entity.totalItems,
      processedItems: entity.processedItems,
      resultJson: entity.resultJson,
      errorMessage: entity.errorMessage,
      startedAt: iso(entity.startedAt),
      finishedAt: iso(entity.finishedAt),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
