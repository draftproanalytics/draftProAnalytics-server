// src/domain/prospect/repositories/IProspectRepository.ts
import { Prospect } from '../entities/Prospect';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import type { ProspectDraftStatus } from '../entities/ProspectDraftStatus';

export interface ProspectFilters {
  firstName?: string;
  lastName?: string;
  playerName?: string;
  position?: string;
  college?: string;
  homeState?: string;
  drafted?: boolean;
  draftStatus?: ProspectDraftStatus;
  draftYear?: number;
  teamId?: number;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  minFortyTime?: number;
  maxFortyTime?: number;
  minVerticalLeap?: number;
  maxVerticalLeap?: number;
  minBenchPress?: number;
  maxBenchPress?: number;
}

export interface IProspectRepository {
  findAvailable(): unknown;
  save(prospect: Prospect): Promise<Prospect>;
  findById(id: number): Promise<Prospect | null>;
  findAll(filters?: ProspectFilters, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  update(id: number, prospect: Prospect): Promise<Prospect>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  
  // Domain-specific query methods
  findByPosition(position: string, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  findByCollege(college: string, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  findUndrafted(pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  findDrafted(draftYear?: number, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  findByTeam(teamId: number, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>>;
  findTopAthletes(limit?: number): Promise<Prospect[]>;
  findByCombineScore(
    minFortyTime?: number,
    maxFortyTime?: number,
    minVerticalLeap?: number,
    maxVerticalLeap?: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Prospect>>;
  countByPosition(): Promise<{ position: string; count: number }[]>;
  countByCollege(): Promise<{ college: string; count: number }[]>;
  findDuplicates(): Promise<Prospect[]>;
}