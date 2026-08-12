import { ValidationError } from '@/shared/errors/AppError';

export interface CombineScoreProps {
  id?: number;
  playerId?: number;
  prospectId?: number;
  height?: number;
  weight?: number;
  handSize?: number;
  armLength?: number;
  fortyTime?: number;
  tenYardSplit?: number;
  twentyYardShuttle?: number;
  threeCone?: number;
  verticalLeap?: number;
  broadJump?: number;
  benchPress?: number;
}

export class CombineScore {
  private constructor(private props: CombineScoreProps) {
    this.validate();
  }

  public static create(props: CombineScoreProps): CombineScore {
    return new CombineScore(props);
  }

  public static fromPersistence(data: {
    id: number;
    playerId?: number | null;
    prospectId?: number | null;
    height?: number | null;
    weight?: number | null;
    handSize?: number | null;
    armLength?: number | null;
    fortyTime?: number | null;
    tenYardSplit?: number | null;
    twentyYardShuttle?: number | null;
    threeCone?: number | null;
    verticalLeap?: number | null;
    broadJump?: number | null;
    benchPress?: number | null;
  }): CombineScore {
    return new CombineScore({
      id: data.id,
      playerId: data.playerId ?? undefined,
      prospectId: data.prospectId ?? undefined,
      height: data.height ?? undefined,
      weight: data.weight ?? undefined,
      handSize: data.handSize ?? undefined,
      armLength: data.armLength ?? undefined,
      fortyTime: data.fortyTime ?? undefined,
      tenYardSplit: data.tenYardSplit ?? undefined,
      twentyYardShuttle: data.twentyYardShuttle ?? undefined,
      threeCone: data.threeCone ?? undefined,
      verticalLeap: data.verticalLeap ?? undefined,
      broadJump: data.broadJump ?? undefined,
      benchPress: data.benchPress ?? undefined,
    });
  }

  private validate(): void {
    if (this.props.playerId !== undefined && this.props.playerId <= 0) {
      throw new ValidationError('Player ID must be positive');
    }
    if (this.props.prospectId !== undefined && this.props.prospectId <= 0) {
      throw new ValidationError('Prospect ID must be positive');
    }
    if (this.props.height !== undefined && this.props.height <= 0) {
      throw new ValidationError('Height must be positive');
    }
    if (this.props.weight !== undefined && this.props.weight <= 0) {
      throw new ValidationError('Weight must be positive');
    }
    if (this.props.handSize !== undefined && this.props.handSize <= 0) {
      throw new ValidationError('Hand size must be positive');
    }
    if (this.props.armLength !== undefined && this.props.armLength <= 0) {
      throw new ValidationError('Arm length must be positive');
    }
    if (this.props.fortyTime !== undefined && (this.props.fortyTime <= 0 || this.props.fortyTime > 10)) {
      throw new ValidationError('Forty time must be between 0 and 10 seconds');
    }
    if (this.props.tenYardSplit !== undefined && (this.props.tenYardSplit <= 0 || this.props.tenYardSplit > 5)) {
      throw new ValidationError('Ten yard split must be between 0 and 5 seconds');
    }
    if (this.props.twentyYardShuttle !== undefined && (this.props.twentyYardShuttle <= 0 || this.props.twentyYardShuttle > 10)) {
      throw new ValidationError('Twenty yard shuttle must be between 0 and 10 seconds');
    }
    if (this.props.threeCone !== undefined && (this.props.threeCone <= 0 || this.props.threeCone > 15)) {
      throw new ValidationError('Three cone drill must be between 0 and 15 seconds');
    }
    if (this.props.verticalLeap !== undefined && (this.props.verticalLeap <= 0 || this.props.verticalLeap > 60)) {
      throw new ValidationError('Vertical leap must be between 0 and 60 inches');
    }
    if (this.props.broadJump !== undefined && (this.props.broadJump <= 0 || this.props.broadJump > 200)) {
      throw new ValidationError('Broad jump must be between 0 and 200 inches');
    }
    if (this.props.benchPress !== undefined && this.props.benchPress < 0) {
      throw new ValidationError('Bench press cannot be negative');
    }
  }

  public get id(): number | undefined { return this.props.id; }
  public get playerId(): number | undefined { return this.props.playerId; }
  public get prospectId(): number | undefined { return this.props.prospectId; }
  public get height(): number | undefined { return this.props.height; }
  public get weight(): number | undefined { return this.props.weight; }
  public get handSize(): number | undefined { return this.props.handSize; }
  public get armLength(): number | undefined { return this.props.armLength; }
  public get fortyTime(): number | undefined { return this.props.fortyTime; }
  public get tenYardSplit(): number | undefined { return this.props.tenYardSplit; }
  public get twentyYardShuttle(): number | undefined { return this.props.twentyYardShuttle; }
  public get threeCone(): number | undefined { return this.props.threeCone; }
  public get verticalLeap(): number | undefined { return this.props.verticalLeap; }
  public get broadJump(): number | undefined { return this.props.broadJump; }
  public get benchPress(): number | undefined { return this.props.benchPress; }

  public updateFortyTime(time: number): void {
    if (time <= 0 || time > 10) throw new ValidationError('Forty time must be between 0 and 10 seconds');
    this.props.fortyTime = time;
  }
  public updateTenYardSplit(time: number): void {
    if (time <= 0 || time > 5) throw new ValidationError('Ten yard split must be between 0 and 5 seconds');
    this.props.tenYardSplit = time;
  }
  public updateVerticalLeap(height: number): void {
    if (height <= 0 || height > 60) throw new ValidationError('Vertical leap must be between 0 and 60 inches');
    this.props.verticalLeap = height;
  }
  public updateBroadJump(distance: number): void {
    if (distance <= 0 || distance > 200) throw new ValidationError('Broad jump must be between 0 and 200 inches');
    this.props.broadJump = distance;
  }

  public assignToPlayer(playerId: number): void {
    if (playerId <= 0) throw new ValidationError('Player ID must be positive');
    this.props.playerId = playerId;
  }

  public assignToProspect(prospectId: number): void {
    if (prospectId <= 0) throw new ValidationError('Prospect ID must be positive');
    this.props.prospectId = prospectId;
  }

  public getOverallAthleticScore(): number {
    let totalScore = 0;
    let metricCount = 0;
    if (this.props.fortyTime) { totalScore += Math.max(0, (6.0 - this.props.fortyTime) * 20); metricCount++; }
    if (this.props.verticalLeap) { totalScore += Math.min(100, this.props.verticalLeap * 2.5); metricCount++; }
    if (this.props.broadJump) { totalScore += Math.min(100, this.props.broadJump * 0.8); metricCount++; }
    if (this.props.twentyYardShuttle) { totalScore += Math.max(0, (5.0 - this.props.twentyYardShuttle) * 25); metricCount++; }
    if (this.props.threeCone) { totalScore += Math.max(0, (8.0 - this.props.threeCone) * 12.5); metricCount++; }
    if (this.props.benchPress !== undefined) { totalScore += Math.min(100, (this.props.benchPress / 30) * 100); metricCount++; }
    return metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
  }

  public isCompleteWorkout(): boolean {
    return !!(
      this.props.fortyTime &&
      this.props.tenYardSplit &&
      this.props.verticalLeap &&
      this.props.broadJump &&
      this.props.twentyYardShuttle &&
      this.props.threeCone &&
      this.props.benchPress !== undefined
    );
  }

  public toPersistence(): CombineScoreProps {
    return { ...this.props };
  }

  public equals(other: CombineScore): boolean {
    return this.props.id === other.props.id;
  }
}
