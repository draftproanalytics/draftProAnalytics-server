// src/modules/teamNeedsAnalysis/application/dto/TeamNeedsAnalysis.dto.ts

import { z } from 'zod';

// Request DTOs
export const GenerateTeamNeedsRequestSchema = z.object({
  teamId: z.number().positive('Team ID must be positive'),
  seasonYear: z.number().min(2000).max(2030),
  forceRefresh: z.boolean().optional().default(false),
});

export const GenerateAllTeamsNeedsRequestSchema = z.object({
  seasonYear: z.number().min(2000).max(2030),
  forceRefresh: z.boolean().optional().default(false),
});

export const GetTeamNeedsRequestSchema = z.object({
  teamId: z.number().positive('Team ID must be positive'),
  seasonYear: z.number().min(2000).max(2030).optional(),
});

export type GenerateTeamNeedsRequest = z.infer<typeof GenerateTeamNeedsRequestSchema>;
export type GenerateAllTeamsNeedsRequest = z.infer<typeof GenerateAllTeamsNeedsRequestSchema>;
export type GetTeamNeedsRequest = z.infer<typeof GetTeamNeedsRequestSchema>;

// Response DTOs
export interface PositionNeedDto {
  position: string;
  positionGroup: string;
  needScore: number;
  priority: number;
  reasoning: string[];
}

export interface TeamNeedsAnalysisDto {
  teamId: number;
  seasonYear: number;
  analysisDate: string;
  positionNeeds: PositionNeedDto[];
  overallNeedScore: number;
  topPriorities: string[];
  metadata?: {
    rosterSize?: number;
    averageAge?: number;
    experienceLevel?: number;
    injuryCount?: number;
  };
}

export interface AllTeamsNeedsDto {
  seasonYear: number;
  teams: TeamNeedsAnalysisDto[];
  generatedAt: string;
  totalTeams: number;
}

// DataTable specific DTOs for frontend
export interface TeamNeedsDataTableRow {
  teamId: number;
  teamName?: string;
  teamAbbreviation?: string;
  overallNeedScore: number;
  topNeeds: string[]; // Top 3-5 positions
  criticalPositions: number; // Count of high-priority needs
  analysisDate: string;
}

export interface PositionNeedsDataTableRow {
  teamId: number;
  teamName?: string;
  position: string;
  positionGroup: string;
  needScore: number;
  priority: number;
  reasoning: string;
}