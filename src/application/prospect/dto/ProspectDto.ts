import { z } from 'zod';

import type { ProspectDraftStatus } from '@/domain/prospect/entities/ProspectDraftStatus';

export const ProspectDraftStatusSchema = z.enum(['PRE_DRAFT', 'DRAFTED', 'UDFA']);

export const CreateProspectDtoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(45, 'First name cannot exceed 45 characters'),
  lastName: z.string().min(1, 'Last name is required').max(45, 'Last name cannot exceed 45 characters'),
  position: z.string().min(1, 'Position is required').max(10, 'Position cannot exceed 10 characters'),
  college: z.string().min(1, 'College is required').max(75, 'College cannot exceed 75 characters'),
  homeCity: z.string().max(45, 'Home city cannot exceed 45 characters').optional(),
  homeState: z.string().max(45, 'Home state cannot exceed 45 characters').optional(),
  drafted: z.boolean().default(false),
  draftStatus: ProspectDraftStatusSchema.optional(),
  draftYear: z.number().min(1990, 'Draft year too early').max(2035, 'Draft year too far in future').optional(),
  teamId: z.number().positive().optional(),
  draftPickId: z.number().positive().optional(),
});

export const UpdateProspectDtoSchema = CreateProspectDtoSchema.partial();

export const ProspectFiltersDtoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  playerName: z.string().trim().min(1).max(100).optional(),
  position: z.string().optional(),
  college: z.string().optional(),
  homeState: z.string().optional(),
  drafted: z.union([z.string(), z.boolean()]).transform((val) => typeof val === 'string' ? val === 'true' : val).optional(),
  draftStatus: ProspectDraftStatusSchema.optional(),
  draftYear: z.coerce.number().min(1990).max(2035).optional(),
  teamId: z.coerce.number().positive().optional(),
  minHeight: z.coerce.number().positive().optional(),
  maxHeight: z.coerce.number().positive().optional(),
  minWeight: z.coerce.number().positive().optional(),
  maxWeight: z.coerce.number().positive().optional(),
  minFortyTime: z.coerce.number().positive().optional(),
  maxFortyTime: z.coerce.number().positive().optional(),
  minVerticalLeap: z.coerce.number().positive().optional(),
  maxVerticalLeap: z.coerce.number().positive().optional(),
  minBenchPress: z.coerce.number().min(0).optional(),
  maxBenchPress: z.coerce.number().min(0).optional(),
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const UpdatePersonalInfoDtoSchema = z.object({
  firstName: z.string().min(1).max(45).optional(),
  lastName: z.string().min(1).max(45).optional(),
  homeCity: z.string().max(45).optional(),
  homeState: z.string().max(45).optional(),
});

// Kept for backward API compatibility; the handler now writes CombineScore, never Prospect.
export const UpdateCombineScoresDtoSchema = z.object({
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  handSize: z.number().positive().optional(),
  armLength: z.number().positive().optional(),
  fortyTime: z.number().positive().max(10).optional(),
  tenYardSplit: z.number().positive().max(5).optional(),
  verticalLeap: z.number().positive().max(60).optional(),
  broadJump: z.number().positive().max(200).optional(),
  threeCone: z.number().positive().max(15).optional(),
  twentyYardShuttle: z.number().positive().max(10).optional(),
  benchPress: z.number().int().min(0).optional(),
});

export const MarkAsDraftedDtoSchema = z.object({
  teamId: z.number().positive('Team ID is required'),
  draftYear: z.number().min(1990).max(2035),
  draftPickId: z.number().positive().optional(),
});

export const CombineScoreFilterDtoSchema = z.object({
  minFortyTime: z.coerce.number().positive().optional(),
  maxFortyTime: z.coerce.number().positive().optional(),
  minVerticalLeap: z.coerce.number().positive().optional(),
  maxVerticalLeap: z.coerce.number().positive().optional(),
});

export type CreateProspectDto = z.infer<typeof CreateProspectDtoSchema>;
export type UpdateProspectDto = z.infer<typeof UpdateProspectDtoSchema>;
export type ProspectFiltersDto = z.infer<typeof ProspectFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;
export type UpdatePersonalInfoDto = z.infer<typeof UpdatePersonalInfoDtoSchema>;
export type UpdateCombineScoresDto = z.infer<typeof UpdateCombineScoresDtoSchema>;
export type MarkAsDraftedDto = z.infer<typeof MarkAsDraftedDtoSchema>;
export type CombineScoreFilterDto = z.infer<typeof CombineScoreFilterDtoSchema>;

export interface ProspectResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  college: string;
  homeCity?: string;
  homeState?: string;
  drafted: boolean;
  draftStatus: ProspectDraftStatus;
  draftYear?: number | null;
  teamId?: number;
  draftPickId?: number;
  hasCompleteCombineScores: boolean;
  athleteScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProspectStatsDto {
  totalProspects: number;
  draftedCount: number;
  undraftedCount: number;
  udfaCount: number;
  positionBreakdown: { position: string; count: number }[];
  collegeBreakdown: { college: string; count: number }[];
  averageHeight?: number;
  averageWeight?: number;
  averageFortyTime?: number;
  averageVerticalLeap?: number;
  averageBenchPress?: number;
}

export interface TopAthletesResponseDto {
  prospects: ProspectResponseDto[];
  limit: number;
  criteria: string;
}
