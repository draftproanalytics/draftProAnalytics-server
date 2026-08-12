import { ValidationError } from '@/shared/errors/AppError';
import type { ProspectDraftStatus } from './ProspectDraftStatus';

export interface ProspectProps {
  id?: number;
  firstName: string;
  lastName: string;
  position: string;
  college: string;
  homeCity?: string;
  homeState?: string;
  drafted: boolean;
  draftStatus: ProspectDraftStatus;
  draftYear?: number | null;
  teamId?: number;
  draftPickId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Prospect {
  private constructor(private props: ProspectProps) { this.validate(); }

  public static create(props: ProspectProps): Prospect { return new Prospect(props); }

  public static fromPersistence(data: {
    id: number;
    firstName: string;
    lastName: string;
    position: string;
    college: string;
    homeCity?: string | null;
    homeState?: string | null;
    drafted: boolean;
    draftStatus?: ProspectDraftStatus | null;
    draftYear?: number | null;
    teamId?: number | null;
    draftPickId?: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }): Prospect {
    return new Prospect({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
      college: data.college,
      homeCity: data.homeCity ?? undefined,
      homeState: data.homeState ?? undefined,
      drafted: data.drafted,
      draftStatus: data.draftStatus ?? (data.drafted ? 'DRAFTED' : 'PRE_DRAFT'),
      draftYear: data.draftYear ?? null,
      teamId: data.teamId ?? undefined,
      draftPickId: data.draftPickId ?? undefined,
      createdAt: data.createdAt ?? undefined,
      updatedAt: data.updatedAt ?? undefined,
    });
  }

  private validate(): void {
    if (!this.props.firstName?.trim()) throw new ValidationError('First name is required');
    if (this.props.firstName.length > 45) throw new ValidationError('First name cannot exceed 45 characters');
    if (!this.props.lastName?.trim()) throw new ValidationError('Last name is required');
    if (this.props.lastName.length > 45) throw new ValidationError('Last name cannot exceed 45 characters');
    if (!this.props.position?.trim()) throw new ValidationError('Position is required');
    if (this.props.position.length > 10) throw new ValidationError('Position cannot exceed 10 characters');
    if (!this.props.college?.trim()) throw new ValidationError('College is required');
    if (this.props.college.length > 75) throw new ValidationError('College cannot exceed 75 characters');
    if (this.props.draftYear && (this.props.draftYear < 1990 || this.props.draftYear > 2035)) {
      throw new ValidationError('Draft year must be between 1990 and 2035');
    }
  }

  public get id(): number | undefined { return this.props.id; }
  public get firstName(): string { return this.props.firstName; }
  public get lastName(): string { return this.props.lastName; }
  public get position(): string { return this.props.position; }
  public get college(): string { return this.props.college; }
  public get homeCity(): string | undefined { return this.props.homeCity; }
  public get homeState(): string | undefined { return this.props.homeState; }
  public get drafted(): boolean { return this.props.drafted; }
  public get draftStatus(): ProspectDraftStatus { return this.props.draftStatus; }
  public get draftYear(): number | null { return this.props.draftYear ?? null; }
  public get teamId(): number | undefined { return this.props.teamId; }
  public get draftPickId(): number | undefined { return this.props.draftPickId; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }

  public getFullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }

  public updatePersonalInfo(firstName?: string, lastName?: string, homeCity?: string, homeState?: string): void {
    if (firstName !== undefined) {
      if (!firstName.trim()) throw new ValidationError('First name cannot be empty');
      if (firstName.length > 45) throw new ValidationError('First name cannot exceed 45 characters');
      this.props.firstName = firstName;
    }
    if (lastName !== undefined) {
      if (!lastName.trim()) throw new ValidationError('Last name cannot be empty');
      if (lastName.length > 45) throw new ValidationError('Last name cannot exceed 45 characters');
      this.props.lastName = lastName;
    }
    if (homeCity !== undefined) {
      if (homeCity.length > 45) throw new ValidationError('Home city cannot exceed 45 characters');
      this.props.homeCity = homeCity || undefined;
    }
    if (homeState !== undefined) {
      if (homeState.length > 45) throw new ValidationError('Home state cannot exceed 45 characters');
      this.props.homeState = homeState || undefined;
    }
    this.props.updatedAt = new Date();
  }

  public markAsDrafted(teamId: number, draftYear: number, draftPickId?: number): void {
    if (this.props.draftStatus === 'DRAFTED') throw new ValidationError('Prospect is already drafted');
    if (teamId <= 0) throw new ValidationError('Team ID must be positive');
    if (draftYear < 1990 || draftYear > 2035) throw new ValidationError('Draft year must be between 1990 and 2035');
    this.props.drafted = true;
    this.props.draftStatus = 'DRAFTED';
    this.props.teamId = teamId;
    this.props.draftYear = draftYear;
    if (draftPickId) this.props.draftPickId = draftPickId;
    this.props.updatedAt = new Date();
  }

  public markAsUndrafted(): void {
    this.props.drafted = false;
    this.props.draftStatus = 'PRE_DRAFT';
    this.props.teamId = undefined;
    this.props.draftPickId = undefined;
    this.props.updatedAt = new Date();
  }


  public markAsUdfa(draftYear: number, teamId?: number): void {
    if (draftYear < 1990 || draftYear > 2035) throw new ValidationError('Draft year must be between 1990 and 2035');
    if (teamId !== undefined && teamId <= 0) throw new ValidationError('Team ID must be positive');
    this.props.drafted = false;
    this.props.draftStatus = 'UDFA';
    this.props.draftYear = draftYear;
    this.props.teamId = teamId;
    this.props.draftPickId = undefined;
    this.props.updatedAt = new Date();
  }

  public toPersistence(): Omit<ProspectProps, 'createdAt' | 'updatedAt'> {
    return {
      id: this.props.id,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      position: this.props.position,
      college: this.props.college,
      homeCity: this.props.homeCity,
      homeState: this.props.homeState,
      drafted: this.props.draftStatus === 'DRAFTED',
      draftStatus: this.props.draftStatus,
      draftYear: this.props.draftYear ?? null,
      teamId: this.props.teamId,
      draftPickId: this.props.draftPickId,
    };
  }

  public equals(other: Prospect): boolean { return this.props.id === other.props.id; }
}
