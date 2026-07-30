// src/application/prospect/dto/ProspectDto.ts
import { z } from 'zod';

export const CreateProspectDtoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(45, 'First name cannot exceed 45 characters'),
  lastName: z.string().min(1, 'Last name is required').max(45, 'Last name cannot exceed 45 characters'),
  position: z.string().min(1, 'Position is required').max(10, 'Position cannot exceed 10 characters'),
  college: z.string().min(1, 'College is required').max(75, 'College cannot exceed 75 characters'),
  height: z.number().positive('Height is required'),
  weight: z.number().positive('Weight is required'),
  handSize: z.number().positive().optional(),
  armLength: z.number().positive().optional(),
  homeCity: z.string().max(45, 'Home city cannot exceed 45 characters').optional(),
  homeState: z.string().max(45, 'Home state cannot exceed 45 characters').optional(),
  fortyTime: z.number().positive().max(10, 'Forty time cannot exceed 10 seconds').optional(),
  tenYardSplit: z.number().positive().max(5, 'Ten yard split cannot exceed 5 seconds').optional(),
  verticalLeap: z.number().positive().max(60, 'Vertical leap cannot exceed 60 inches').optional(),
  broadJump: z.number().positive().max(200, 'Broad jump cannot exceed 200 inches').optional(),
  threeCone: z.number().positive().max(15, 'Three cone cannot exceed 15 seconds').optional(),
  twentyYardShuttle: z.number().positive().max(10, 'Twenty yard shuttle cannot exceed 10 seconds').optional(),
  benchPress: z.number().min(0, 'Bench press cannot be negative').optional(),
  drafted: z.boolean().default(false),
  draftYear: z.number().min(1990, 'Draft year too early').max(2030, 'Draft year too far in future').optional(),
  teamId: z.number().positive().optional(),
  draftPickId: z.number().positive().optional(),
});

export const UpdateProspectDtoSchema = CreateProspectDtoSchema.partial();

export const ProspectFiltersDtoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  college: z.string().optional(),
  homeState: z.string().optional(),
  drafted: z.union([z.string(), z.boolean()]).transform(val => 
    typeof val === 'string' ? val === 'true' : val
  ).optional(),
  draftYear: z.coerce.number().min(1990).max(2030).optional(),
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
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export const UpdatePersonalInfoDtoSchema = z.object({
  firstName: z.string().min(1).max(45).optional(),
  lastName: z.string().min(1).max(45).optional(),
  homeCity: z.string().max(45).optional(),
  homeState: z.string().max(45).optional(),
});

export const UpdateCombineScoresDtoSchema = z.object({
  fortyTime: z.number().positive().max(10).optional(),
  tenYardSplit: z.number().positive().max(5).optional(),
  verticalLeap: z.number().positive().max(60).optional(),
  broadJump: z.number().positive().max(200).optional(),
  threeCone: z.number().positive().max(15).optional(),
  twentyYardShuttle: z.number().positive().max(10).optional(),
  benchPress: z.number().min(0).optional(),
});

export const MarkAsDraftedDtoSchema = z.object({
  teamId: z.number().positive('Team ID is required'),
  draftYear: z.number().min(1990).max(2030),
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
  height: number;
  weight: number;
  handSize?: number;
  armLength?: number;
  homeCity?: string;
  homeState?: string;
  fortyTime?: number;
  tenYardSplit?: number;
  verticalLeap?: number;
  broadJump?: number;
  threeCone?: number;
  twentyYardShuttle?: number;
  benchPress?: number;
  drafted: boolean;
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
  positionBreakdown: { position: string; count: number }[];
  collegeBreakdown: { college: string; count: number }[];
  averageHeight: number;
  averageWeight: number;
  averageFortyTime?: number;
  averageVerticalLeap?: number;
  averageBenchPress?: number;
}

export interface TopAthletesResponseDto {
  prospects: ProspectResponseDto[];
  limit: number;
  criteria: string;
}