import type { Prisma, PrismaClient, PostDraftWRMetric } from '@prisma/client';
import type { CsvImportPreview, CsvPreviewRow, UpsertWrMetricCommand, WrMetricActor, WrMetricRecord, WrMetricSourceType } from '../domain/WrAdvancedMetrics.types';
import { validateWrMetricCommand } from '../application/WrMetricValidation';
import { parseWrMetricCsv } from '../application/CsvWrMetricParser';

const toNumber = (value: Prisma.Decimal | null): number | null => value === null ? null : Number(value);
const logicalReference = (value: string | null | undefined): string => value?.trim() ?? '';
const auditSnapshot = (row: PostDraftWRMetric): Prisma.InputJsonObject => ({
  id: row.id.toString(), prospectId: row.prospectId, draftYear: row.draftYear, seasonYear: row.seasonYear,
  yardsPerRouteRun: toNumber(row.yardsPerRouteRun), receivingGrade: toNumber(row.receivingGrade),
  contestedCatchRate: toNumber(row.contestedCatchRate), behindLosTargetRate: toNumber(row.behindLosTargetRate),
  catchRate: toNumber(row.catchRate), missedTacklesForcedPerReception: toNumber(row.missedTacklesForcedPerReception),
  yacAfterContactPerReception: toNumber(row.yacAfterContactPerReception), sourceName: row.sourceName,
  sourceType: row.sourceType, sourceReference: row.sourceReference, verified: row.verified,
  verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt?.toISOString() ?? null, notes: row.notes,
  providerPriority: row.providerPriority, active: row.active, updatedAt: row.updatedAt.toISOString(),
});

function mapRecord(row: PostDraftWRMetric): WrMetricRecord {
  return {
    id: row.id.toString(), prospectId: row.prospectId, draftYear: row.draftYear, seasonYear: row.seasonYear,
    yardsPerRouteRun: toNumber(row.yardsPerRouteRun), receivingGrade: toNumber(row.receivingGrade),
    contestedCatchRate: toNumber(row.contestedCatchRate), behindLosTargetRate: toNumber(row.behindLosTargetRate),
    catchRate: toNumber(row.catchRate), missedTacklesForcedPerReception: toNumber(row.missedTacklesForcedPerReception),
    yacAfterContactPerReception: toNumber(row.yacAfterContactPerReception), sourceName: row.sourceName,
    sourceType: row.sourceType as WrMetricSourceType, sourceReference: row.sourceReference,
    enteredBy: row.enteredBy, enteredAt: row.enteredAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    verified: row.verified, verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verificationNotes: row.verificationNotes, notes: row.notes, providerPriority: row.providerPriority, active: row.active,
  };
}

export class PrismaWrMetricRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async prospectExists(prospectId: number): Promise<boolean> {
    return (await this.prisma.prospect.count({ where: { id: prospectId } })) > 0;
  }

  public async findLogicalRecord(command: UpsertWrMetricCommand): Promise<PostDraftWRMetric | null> {
    return this.prisma.postDraftWRMetric.findFirst({
      where: {
        prospectId: command.prospectId, draftYear: command.draftYear, seasonYear: command.seasonYear,
        sourceType: command.sourceType, sourceName: command.sourceName.trim(), sourceReferenceKey: logicalReference(command.sourceReference),
      },
    });
  }

  public async upsert(command: UpsertWrMetricCommand, actor: WrMetricActor, importBatchId: bigint | null = null): Promise<WrMetricRecord> {
    const errors = validateWrMetricCommand(command);
    if (errors.length > 0) throw Object.assign(new Error('WR metric validation failed.'), { statusCode: 400, details: errors });
    if (!(await this.prospectExists(command.prospectId))) throw Object.assign(new Error(`Prospect ${command.prospectId} does not exist.`), { statusCode: 404 });

    return this.prisma.$transaction(async (tx) => this.upsertWithTransaction(tx, command, actor, importBatchId));
  }

  public async upsertWithTransaction(tx: Prisma.TransactionClient, command: UpsertWrMetricCommand, actor: WrMetricActor, importBatchId: bigint | null): Promise<WrMetricRecord> {
    const existing = await tx.postDraftWRMetric.findFirst({ where: {
      prospectId: command.prospectId, draftYear: command.draftYear, seasonYear: command.seasonYear,
      sourceType: command.sourceType, sourceName: command.sourceName.trim(), sourceReferenceKey: logicalReference(command.sourceReference),
    }});
    if (existing?.verified && command.verified !== true && command.allowVerifiedOverwrite !== true) {
      throw Object.assign(new Error('A verified record cannot be overwritten by an unverified request without allowVerifiedOverwrite=true.'), { statusCode: 409 });
    }
    const values = {
      yardsPerRouteRun: command.yardsPerRouteRun ?? null, receivingGrade: command.receivingGrade ?? null,
      contestedCatchRate: command.contestedCatchRate ?? null, behindLosTargetRate: command.behindLosTargetRate ?? null,
      catchRate: command.catchRate ?? null, missedTacklesForcedPerReception: command.missedTacklesForcedPerReception ?? null,
      yacAfterContactPerReception: command.yacAfterContactPerReception ?? null,
    };
    const now = new Date();
    const data: Prisma.PostDraftWRMetricUncheckedCreateInput = {
      prospectId: command.prospectId, draftYear: command.draftYear, seasonYear: command.seasonYear,
      ...values, sourceName: command.sourceName.trim(), sourceType: command.sourceType,
      sourceReference: command.sourceReference?.trim() || null, sourceReferenceKey: logicalReference(command.sourceReference),
      enteredBy: actor.personId, verified: command.verified ?? false,
      verifiedBy: command.verified ? actor.personId : null, verifiedAt: command.verified ? now : null,
      notes: command.notes ?? null, ...(command.rawPayload === undefined ? {} : { rawPayloadJson: command.rawPayload as Prisma.InputJsonValue }),
      providerPriority: command.providerPriority ?? null, active: command.active ?? true,
    };
    const saved = existing
      ? await tx.postDraftWRMetric.update({ where: { id: existing.id }, data: { ...data, enteredAt: existing.enteredAt } })
      : await tx.postDraftWRMetric.create({ data });
    await tx.postDraftWRMetricAudit.create({ data: {
      metricId: saved.id, action: existing ? 'UPDATE' : 'CREATE', actorPersonId: actor.personId,
      actorUserName: actor.userName, previousValuesJson: existing ? auditSnapshot(existing) : undefined,
      newValuesJson: auditSnapshot(saved), importBatchId,
      reason: command.reason ?? command.notes ?? null,
    }});
    return mapRecord(saved);
  }

  public async setVerification(id: bigint, verified: boolean, actor: WrMetricActor, notes: string | null): Promise<WrMetricRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.postDraftWRMetric.findUnique({ where: { id } });
      if (!existing) throw Object.assign(new Error(`WR metric record ${id.toString()} was not found.`), { statusCode: 404 });
      const saved = await tx.postDraftWRMetric.update({ where: { id }, data: {
        verified, verifiedBy: verified ? actor.personId : null, verifiedAt: verified ? new Date() : null,
        verificationNotes: notes,
      }});
      await tx.postDraftWRMetricAudit.create({ data: {
        metricId: id, action: verified ? 'VERIFY' : 'UNVERIFY', actorPersonId: actor.personId,
        actorUserName: actor.userName, previousValuesJson: auditSnapshot(existing),
        newValuesJson: auditSnapshot(saved), reason: notes,
      }});
      return mapRecord(saved);
    });
  }

  public async previewCsv(csv: string): Promise<CsvImportPreview> {
    const parsed = parseWrMetricCsv(csv); const seen = new Map<string, number>(); const rows: CsvPreviewRow[] = [];
    for (const parsedRow of parsed) {
      const errors = [...parsedRow.parseErrors]; let duplicateOfRowNumber: number | null = null;
      let willCreate = false; let willUpdate = false;
      if (parsedRow.command) {
        errors.push(...validateWrMetricCommand(parsedRow.command));
        const key = [parsedRow.command.prospectId, parsedRow.command.draftYear, parsedRow.command.seasonYear, parsedRow.command.sourceType, parsedRow.command.sourceName.trim(), logicalReference(parsedRow.command.sourceReference)].join('|');
        duplicateOfRowNumber = seen.get(key) ?? null;
        if (duplicateOfRowNumber === null) seen.set(key, parsedRow.rowNumber);
        else errors.push({ field: 'row', message: `Duplicate logical record; first appears on row ${duplicateOfRowNumber}.` });
        if (!(await this.prospectExists(parsedRow.command.prospectId))) errors.push({ field: 'prospectId', message: `Prospect ${parsedRow.command.prospectId} does not exist.` });
        const existing = await this.findLogicalRecord(parsedRow.command);
        willUpdate = existing !== null; willCreate = existing === null;
        if (existing?.verified && parsedRow.command.verified !== true && parsedRow.command.allowVerifiedOverwrite !== true) errors.push({ field: 'verified', message: 'Verified existing record is protected from unverified overwrite.' });
      }
      rows.push({ rowNumber: parsedRow.rowNumber, status: errors.length ? 'INVALID' : 'VALID', errors, willCreate, willUpdate, duplicateOfRowNumber, command: parsedRow.command });
    }
    return {
      totalRows: rows.length, validRows: rows.filter((row) => row.status === 'VALID').length,
      invalidRows: rows.filter((row) => row.status === 'INVALID').length, skippedRows: rows.filter((row) => row.status === 'SKIPPED').length,
      missingProspects: rows.filter((row) => row.errors.some((error) => error.field === 'prospectId' && error.message.includes('does not exist'))).length,
      duplicateRows: rows.filter((row) => row.duplicateOfRowNumber !== null).length,
      existingRecordsToUpdate: rows.filter((row) => row.status === 'VALID' && row.willUpdate).length, rows,
    };
  }

  public async importCsv(csv: string, actor: WrMetricActor, options: { skipInvalidRows: boolean; allowVerifiedOverwrite: boolean }): Promise<{ batchId: string; imported: number; skipped: number; preview: CsvImportPreview }> {
    const preview = await this.previewCsv(csv);
    if (preview.invalidRows > 0 && !options.skipInvalidRows) throw Object.assign(new Error('CSV import contains invalid rows. Run preview or set skipInvalidRows=true.'), { statusCode: 422, details: preview });
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.postDraftWRMetricImportBatch.create({ data: {
        status: 'PROCESSING', sourceFileName: null, enteredBy: actor.personId, totalRows: preview.totalRows,
        validRows: preview.validRows, invalidRows: preview.invalidRows, skippedRows: preview.invalidRows,
      }});
      let imported = 0; let skipped = 0;
      try {
        for (const row of preview.rows) {
          if (row.status !== 'VALID' || row.command === null) {
            skipped += 1;
            await tx.postDraftWRMetricImportRow.create({ data: { batchId: batch.id, rowNumber: row.rowNumber, status: 'SKIPPED', rawRowJson: (row.command ?? {}) as Prisma.InputJsonValue, validationErrorsJson: row.errors as unknown as Prisma.InputJsonValue } });
            continue;
          }
          const command = { ...row.command, allowVerifiedOverwrite: options.allowVerifiedOverwrite };
          const saved = await this.upsertWithTransaction(tx, command, actor, batch.id);
          imported += 1;
          await tx.postDraftWRMetricImportRow.create({ data: { batchId: batch.id, rowNumber: row.rowNumber, status: row.willUpdate ? 'UPDATED' : 'CREATED', metricId: BigInt(saved.id), rawRowJson: command.rawPayload as Prisma.InputJsonValue } });
        }
        await tx.postDraftWRMetricImportBatch.update({ where: { id: batch.id }, data: { status: 'COMPLETED', importedRows: imported, skippedRows: skipped, completedAt: new Date() } });
        return { batchId: batch.id.toString(), imported, skipped, preview };
      } catch (error) {
        throw error;
      }
    });
  }
}
