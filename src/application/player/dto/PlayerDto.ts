// src/application/player/dto/PlayerDto.ts
import { z } from 'zod';

export const CreatePlayerDtoSchema = z.object({
  espnAthleteId: z.string().max(45, 'AthleteId cannot exceed 45 characters').optional(),
  firstName: z.string().min(1, 'First name is required').max(45, 'First name cannot exceed 45 characters'),
  lastName: z.string().min(1, 'Last name is required').max(45, 'Last name cannot exceed 45 characters'),
  age: z.number().min(18, 'Age must be at least 18').max(50, 'Age cannot exceed 50'),
  height: z.number().positive('Height must be positive').max(96, 'Height cannot exceed 96 inches').optional(),
  weight: z.number().positive('Weight must be positive').max(500, 'Weight cannot exceed 500 pounds').optional(),
  handSize: z.number().positive('Hand size must be positive').max(15, 'Hand size cannot exceed 15 inches').optional(),
  armLength: z.number().positive('Arm length must be positive').max(40, 'Arm length cannot exceed 40 inches').optional(),
  homeCity: z.string().max(45, 'Home city cannot exceed 45 characters').optional(),
  homeState: z.string().max(45, 'Home state cannot exceed 45 characters').optional(),
  university: z.string().max(75, 'University cannot exceed 75 characters').optional(),
  status: z.string().max(45, 'Status cannot exceed 45 characters').optional(),
  position: z.string().max(75, 'Position cannot exceed 75 characters').optional(),
  yearEnteredLeague: z.number().min(1950, 'Year entered league too early').max(2030, 'Year entered league too far in future').optional(),
  prospectId: z.number().positive('Prospect ID must be positive').optional(),
});

export const UpdatePlayerDtoSchema = CreatePlayerDtoSchema.partial();

export const PlayerFiltersDtoSchema = z.object({
  espnAthleteId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  university: z.string().optional(),
  status: z.string().optional(),
  homeState: z.string().optional(),
  homeCity: z.string().optional(),
  minAge: z.number().min(18).max(50).optional(),
  maxAge: z.number().min(18).max(50).optional(),
  minHeight: z.number().positive().max(96).optional(),
  maxHeight: z.number().positive().max(96).optional(),
  minWeight: z.number().positive().max(500).optional(),
  maxWeight: z.number().positive().max(500).optional(),
  yearEnteredLeague: z.number().min(1950).max(2030).optional(),
  prospectId: z.number().positive().optional(),
  search: z.string().min(1, 'Search term must be at least 1 character').optional(),
});

export const PaginationDtoSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  include: z.string().optional(),
  sortField: z.enum(['firstName', 'lastName', 'position', 'university']).optional(),
  sortOrder: z.preprocess(
    (value) => value === undefined ? undefined : Number(value),
    z.union([z.literal(1), z.literal(-1)]).optional(),
  ),
});

// DTO type exports
export type CreatePlayerDto = z.infer<typeof CreatePlayerDtoSchema>;
export type UpdatePlayerDto = z.infer<typeof UpdatePlayerDtoSchema>;
export type PlayerFiltersDto = z.infer<typeof PlayerFiltersDtoSchema>;
export type PaginationDto = z.infer<typeof PaginationDtoSchema>;

// Response DTO interface
export interface PlayerResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  height?: number;
  weight?: number;
  handSize?: number;
  armLength?: number;
  homeCity?: string;
  homeState?: string;
  homeLocation?: string;
  university?: string;
  status?: string;
  position?: string;
  yearEnteredLeague?: number;
  prospectId?: number;
  yearsInLeague?: number | null;
  isRookie?: boolean;
  isVeteran?: boolean;
  heightFormatted?: string;
  weightFormatted?: string;
  bmi?: number | null;

}

// Statistical response DTOs
export interface PlayerStatisticsDto {
  averageAge: number;
  positionCounts: Array<{ position: string; count: number }>;
  universityCounts: Array<{ university: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
}

export interface PositionStatisticsDto {
  position: string;
  averageHeight?: number;
  averageWeight?: number;
  averageAge: number;
  count: number;
}

// Validation schemas for specific endpoints
export const PlayerSearchDtoSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  position: z.string().optional(),
  university: z.string().optional(),
  status: z.string().optional(),
});

export const PlayerPhysicalRangeDtoSchema = z.object({
  minHeight: z.number().positive().max(96).optional(),
  maxHeight: z.number().positive().max(96).optional(),
  minWeight: z.number().positive().max(500).optional(),
  maxWeight: z.number().positive().max(500).optional(),
});

export const PlayerBulkUpdateDtoSchema = z.object({
  playerIds: z.array(z.number().positive()).min(1, 'At least one player ID is required'),
  updates: z.object({
    status: z.string().max(45).optional(),
    position: z.string().max(75).optional(),
    university: z.string().max(75).optional(),
    yearEnteredLeague: z.number().min(1950).max(2030).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),
});

export type PlayerSearchDto = z.infer<typeof PlayerSearchDtoSchema>;
export type PlayerPhysicalRangeDto = z.infer<typeof PlayerPhysicalRangeDtoSchema>;
export type PlayerBulkUpdateDto = z.infer<typeof PlayerBulkUpdateDtoSchema>;