import {
  DraftEvent,
  DraftEvent_status,
  DraftPick,
  DraftPick_status,
  DraftTeamScorecard,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { DraftEventEntity } from '../../domain/entities/DraftEventEntity';
import { DraftPickEntity } from '../../domain/entities/DraftPickEntity';
import { DraftTeamScorecardEntity } from '../../domain/entities/DraftTeamScorecardEntity';
import {
  CreateDraftEventInput,
  DraftPickAuditInput,
  EventScorecardResult,
  IDraftDayScorecardRepository,
  SeedDraftPickInput,
  TeamScorecardResult,
  UpdateDraftPickInput,
} from '../../domain/repositories/IDraftDayScorecardRepository';

export class PrismaDraftDayScorecardRepository
  implements IDraftDayScorecardRepository
{
  public constructor(private readonly prisma: PrismaClient) {}

  public async createEvent(
    input: CreateDraftEventInput,
  ): Promise<DraftEventEntity> {
    const created = await this.prisma.draftEvent.upsert({
      where: {
        draftYear_leagueCode: {
          draftYear: input.draftYear,
          leagueCode: input.league,
        },
      },
      update: {
        name: input.name,
        startsAt: input.startsAt,
        status: input.status,
      },
      create: {
        draftYear: input.draftYear,
        name: input.name,
        leagueCode: input.league,
        startsAt: input.startsAt,
        status: input.status,
      },
    });

    return this.mapEvent(created);
  }

  public async listEvents(): Promise<DraftEventEntity[]> {
    const events = await this.prisma.draftEvent.findMany({
      orderBy: [{ draftYear: 'desc' }, { id: 'desc' }],
    });

    return events.map((event: DraftEvent) => this.mapEvent(event));
  }

  public async getEventById(
    draftEventId: number,
  ): Promise<DraftEventEntity | null> {
    const event = await this.prisma.draftEvent.findUnique({
      where: { id: draftEventId },
    });

    return event === null ? null : this.mapEvent(event);
  }

  public async getEventScorecard(
    draftEventId: number,
  ): Promise<EventScorecardResult | null> {
    const event = await this.prisma.draftEvent.findUnique({
      where: { id: draftEventId },
    });

    if (event === null) {
      return null;
    }

    const [teams, picks] = await Promise.all([
      this.prisma.draftTeamScorecard.findMany({
        where: { draftEventId },
        orderBy: { teamId: 'asc' },
      }),
      this.prisma.draftPick.findMany({
        where: { draftEventId },
        orderBy: [{ pickNumber: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      event: this.mapEvent(event),
      teams: teams.map((team: DraftTeamScorecard) =>
        this.mapTeamScorecard(team),
      ),
      picks: picks.map((pick: DraftPick) => this.mapPick(pick)),
    };
  }

  public async getTeamScorecard(
    draftEventId: number,
    teamId: number,
  ): Promise<TeamScorecardResult | null> {
    const event = await this.prisma.draftEvent.findUnique({
      where: { id: draftEventId },
    });

    if (event === null) {
      return null;
    }

    const [teamScorecard, picks] = await Promise.all([
      this.prisma.draftTeamScorecard.findUnique({
        where: {
          draftEventId_teamId: {
            draftEventId,
            teamId,
          },
        },
      }),
      this.prisma.draftPick.findMany({
        where: {
          draftEventId,
          currentTeamId: teamId,
        },
        orderBy: [{ round: 'asc' }, { pickNumber: 'asc' }],
      }),
    ]);

    return {
      event: this.mapEvent(event),
      teamScorecard:
        teamScorecard === null ? null : this.mapTeamScorecard(teamScorecard),
      picks: picks.map((pick: DraftPick) => this.mapPick(pick)),
    };
  }

  public async seedPicks(
    draftEventId: number,
    draftYear: number,
    picks: SeedDraftPickInput[],
    changedByPersonId: number | null,
  ): Promise<DraftPickEntity[]> {
    const seeded = await this.prisma.$transaction(async (tx) => {
      const results: DraftPick[] = [];

      for (const input of picks) {
        const pickInRound =
          input.pickInRound ??
          (await this.calculateNextPickInRound(
            tx,
            draftEventId,
            input.round,
          ));

        const existing = await tx.draftPick.findUnique({
          where: {
            draftEventId_pickNumber: {
              draftEventId,
              pickNumber: input.pickNumber,
            },
          },
        });

        const originalTeam =
          input.originalTeam === undefined
            ? input.currentTeamId
            : input.originalTeam;

        const saved = await tx.draftPick.upsert({
          where: {
            draftEventId_pickNumber: {
              draftEventId,
              pickNumber: input.pickNumber,
            },
          },
          update: {
            round: input.round,
            pickInRound,
            currentTeamId: input.currentTeamId,
            originalTeam,
            isCompensatory: input.isCompensatory ?? false,
            acquiredViaTrade: input.acquiredViaTrade ?? false,
            tradeNotes: input.tradeNotes ?? null,
          },
          create: {
            draftEventId,
            draftYear,
            round: input.round,
            pickNumber: input.pickNumber,
            pickInRound,
            currentTeamId: input.currentTeamId,
            originalTeam,
            used: false,
            status: DraftPick_status.SCHEDULED,
            isCompensatory: input.isCompensatory ?? false,
            acquiredViaTrade: input.acquiredViaTrade ?? false,
            tradeNotes: input.tradeNotes ?? null,
          },
        });

        await tx.draftPickAuditLog.create({
          data: {
            draftPickId: saved.id,
            draftEventId,
            action: existing === null ? 'SEED_PICK' : 'RESEED_PICK',
            changedByPersonId,
            previousSnapshot:
              existing === null
                ? Prisma.JsonNull
                : this.pickToAuditSnapshot(existing),
            nextSnapshot: this.pickToAuditSnapshot(saved),
            notes: null,
          },
        });

        results.push(saved);
      }

      return results;
    });

    await this.refreshTeamScorecards(draftEventId);

    return seeded.map((pick: DraftPick) => this.mapPick(pick));
  }

  public async getPickById(
    draftPickId: number,
  ): Promise<DraftPickEntity | null> {
    const pick = await this.prisma.draftPick.findUnique({
      where: { id: draftPickId },
    });

    return pick === null ? null : this.mapPick(pick);
  }

  public async updatePick(
    draftPickId: number,
    input: UpdateDraftPickInput,
    changedByPersonId: number | null,
    action: string,
  ): Promise<DraftPickEntity> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.draftPick.findUnique({
        where: { id: draftPickId },
      });

      if (existing === null) {
        throw new Error('Draft pick not found.');
      }

      const nextStatus = input.status ?? existing.status;
      const used = nextStatus === DraftPick_status.PICKED ? true : existing.used;

      const saved = await tx.draftPick.update({
        where: { id: draftPickId },
        data: {
          currentTeamId: input.currentTeamId,
          originalTeam: input.originalTeam,
          prospectId: input.prospectId,
          playerId: input.playerId,
          playerFirstName: input.playerFirstName,
          playerLastName: input.playerLastName,
          position: input.position,
          college: input.college,
          status: input.status,
          used,
          isCompensatory: input.isCompensatory,
          acquiredViaTrade: input.acquiredViaTrade,
          selectedAt: input.selectedAt,
          pickGrade: input.pickGrade,
          valueGrade: input.valueGrade,
          needsFitGrade: input.needsFitGrade,
          analystNotes: input.analystNotes,
          tradeNotes: input.tradeNotes,
        },
      });

      await tx.draftPickAuditLog.create({
        data: {
          draftPickId: saved.id,
          draftEventId: saved.draftEventId,
          action,
          changedByPersonId,
          previousSnapshot: this.pickToAuditSnapshot(existing),
          nextSnapshot: this.pickToAuditSnapshot(saved),
          notes: null,
        },
      });

      return saved;
    });

    await this.refreshTeamScorecards(updated.draftEventId);

    return this.mapPick(updated);
  }

  public async writeAuditLog(input: DraftPickAuditInput): Promise<void> {
    await this.prisma.draftPickAuditLog.create({
      data: {
        draftPickId: input.draftPickId,
        draftEventId: input.draftEventId,
        action: input.action,
        changedByPersonId: input.changedByPersonId,
        previousSnapshot:
          input.previousSnapshot === null ? Prisma.JsonNull : input.previousSnapshot,
        nextSnapshot: input.nextSnapshot,
        notes: input.notes,
      },
    });
  }

  public async refreshTeamScorecards(draftEventId: number): Promise<void> {
    const grouped = await this.prisma.draftPick.groupBy({
      by: ['currentTeamId'],
      where: { draftEventId },
      _count: {
        id: true,
      },
    });

    for (const group of grouped) {
      const pickedCount = await this.prisma.draftPick.count({
        where: {
          draftEventId,
          currentTeamId: group.currentTeamId,
          status: DraftPick_status.PICKED,
        },
      });

      await this.prisma.draftTeamScorecard.upsert({
        where: {
          draftEventId_teamId: {
            draftEventId,
            teamId: group.currentTeamId,
          },
        },
        update: {
          totalPicks: group._count.id,
          pickedCount,
        },
        create: {
          draftEventId,
          teamId: group.currentTeamId,
          totalPicks: group._count.id,
          pickedCount,
        },
      });
    }
  }

  private async calculateNextPickInRound(
    tx: Prisma.TransactionClient,
    draftEventId: number,
    round: number,
  ): Promise<number> {
    const latest = await tx.draftPick.findFirst({
      where: {
        draftEventId,
        round,
      },
      orderBy: {
        pickInRound: 'desc',
      },
    });

    return latest === null ? 1 : latest.pickInRound + 1;
  }

  private mapEvent(event: DraftEvent): DraftEventEntity {
    return {
      id: event.id,
      draftYear: event.draftYear,
      name: event.name,
      league: event.leagueCode,
      startsAt: event.startsAt,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private mapPick(pick: DraftPick): DraftPickEntity {
    return {
      id: pick.id,
      round: pick.round,
      pickNumber: pick.pickNumber,
      pickInRound: pick.pickInRound,
      draftYear: pick.draftYear,
      draftEventId: pick.draftEventId,
      currentTeamId: pick.currentTeamId,
      originalTeam: pick.originalTeam,
      prospectId: pick.prospectId,
      playerId: pick.playerId,
      playerFirstName: pick.playerFirstName,
      playerLastName: pick.playerLastName,
      position: pick.position,
      college: pick.college,
      used: pick.used,
      status: pick.status,
      isCompensatory: pick.isCompensatory,
      acquiredViaTrade: pick.acquiredViaTrade,
      selectedAt: pick.selectedAt,
      pickGrade: pick.pickGrade === null ? null : pick.pickGrade.toString(),
      valueGrade: pick.valueGrade === null ? null : pick.valueGrade.toString(),
      needsFitGrade:
        pick.needsFitGrade === null ? null : pick.needsFitGrade.toString(),
      analystNotes: pick.analystNotes,
      tradeNotes: pick.tradeNotes,
      createdAt: pick.createdAt,
      updatedAt: pick.updatedAt,
    };
  }

  private mapTeamScorecard(
    scorecard: DraftTeamScorecard,
  ): DraftTeamScorecardEntity {
    return {
      id: scorecard.id,
      draftEventId: scorecard.draftEventId,
      teamId: scorecard.teamId,
      preDraftNeeds: scorecard.preDraftNeeds,
      strategyNotes: scorecard.strategyNotes,
      totalPicks: scorecard.totalPicks,
      pickedCount: scorecard.pickedCount,
      overallGrade:
        scorecard.overallGrade === null
          ? null
          : scorecard.overallGrade.toString(),
      valueGrade:
        scorecard.valueGrade === null ? null : scorecard.valueGrade.toString(),
      needsFitGrade:
        scorecard.needsFitGrade === null
          ? null
          : scorecard.needsFitGrade.toString(),
      analystSummary: scorecard.analystSummary,
      createdAt: scorecard.createdAt,
      updatedAt: scorecard.updatedAt,
    };
  }

  private pickToAuditSnapshot(pick: DraftPick): Prisma.InputJsonValue {
    return {
      id: pick.id,
      round: pick.round,
      pickNumber: pick.pickNumber,
      pickInRound: pick.pickInRound,
      draftYear: pick.draftYear,
      draftEventId: pick.draftEventId,
      currentTeamId: pick.currentTeamId,
      originalTeam: pick.originalTeam,
      prospectId: pick.prospectId,
      playerId: pick.playerId,
      playerFirstName: pick.playerFirstName,
      playerLastName: pick.playerLastName,
      position: pick.position,
      college: pick.college,
      used: pick.used,
      status: pick.status,
      isCompensatory: pick.isCompensatory,
      acquiredViaTrade: pick.acquiredViaTrade,
      selectedAt: pick.selectedAt === null ? null : pick.selectedAt.toISOString(),
      pickGrade: pick.pickGrade === null ? null : pick.pickGrade.toString(),
      valueGrade: pick.valueGrade === null ? null : pick.valueGrade.toString(),
      needsFitGrade:
        pick.needsFitGrade === null ? null : pick.needsFitGrade.toString(),
      analystNotes: pick.analystNotes,
      tradeNotes: pick.tradeNotes,
    };
  }
}