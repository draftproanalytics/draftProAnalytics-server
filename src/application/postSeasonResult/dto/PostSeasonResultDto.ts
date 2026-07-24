// src/application/postSeasonResult/dto/PostSeasonResultDto.ts
import { z } from 'zod';

export const CreatePostSeasonResultDtoSchema = z.object({
  playoffYear: z.number().min(1990, 'Playoff year must be at least 1990').max(2030, 'Playoff year cannot exceed 2030').optional(),
  lastRoundReached: z.string().max(45, 'Last round reached cannot exceed 45 characters').optional(),
  winLose: z.string().length(1, 'Win/Lose must be a single character').regex(/^[WLwl]$/, 'Win/Lose must be W or L').optional(),
  opponentScore: z.number().min(0, 'Opponent score cannot be negative').optional(),
  teamScore: z.number().min(0, 'Team score cannot be negative').optional(),
  teamId: z.number().positive('Team ID must be positive').optional(),
});

export const UpdatePostSeasonResultDtoSchema = CreatePostSeasonResultDtoSchema.partial();

export const PostSeasonResultFiltersDtoSchema = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  playoffYear: z.coerce.number().int().min(1990).max(2030).optional(),
  lastRoundReached: z.string().max(45).optional(),
  winLose: z.string().length(1).regex(/^[WLwl]$/).optional(),
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreatePostSeasonResultDto = z.infer<typeof CreatePostSeasonResultDtoSchema>;
export type UpdatePostSeasonResultDto = z.infer<typeof UpdatePostSeasonResultDtoSchema>;
export type PostSeasonResultFiltersDto = z.infer<typeof PostSeasonResultFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;

export interface PostSeasonResultResponseDto {
  id: number;
  playoffYear?: number;
  lastRoundReached?: string;
  winLose?: string;
  opponentScore?: number;
  teamScore?: number;
  teamId?: number;
  scoreDifferential?: number;
  isWin: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Computed fields
  gameResult?: string; // "Won 24-17" or "Lost 14-21"
  playoffRound?: string; // Formatted round name
  // Team relationship
  team?: {
    id: number;
    name: string;         // ✅ Required field
    city?: string;        // ✅ Optional field
    state?: string;       // ✅ Optional field
    stadium?: string;     // ✅ Added stadium field
    conference?: string;  // ✅ Optional field
    division?: string;    // ✅ Optional field
    scheduleId?: number;  // ✅ FIXED: Added missing scheduleId field
    fullName?: string;    // ✅ Computed field
  };
}

// Additional specialized DTOs
export const TeamPlayoffHistoryQuerySchema = z.object({
  teamId: z.number().positive('Team ID is required'),
  year: z.number().min(1990).max(2030).optional(),
});

export const PlayoffYearQuerySchema = z.object({
  year: z.number().min(1990, 'Year must be at least 1990').max(2030, 'Year cannot exceed 2030'),
});

export type TeamPlayoffHistoryQuery = z.infer<typeof TeamPlayoffHistoryQuerySchema>;
export type PlayoffYearQuery = z.infer<typeof PlayoffYearQuerySchema>;