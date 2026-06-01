import type { PrismaClient } from '@prisma/client';
import type {
  ITeamIdentityResolver,
  ResolvedTeamIdentityDto,
} from '../../domain/repositories/ITeamIdentityResolver';
import type { NflTeamIdentityDto } from '../../domain/dtos/NflGameEvent.dto';

interface ColumnRow {
  readonly COLUMN_NAME: string;
}

interface TeamIdRow {
  readonly id: number;
}

const candidateColumns = [
  'espnTeamId',
  'espnId',
  'espn_id',
  'teamId',
  'teamAbbreviation',
  'abbreviation',
  'teamCode',
  'shortName',
  'teamName',
  'name',
  'displayName',
  'display_name',
] as const;

const toSqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const quoteIdentifier = (identifier: string): string => `\`${identifier.replaceAll('`', '``')}\``;

export class PrismaDpaTeamIdentityResolver implements ITeamIdentityResolver {
  private cachedColumns: readonly string[] | null = null;

  public constructor(private readonly prisma: PrismaClient) {}

  public async resolveDpaTeamId(identity: NflTeamIdentityDto): Promise<ResolvedTeamIdentityDto | null> {
    const columns = await this.readTeamColumns();
    const usableColumns = candidateColumns.filter((column) => columns.includes(column));

    if (usableColumns.length === 0) {
      return null;
    }

    const identityValues = [
      identity.espnTeamId,
      identity.abbreviation,
      identity.displayName,
      identity.shortName,
      identity.name,
    ].filter((value, index, values) => value.trim() !== '' && values.indexOf(value) === index);

    const predicates = usableColumns
      .map((column) => `${quoteIdentifier(column)} IN (${identityValues.map(toSqlLiteral).join(', ')})`)
      .join(' OR ');

    const sql = `SELECT id FROM Team WHERE ${predicates} LIMIT 1`;
    const rows = await this.prisma.$queryRawUnsafe<TeamIdRow[]>(sql);

    if (rows.length === 0) {
      return null;
    }

    return {
      dpaTeamId: rows[0].id,
      source: 'Team',
    };
  }

  private async readTeamColumns(): Promise<readonly string[]> {
    if (this.cachedColumns) {
      return this.cachedColumns;
    }

    const rows = await this.prisma.$queryRaw<ColumnRow[]>`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Team'
    `;

    this.cachedColumns = rows.map((row) => row.COLUMN_NAME);
    return this.cachedColumns;
  }
}
