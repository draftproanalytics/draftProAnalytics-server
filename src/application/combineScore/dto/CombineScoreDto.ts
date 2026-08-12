import { z } from 'zod';

const CombineScoreFieldsSchema = z.object({
  playerId: z.number().positive().optional(),
  prospectId: z.number().positive().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  handSize: z.number().positive().optional(),
  armLength: z.number().positive().optional(),
  fortyTime: z.number().positive().max(10, 'Forty time too high').optional(),
  tenYardSplit: z.number().positive().max(5, 'Ten yard split too high').optional(),
  twentyYardShuttle: z.number().positive().max(10, 'Twenty yard shuttle too high').optional(),
  threeCone: z.number().positive().max(15, 'Three cone too high').optional(),
  verticalLeap: z.number().positive().max(60, 'Vertical leap too high').optional(),
  broadJump: z.number().positive().max(200, 'Broad jump too high').optional(),
  benchPress: z.number().int().min(0, 'Bench press cannot be negative').optional(),
});

export const CreateCombineScoreDtoSchema = CombineScoreFieldsSchema.refine(
  (value) => value.playerId !== undefined || value.prospectId !== undefined,
  { message: 'Either playerId or prospectId is required' },
);

export const UpdateCombineScoreDtoSchema = CombineScoreFieldsSchema.partial();

export const CombineScoreFiltersDtoSchema = z.object({
  playerId: z.coerce.number().positive().optional(),
  prospectId: z.coerce.number().positive().optional(),
  fortyTimeMin: z.coerce.number().positive().optional(),
  fortyTimeMax: z.coerce.number().positive().max(10).optional(),
  verticalLeapMin: z.coerce.number().positive().optional(),
  verticalLeapMax: z.coerce.number().positive().max(60).optional(),
  broadJumpMin: z.coerce.number().positive().optional(),
  broadJumpMax: z.coerce.number().positive().max(200).optional(),
  hasCompleteWorkout: z.union([z.string(), z.boolean()]).transform((value) =>
    typeof value === 'string' ? value === 'true' : value
  ).optional(),
});

export const CombineScoreWorkspaceFiltersDtoSchema = z.object({
  draftYear: z.coerce.number().int().min(2000).max(2100).optional(),
  position: z.string().trim().min(1).max(10).optional(),
  college: z.string().trim().min(1).max(75).optional(),
  playerName: z.string().trim().min(1).max(100).optional(),
  combineStatus: z.enum(['MISSING', 'PARTIAL', 'COMPLETE']).optional(),
  sortField: z.enum([
    'name', 'draftYear', 'position', 'college',
    'height', 'weight', 'handSize', 'armLength',
    'fortyTime', 'tenYardSplit', 'verticalLeap', 'broadJump',
    'threeCone', 'twentyYardShuttle', 'benchPress',
  ]).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const TopPerformersDtoSchema = z.object({
  metric: z.enum(['fortyTime', 'tenYardSplit', 'twentyYardShuttle', 'threeCone', 'verticalLeap', 'broadJump', 'benchPress']),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export const AthleticScoreRangeDtoSchema = z.object({
  minScore: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().min(0).max(100),
}).refine((data) => data.minScore <= data.maxScore, {
  message: 'Min score must be less than or equal to max score',
});

export type CreateCombineScoreDto = z.infer<typeof CreateCombineScoreDtoSchema>;
export type UpdateCombineScoreDto = z.infer<typeof UpdateCombineScoreDtoSchema>;
export type CombineScoreFiltersDto = z.infer<typeof CombineScoreFiltersDtoSchema>;
export type CombineScoreWorkspaceFiltersDto = z.infer<typeof CombineScoreWorkspaceFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;
export type TopPerformersDto = z.infer<typeof TopPerformersDtoSchema>;
export type AthleticScoreRangeDto = z.infer<typeof AthleticScoreRangeDtoSchema>;

export interface CombineScoreProspectSummaryDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  college: string;
  draftYear?: number;
  draftStatus?: string;
}

export interface CombineScoreResponseDto {
  id: number;
  playerId?: number;
  prospectId?: number;
  height?: number;
  weight?: number;
  handSize?: number;
  armLength?: number;
  fortyTime?: number;
  tenYardSplit?: number;
  twentyYardShuttle?: number;
  threeCone?: number;
  verticalLeap?: number;
  broadJump?: number;
  benchPress?: number;
  overallAthleticScore: number;
  isCompleteWorkout: boolean;
  fortyTimeFormatted?: string;
  verticalLeapFormatted?: string;
  broadJumpFormatted?: string;
}

export interface CombineScoreWorkspaceItemDto {
  prospect: CombineScoreProspectSummaryDto;
  combineScore?: CombineScoreResponseDto;
  combineStatus: 'MISSING' | 'PARTIAL' | 'COMPLETE';
}
