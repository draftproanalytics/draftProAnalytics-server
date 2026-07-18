// DTO Schemas
// src/application/game/dto/GameDto.ts
import { z } from 'zod';

export const CreateGameDtoSchema = z.object({
  seasonYear: z.string().regex(/^\d{4}$/, 'Season year must be a 4-digit year'),
  gameWeek: z.coerce.number().min(0, 'Game week must be at least 1 WHEN NOT PRESEASON').max(20, 'Game week cannot exceed 20').optional(),
  seasonType: z.coerce.number().int().min(1).max(3),
  gameDate: z.string().transform((str) => new Date(str)).optional(),
  homeTeamId: z.coerce.number().positive('Home team ID is required'),
  awayTeamId: z.coerce.number().positive('Away team ID is required'),
  gameLocation: z.string().max(255, 'Game location cannot exceed 255 characters').optional(),
  gameCity: z.string().max(100, 'Game city cannot exceed 100 characters').optional(),
  gameStateProvince: z.string().max(100, 'State/Province cannot exceed 100 characters').optional(),
  gameCountry: z.string().max(50, 'Country cannot exceed 50 characters').default('USA').optional(),
  homeScore: z.coerce.number().min(0, 'Home score cannot be negative').optional(),
  awayScore: z.coerce.number().min(0, 'Away score cannot be negative').optional(),
  gameStatus: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']).default('scheduled').optional(),
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: 'Home team and away team cannot be the same',
  path: ['awayTeamId'],
});

export const UpdateGameDtoSchema = CreateGameDtoSchema._def.schema.partial().omit({
  homeTeamId: true,
  awayTeamId: true,
  seasonYear: true,
});

export const GameFiltersDtoSchema = z.object({
  seasonYear: z.string().regex(/^\d{4}$/).optional(),
  gameWeek: z.number().min(1).max(20).optional(),
  seasonType: z.coerce.number().int().min(1).max(3).optional(),
  homeTeamId: z.number().positive().optional(),
  awayTeamId: z.number().positive().optional(),
  teamId: z.number().positive().optional(),
  gameStatus: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']).optional(),
  gameCity: z.string().optional(),
  gameCountry: z.string().optional(),
  dateFrom: z.string().transform((str) => new Date(str)).optional(),
  dateTo: z.string().transform((str) => new Date(str)).optional(),
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().optional().default(1),      // ← Add .coerce
  limit: z.coerce.number().optional().default(10),    // ← Add .coerce  
  include: z.string().optional(),    
});

export const UpdateScoreDtoSchema = z.object({
  homeScore: z.number().min(0, 'Home score cannot be negative'),
  awayScore: z.number().min(0, 'Away score cannot be negative'),
  gameStatus: z.enum(['in_progress', 'completed']).optional(),
});

export type CreateGameDto = z.infer<typeof CreateGameDtoSchema>;
export type UpdateGameDto = z.infer<typeof UpdateGameDtoSchema>;
export type GameFiltersDto = z.infer<typeof GameFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;
export type UpdateScoreDto = z.infer<typeof UpdateScoreDtoSchema>;

// ✅ NEW: Team info for responses
export interface TeamInfo {
  id: number;
  name: string;
  city?: string;
  state?: string;
  conference?: string;
  division?: string;
  stadium?: string;
}

export interface GameResponseDto {
  id: number;
  seasonYear: string;
  gameWeek?: number;
  seasonType?: number;
  gameDate?: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName?: string;
  awayTeamName?: string;
  gameLocation?: string;
  gameCity?: string;
  gameStateProvince?: string;
  gameCountry?: string;
  homeScore?: number;
  awayScore?: number;
  gameStatus?: string;
  isPlayoff?: boolean;
  playoffRound?: string;
  fullLocation?: string;
  winningTeamId?: number | null;
  isTie?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // relations
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
}

