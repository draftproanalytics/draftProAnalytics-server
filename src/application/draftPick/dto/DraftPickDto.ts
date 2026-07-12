// src/application/draftPick/dto/DraftPickDto.ts
export interface CreateDraftPickDto {
  round: number;
  pickNumber: number;
  pickInRound: number;
  draftEventId: number;
  draftYear: number;
  currentTeamId: number;
  prospectId?: number | null;
  playerId?: number | null;
  used?: boolean;
  originalTeam?: number | null;
  position?: string | null;
  college?: string | null;
}

export interface UpdateDraftPickDto {
  round?: number;
  pickInRound: number;
  draftEventId: number;  
  pickNumber?: number;
  draftYear?: number;
  currentTeamId?: number;
  prospectId?: number | null;
  playerId?: number | null;
  used?: boolean;
  originalTeam?: number | null;
  position?: string | null;
  college?: string | null;
}

export interface DraftPickResponseDto {
  id: number;
  round: number;
  pickNumber: number;
  pickInRound: number;
  draftEventId: number;  
  draftYear: number;
  currentTeamId: number;
  prospectId?: number | null;
  playerId?: number | null;
  used: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  originalTeam?: number | null;
  position?: string | null;
  college?: string | null;
}

export interface DraftPickWithRelationsDto {
  draftYear: number;
  round: number;
  pickNumber: number;
  player: string | null;
  team: string;
  position: string | null;
}

export interface DraftPickQueryFilters {
  draftYear?: number;
  currentTeamId?: number;
  used?: boolean;
  round?: number;
}