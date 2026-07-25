// src/application/team/dto/TeamDto.ts
import { z } from 'zod';

export const CreateTeamDtoSchema = z.object({
  name: z.string()
    .min(1, 'Team name is required')
    .max(45, 'Team name cannot exceed 45 characters')
    .trim(),
  city: z.string()
    .max(45, 'City cannot exceed 45 characters')
    .trim()
    .optional(),
  state: z.string()
    .max(45, 'State cannot exceed 45 characters')
    .trim()
    .optional(),
  conference: z.string()
    .max(45, 'Conference cannot exceed 45 characters')
    .trim()
    .optional(),
  division: z.string()
    .max(45, 'Division cannot exceed 45 characters')
    .trim()
    .optional(),
  stadium: z.string()
    .max(75, 'Stadium name cannot exceed 75 characters')
    .trim()
    .optional(),
  scheduleId: z.number()
    .positive('Schedule ID must be positive')
    .optional(),
});

export const UpdateTeamDtoSchema = CreateTeamDtoSchema.partial().extend({
  name: z.string()
    .min(1, 'Team name is required')
    .max(45, 'Team name cannot exceed 45 characters')
    .trim()
    .optional(), // Allow partial updates
});

export const TeamFiltersDtoSchema = z.object({
  name: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  conference: z.string().trim().optional(),
  division: z.string().trim().optional(),
  stadium: z.string().trim().optional(),
  scheduleId: z.coerce.number().optional(), // ← CHANGED: was z.number().optional()
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),      // ← CHANGED: was z.number().min(1).optional().default(1)
  limit: z.coerce.number().min(1).max(100).optional().default(10), // ← CHANGED: was z.number().min(1).max(100).optional().default(10)
  sortField: z.enum(['name', 'city', 'state', 'conference', 'division', 'stadium'])
    .optional()
    .default('name'),
  sortOrder: z.coerce.number()
    .refine((value) => value === 1 || value === -1, 'sortOrder must be 1 or -1')
    .transform((value): 1 | -1 => value as 1 | -1)
    .optional()
    .default(1),
});

export type CreateTeamDto = z.infer<typeof CreateTeamDtoSchema>;
export type UpdateTeamDto = z.infer<typeof UpdateTeamDtoSchema>;
export type TeamFiltersDto = z.infer<typeof TeamFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;

export interface TeamResponseDto {
  id: number;
  name: string;
  city?: string;
  state?: string;
  conference?: string;
  division?: string;
  stadium?: string;
  scheduleId?: number;
  location?: string;         // Computed field
  fullName?: string;         // Computed field
}

export interface TeamStatsResponseDto {
  totalTeams: number;
  conferenceBreakdown: { conference: string; count: number }[];
  divisionBreakdown: { division: string; count: number }[];
  teamsWithSchedules: number;
  teamsWithStadiums: number;
}