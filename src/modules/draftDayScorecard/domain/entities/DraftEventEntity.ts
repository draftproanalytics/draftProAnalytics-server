import { DraftEvent_status } from '@prisma/client';

export interface DraftEventEntity {
  id: number;
  draftYear: number;
  name: string;
  league: string;
  startsAt: Date | null;
  status: DraftEvent_status;
  createdAt: Date | null;
  updatedAt: Date | null;
}