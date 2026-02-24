// src/modules/teamNeedsAnalysis/infrastructure/repositories/InMemoryTeamNeedsAnalysisRepository.ts
import { TeamNeedsAnalysis } from '../../domain/entities/teamNeedsAnalysis.entity';
import { ITeamNeedsAnalysisRepository } from '../../domain/repositories/ITeamNeedsAnalysisRepository';

/**
 * In-memory repository for TeamNeedsAnalysis
 * This stores analysis results in memory (could be extended to use Redis or file storage)
 * 
 * Since there's no dedicated table in the Prisma schema for storing analysis results,
 * this implementation provides a simple storage mechanism.
 * 
 * For production, you could:
 * 1. Create a new table in MySQL to persist analysis results
 * 2. Use Redis for caching
 * 3. Store as JSON in AppSetting table
 */
export class InMemoryTeamNeedsAnalysisRepository implements ITeamNeedsAnalysisRepository {
  private storage: Map<string, TeamNeedsAnalysis> = new Map();

  async save(analysis: TeamNeedsAnalysis): Promise<TeamNeedsAnalysis> {
    const key = this.getKey(analysis.teamId, analysis.seasonYear);
    this.storage.set(key, analysis);
    return analysis;
  }

  async findByTeamAndSeason(
    teamId: number,
    seasonYear: number
  ): Promise<TeamNeedsAnalysis | null> {
    const key = this.getKey(teamId, seasonYear);
    return this.storage.get(key) || null;
  }

  async findLatestByTeam(teamId: number): Promise<TeamNeedsAnalysis | null> {
    const analyses = Array.from(this.storage.values())
      .filter((a) => a.teamId === teamId)
      .sort((a, b) => b.seasonYear - a.seasonYear);

    return analyses[0] || null;
  }

  async findBySeason(seasonYear: number): Promise<TeamNeedsAnalysis[]> {
    return Array.from(this.storage.values()).filter(
      (a) => a.seasonYear === seasonYear
    );
  }

  async delete(teamId: number, seasonYear: number): Promise<void> {
    const key = this.getKey(teamId, seasonYear);
    this.storage.delete(key);
  }

  async exists(teamId: number, seasonYear: number): Promise<boolean> {
    const key = this.getKey(teamId, seasonYear);
    return this.storage.has(key);
  }

  private getKey(teamId: number, seasonYear: number): string {
    return `${teamId}:${seasonYear}`;
  }

  // Utility method for clearing cache (useful for testing)
  clear(): void {
    this.storage.clear();
  }

  // Utility method to get all analyses (for debugging)
  getAll(): TeamNeedsAnalysis[] {
    return Array.from(this.storage.values());
  }
}