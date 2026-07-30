// src/domain/prospect/entities/Prospect.ts
import { ValidationError } from '@/shared/errors/AppError';

export interface ProspectProps {
  id?: number;
  firstName: string;
  lastName: string;
  position: string;
  college: string;
  height: number;
  weight: number;
  handSize?: number;
  armLength?: number;
  homeCity?: string;
  homeState?: string;
  fortyTime?: number;
  tenYardSplit?: number;
  verticalLeap?: number;
  broadJump?: number;
  threeCone?: number;
  twentyYardShuttle?: number;
  benchPress?: number;
  drafted: boolean;
  draftYear?: number | null;
  teamId?: number;
  draftPickId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Prospect {
  private constructor(private props: ProspectProps) {
    this.validate();
  }

  public static create(props: ProspectProps): Prospect {
    return new Prospect(props);
  }

  public static fromPersistence(data: {
    id: number;
    firstName: string;
    lastName: string;
    position: string;
    college: string;
    height: number;
    weight: number;
    handSize?: number | null;
    armLength?: number | null;
    homeCity?: string | null;
    homeState?: string | null;
    fortyTime?: number | null;
    tenYardSplit?: number | null;
    verticalLeap?: number | null;
    broadJump?: number | null;
    threeCone?: number | null;
    twentyYardShuttle?: number | null;
    benchPress?: number | null;
    drafted: boolean;
    draftYear?: number | null;
    teamId?: number | null;
    draftPickId?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prospect {
    return new Prospect({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
      college: data.college,
      height: data.height,
      weight: data.weight,
      handSize: data.handSize || undefined,
      armLength: data.armLength || undefined,
      homeCity: data.homeCity || undefined,
      homeState: data.homeState || undefined,
      fortyTime: data.fortyTime || undefined,
      tenYardSplit: data.tenYardSplit || undefined,
      verticalLeap: data.verticalLeap || undefined,
      broadJump: data.broadJump || undefined,
      threeCone: data.threeCone || undefined,
      twentyYardShuttle: data.twentyYardShuttle || undefined,
      benchPress: data.benchPress || undefined,
      drafted: data.drafted,
      draftYear: data.draftYear ?? null,
      teamId: data.teamId || undefined,
      draftPickId: data.draftPickId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private validate(): void {
    if (!this.props.firstName?.trim()) {
      throw new ValidationError('First name is required');
    }
    if (this.props.firstName.length > 45) {
      throw new ValidationError('First name cannot exceed 45 characters');
    }

    if (!this.props.lastName?.trim()) {
      throw new ValidationError('Last name is required');
    }
    if (this.props.lastName.length > 45) {
      throw new ValidationError('Last name cannot exceed 45 characters');
    }

    if (!this.props.position?.trim()) {
      throw new ValidationError('Position is required');
    }
    if (this.props.position.length > 10) {
      throw new ValidationError('Position cannot exceed 10 characters');
    }

    if (!this.props.college?.trim()) {
      throw new ValidationError('College is required');
    }
    if (this.props.college.length > 75) {
      throw new ValidationError('College cannot exceed 75 characters');
    }

    if (this.props.height <= 0) {
      throw new ValidationError('Height must be positive');
    }

    if (this.props.weight <= 0) {
      throw new ValidationError('Weight must be positive');
    }

    if (this.props.draftYear && (this.props.draftYear < 1990 || this.props.draftYear > 2030)) {
      throw new ValidationError('Draft year must be between 1990 and 2030');
    }

    // Validate combine scores if provided
    if (this.props.fortyTime && this.props.fortyTime > 10) {
      throw new ValidationError('Forty time cannot exceed 10 seconds');
    }
    if (this.props.verticalLeap && this.props.verticalLeap > 60) {
      throw new ValidationError('Vertical leap cannot exceed 60 inches');
    }
    if (this.props.benchPress && this.props.benchPress < 0) {
      throw new ValidationError('Bench press cannot be negative');
    }
  }

  // Getters
  public get id(): number | undefined {
    return this.props.id;
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get position(): string {
    return this.props.position;
  }

  public get college(): string {
    return this.props.college;
  }

  public get height(): number {
    return this.props.height;
  }

  public get weight(): number {
    return this.props.weight;
  }

  public get handSize(): number | undefined {
    return this.props.handSize;
  }

  public get armLength(): number | undefined {
    return this.props.armLength;
  }

  public get homeCity(): string | undefined {
    return this.props.homeCity;
  }

  public get homeState(): string | undefined {
    return this.props.homeState;
  }

  public get fortyTime(): number | undefined {
    return this.props.fortyTime;
  }

  public get tenYardSplit(): number | undefined {
    return this.props.tenYardSplit;
  }

  public get verticalLeap(): number | undefined {
    return this.props.verticalLeap;
  }

  public get broadJump(): number | undefined {
    return this.props.broadJump;
  }

  public get threeCone(): number | undefined {
    return this.props.threeCone;
  }

  public get twentyYardShuttle(): number | undefined {
    return this.props.twentyYardShuttle;
  }

  public get benchPress(): number | undefined {
    return this.props.benchPress;
  }

  public get drafted(): boolean {
    return this.props.drafted;
  }

  public get draftYear(): number | null {
    return this.props.draftYear ?? null;
  }

  public get teamId(): number | undefined {
    return this.props.teamId;
  }

  public get draftPickId(): number | undefined {
    return this.props.draftPickId;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Business methods
  public getFullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  public updatePersonalInfo(
    firstName?: string,
    lastName?: string,
    homeCity?: string,
    homeState?: string
  ): void {
    if (firstName !== undefined) {
      if (!firstName.trim()) {
        throw new ValidationError('First name cannot be empty');
      }
      if (firstName.length > 45) {
        throw new ValidationError('First name cannot exceed 45 characters');
      }
      this.props.firstName = firstName;
    }

    if (lastName !== undefined) {
      if (!lastName.trim()) {
        throw new ValidationError('Last name cannot be empty');
      }
      if (lastName.length > 45) {
        throw new ValidationError('Last name cannot exceed 45 characters');
      }
      this.props.lastName = lastName;
    }

    if (homeCity !== undefined) {
      if (homeCity.length > 45) {
        throw new ValidationError('Home city cannot exceed 45 characters');
      }
      this.props.homeCity = homeCity || undefined;
    }

    if (homeState !== undefined) {
      if (homeState.length > 45) {
        throw new ValidationError('Home state cannot exceed 45 characters');
      }
      this.props.homeState = homeState || undefined;
    }

    this.props.updatedAt = new Date();
  }

  public updateCombineScores(scores: {
    fortyTime?: number;
    tenYardSplit?: number;
    verticalLeap?: number;
    broadJump?: number;
    threeCone?: number;
    twentyYardShuttle?: number;
    benchPress?: number;
  }): void {
    if (scores.fortyTime !== undefined) {
      if (scores.fortyTime <= 0 || scores.fortyTime > 10) {
        throw new ValidationError('Forty time must be between 0 and 10 seconds');
      }
      this.props.fortyTime = scores.fortyTime;
    }

    if (scores.tenYardSplit !== undefined) {
      if (scores.tenYardSplit <= 0 || scores.tenYardSplit > 5) {
        throw new ValidationError('Ten yard split must be between 0 and 5 seconds');
      }
      this.props.tenYardSplit = scores.tenYardSplit;
    }

    if (scores.verticalLeap !== undefined) {
      if (scores.verticalLeap <= 0 || scores.verticalLeap > 60) {
        throw new ValidationError('Vertical leap must be between 0 and 60 inches');
      }
      this.props.verticalLeap = scores.verticalLeap;
    }

    if (scores.broadJump !== undefined) {
      if (scores.broadJump <= 0 || scores.broadJump > 200) {
        throw new ValidationError('Broad jump must be between 0 and 200 inches');
      }
      this.props.broadJump = scores.broadJump;
    }

    if (scores.threeCone !== undefined) {
      if (scores.threeCone <= 0 || scores.threeCone > 15) {
        throw new ValidationError('Three cone must be between 0 and 15 seconds');
      }
      this.props.threeCone = scores.threeCone;
    }

    if (scores.twentyYardShuttle !== undefined) {
      if (scores.twentyYardShuttle <= 0 || scores.twentyYardShuttle > 10) {
        throw new ValidationError('Twenty yard shuttle must be between 0 and 10 seconds');
      }
      this.props.twentyYardShuttle = scores.twentyYardShuttle;
    }

    if (scores.benchPress !== undefined) {
      if (scores.benchPress < 0) {
        throw new ValidationError('Bench press cannot be negative');
      }
      this.props.benchPress = scores.benchPress;
    }

    this.props.updatedAt = new Date();
  }

  public markAsDrafted(teamId: number, draftYear: number, draftPickId?: number): void {
    if (this.props.drafted) {
      throw new ValidationError('Prospect is already drafted');
    }

    if (teamId <= 0) {
      throw new ValidationError('Team ID must be positive');
    }

    if (draftYear < 1990 || draftYear > 2030) {
      throw new ValidationError('Draft year must be between 1990 and 2030');
    }

    this.props.drafted = true;
    this.props.teamId = teamId;
    this.props.draftYear = draftYear;
    if (draftPickId) {
      this.props.draftPickId = draftPickId;
    }
    this.props.updatedAt = new Date();
  }

  public markAsUndrafted(): void {
    this.props.drafted = false;
    this.props.teamId = undefined;
    this.props.draftPickId = undefined;
    this.props.updatedAt = new Date();
  }

  public hasCompleteCombineScores(): boolean {
    return !!(
      this.props.fortyTime &&
      this.props.tenYardSplit &&
      this.props.verticalLeap &&
      this.props.broadJump &&
      this.props.threeCone &&
      this.props.twentyYardShuttle &&
      this.props.benchPress !== undefined
    );
  }

  public getAthleteScore(): number {
    // Simple athleticism scoring based on combine results
    if (!this.hasCompleteCombineScores()) {
      return 0;
    }

    let score = 0;
    
    // Forty time (lower is better, scale 0-100)
    if (this.props.fortyTime) {
      score += Math.max(0, 100 - ((this.props.fortyTime - 4.0) * 50));
    }

    // Vertical leap (higher is better)
    if (this.props.verticalLeap) {
      score += Math.min(100, (this.props.verticalLeap / 45) * 100);
    }

    // Bench press (higher is better, but with diminishing returns)
    if (this.props.benchPress !== undefined) {
      score += Math.min(100, (this.props.benchPress / 30) * 100);
    }

    return Math.round(score / 3); // Average of the three main metrics
  }

  public toPersistence(): {
    id?: number;
    firstName: string;
    lastName: string;
    position: string;
    college: string;
    height: number;
    weight: number;
    handSize?: number;
    armLength?: number;
    homeCity?: string;
    homeState?: string;
    fortyTime?: number;
    tenYardSplit?: number;
    verticalLeap?: number;
    broadJump?: number;
    threeCone?: number;
    twentyYardShuttle?: number;
    benchPress?: number;
    drafted: boolean;
    draftYear: number | null;
    teamId?: number;
    draftPickId?: number;
  } {
    return {
      id: this.props.id,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      position: this.props.position,
      college: this.props.college,
      height: this.props.height,
      weight: this.props.weight,
      handSize: this.props.handSize,
      armLength: this.props.armLength,
      homeCity: this.props.homeCity,
      homeState: this.props.homeState,
      fortyTime: this.props.fortyTime,
      tenYardSplit: this.props.tenYardSplit,
      verticalLeap: this.props.verticalLeap,
      broadJump: this.props.broadJump,
      threeCone: this.props.threeCone,
      twentyYardShuttle: this.props.twentyYardShuttle,
      benchPress: this.props.benchPress,
      drafted: this.props.drafted,
      draftYear: this.props.draftYear ?? null,
      teamId: this.props.teamId,
      draftPickId: this.props.draftPickId,
    };
  }

  public equals(other: Prospect): boolean {
    return this.props.id === other.props.id;
  }
}