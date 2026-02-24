// src/modules/draft-analysis/domain/value-objects/CareerGrade.vo.ts
export type CareerGradeType = 'Elite' | 'Starter' | 'Backup' | 'Bust' | 'TBD';

export class CareerGrade {
  private constructor(
    public readonly grade: CareerGradeType,
    public readonly proBowls: number,
    public readonly allPros: number,
    public readonly yearsAsStarter: number
  ) {}

  static create(
    proBowls: number,
    allPros: number,
    yearsAsStarter: number,
    yearsInLeague: number
  ): CareerGrade {
    let grade: CareerGradeType;

    if (yearsInLeague < 3) {
      grade = 'TBD';
    } else if (allPros >= 2 || proBowls >= 3) {
      grade = 'Elite';
    } else if (yearsAsStarter >= 3 || proBowls >= 1) {
      grade = 'Starter';
    } else if (yearsInLeague >= 3 && yearsAsStarter < 2) {
      grade = 'Backup';
    } else {
      grade = 'Bust';
    }

    return new CareerGrade(grade, proBowls, allPros, yearsAsStarter);
  }

  static fromGradeType(grade: CareerGradeType): CareerGrade {
    return new CareerGrade(grade, 0, 0, 0);
  }

  isSuccessful(draftRound: number): boolean {
    if (this.grade === 'TBD') return false;
    
    if (draftRound === 1) {
      return this.grade === 'Elite' || this.grade === 'Starter';
    }
    if (draftRound <= 3) {
      return this.grade !== 'Bust';
    }
    return this.grade === 'Elite' || this.grade === 'Starter';
  }

  toNumericValue(): number {
    switch (this.grade) {
      case 'Elite': return 95;
      case 'Starter': return 70;
      case 'Backup': return 40;
      case 'Bust': return 10;
      case 'TBD': return 50;
    }
  }
}