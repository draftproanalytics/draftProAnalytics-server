import type { NflTeamIdentityDto } from '../dtos/NflGameEvent.dto';

export interface ResolvedTeamIdentityDto {
  readonly dpaTeamId: number;
  readonly source: string;
}

export interface ITeamIdentityResolver {
  resolveDpaTeamId(identity: NflTeamIdentityDto): Promise<ResolvedTeamIdentityDto | null>;
}
