// src/modules/draft-analysis/domain/value-objects/DraftGrade.vo.ts
export class DraftGrade {
  private constructor(
    public readonly grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F',
    public readonly score: number, // 0-100
    public readonly reasoning: string[]
  ) {}

static instance(
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F',
    score: number,
    reasoning?: string[]
  ): DraftGrade {
    return new DraftGrade(grade, score, reasoning || []);
  }
  static calculate(
    historicalSuccessRate: number,
    positionalAlignment: number,
    valueScore: number
  ): DraftGrade {
    const score = (historicalSuccessRate * 0.4) + 
                  (positionalAlignment * 0.35) + 
                  (valueScore * 0.25);
    
    let grade: DraftGrade['grade'];
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    return new DraftGrade(grade, score, []);
  }

  isSuccessful(): boolean {
    return this.score >= 70;
  }
}