import { z } from 'zod';
import { JobStatus } from '../../domain/enums/JobStatus.enum';

export const jobIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Job id must be a numeric string.'),
});

export const listJobsQuerySchema = z.object({
  type: z.string().min(1).max(75).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const cancelJobBodySchema = z.object({
  cancelReason: z.string().min(3).max(255),
});
