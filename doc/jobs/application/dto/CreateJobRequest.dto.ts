import { JsonValue } from '../../domain/types/JsonValue';

export interface CreateJobRequestDto {
  readonly type: string;
  readonly payload: JsonValue | null;
  readonly requestedByPersonId: number | null;
}
