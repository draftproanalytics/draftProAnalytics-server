//draftproanalytics-server/src/shared/presentation/http/AuthUser.ts
export interface AuthUser {
  personId: number;
  userName?: string;
  activeRid: number | undefined;
}
