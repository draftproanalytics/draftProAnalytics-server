// src/modules/roster/domain/value-objects/PerformanceGrade.vo.ts

/**
 * PerformanceGrade Value Object
 * Ensures performance grades are always within valid range (0-100)
 */
export class PerformanceGrade {
  private static readonly MIN_GRADE = 0
  private static readonly MAX_GRADE = 100

  private constructor(private readonly value: number) {}

  static create(grade: number): PerformanceGrade {
    if (grade < this.MIN_GRADE || grade > this.MAX_GRADE) {
      throw new Error(`Performance grade must be between ${this.MIN_GRADE} and ${this.MAX_GRADE}`)
    }

    // Round to 2 decimal places
    const rounded = Math.round(grade * 100) / 100

    return new PerformanceGrade(rounded)
  }

  getValue(): number {
    return this.value
  }

  getGradeLetter(): string {
    if (this.value >= 90) return 'A'
    if (this.value >= 80) return 'B'
    if (this.value >= 70) return 'C'
    if (this.value >= 60) return 'D'
    return 'F'
  }

  getTier(): 'Elite' | 'Good' | 'Average' | 'Below Average' | 'Poor' {
    if (this.value >= 85) return 'Elite'
    if (this.value >= 70) return 'Good'
    if (this.value >= 55) return 'Average'
    if (this.value >= 40) return 'Below Average'
    return 'Poor'
  }

  isElite(): boolean {
    return this.value >= 85
  }

  isAboveAverage(): boolean {
    return this.value >= 70
  }

  isBelowAverage(): boolean {
    return this.value < 55
  }

  equals(other: PerformanceGrade): boolean {
    return this.value === other.value
  }

  isGreaterThan(other: PerformanceGrade): boolean {
    return this.value > other.value
  }

  isLessThan(other: PerformanceGrade): boolean {
    return this.value < other.value
  }

  toString(): string {
    return this.value.toFixed(2)
  }

  toJSON(): number {
    return this.value
  }
}