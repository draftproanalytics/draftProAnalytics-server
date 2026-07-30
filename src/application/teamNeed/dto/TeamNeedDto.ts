// src/application/teamNeed/dto/TeamNeedDto.ts
import { z } from 'zod';

export const CreateTeamNeedDtoSchema = z.object({
  teamId: z.number().positive('Team ID is required'),
  position: z.string().min(1, 'Position is required').max(10, 'Position cannot exceed 10 characters'),
  priority: z.number().min(1, 'Priority must be at least 1').max(10, 'Priority cannot exceed 10').default(1),
  draftYear: z.number().min(2000).max(2030),
});

export const UpdateTeamNeedDtoSchema = CreateTeamNeedDtoSchema.partial();

export const TeamNeedFiltersDtoSchema = z.object({
  teamId: z.number().positive().optional(),
  position: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  draftYear: z.number().min(2000).max(2030).optional(),
});

export const PaginationDtoSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
});

export type CreateTeamNeedDto = z.infer<typeof CreateTeamNeedDtoSchema>;
export type UpdateTeamNeedDto = z.infer<typeof UpdateTeamNeedDtoSchema>;
export type TeamNeedFiltersDto = z.infer<typeof TeamNeedFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;

export interface TeamNeedResponseDto {
  id: number;
  teamId?: number;
  position?: string;
  priority?: number;
  draftYear: number;
  isHighPriority: boolean;
  isForCurrentDraft: boolean;
  createdAt?: string;
  updatedAt?: string;
}