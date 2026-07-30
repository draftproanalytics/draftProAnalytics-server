import { RosterPlayer } from "./repositories/ITeamRosterRepository";
import { TeamNeedSuggestionDto } from "../dtos/TeamNeedDtos";

export interface AnalyzeTeamNeedsOptions {
  evaluationYear: number;
  draftYear: number;
}

export class TeamNeedsAnalyzerService {
  public analyze(
    roster: RosterPlayer[],
    options: AnalyzeTeamNeedsOptions
  ): TeamNeedSuggestionDto[] {
    const evaluationYear = options.evaluationYear;

    // Normalize positions into a small stable set the UI can work with.
    const POSITIONS: string[] = [
      "QB","RB","WR","TE",
      "OT","OG","C",
      "EDGE","DT","LB","CB","S",
      "K","P"
    ];

    const byPos = new Map<string, RosterPlayer[]>();
    for (const p of POSITIONS) byPos.set(p, []);

    for (const rp of roster) {
      const norm = this.normalizePosition(rp.position);
      if (!norm) continue;
      const bucket = byPos.get(norm);
      if (!bucket) continue;
      // treat currentTeam + isActive as “on roster”
      if (!rp.currentTeam) continue;
      if (rp.isActive !== null && rp.isActive === 0) continue;
      bucket.push(rp);
    }

    const suggestions: TeamNeedSuggestionDto[] = [];

    for (const pos of POSITIONS) {
      const players = byPos.get(pos) ?? [];
      const rosterCount = players.length;

      const ages: number[] = players
        .map((p) => p.age)
        .filter((a): a is number => typeof a === "number" && Number.isFinite(a));

      const avgAge =
        ages.length > 0 ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10 : null;

      const expiringCount = players.filter((p) => {
        if (p.endYear === null || typeof p.endYear !== "number") return false;
        return p.endYear <= evaluationYear;
      }).length;

      const { priority, reasons } = this.scorePositionNeed(pos, rosterCount, avgAge, expiringCount);

      // Opinionated: don’t spam “priority 1” lines; only emit meaningful needs.
      if (priority >= 2) {
        suggestions.push({
          position: pos,
          priority,
          draftYear: options.draftYear,
          reasons,
          rosterCount,
          avgAge,
          expiringCount
        });
      }
    }

    // Highest first
    suggestions.sort((a, b) => b.priority - a.priority || a.position.localeCompare(b.position));
    return suggestions;
  }

  private normalizePosition(position: string | null): string | null {
    if (!position) return null;
    const p = position.trim().toUpperCase();

    // common exact codes
    if (["QB","RB","WR","TE","OT","OG","C","DT","DE","EDGE","LB","CB","S","FS","SS","K","P"].includes(p)) {
      if (p === "DE") return "EDGE";
      if (p === "FS" || p === "SS") return "S";
      return p;
    }

    // common full names
    if (p.includes("QUARTER")) return "QB";
    if (p.includes("RUNNING")) return "RB";
    if (p.includes("WIDE")) return "WR";
    if (p.includes("TIGHT")) return "TE";
    if (p.includes("TACKLE")) return "OT";
    if (p.includes("GUARD")) return "OG";
    if (p === "CENTER") return "C";
    if (p.includes("CORNER")) return "CB";
    if (p.includes("SAFETY")) return "S";
    if (p.includes("LINEBACK")) return "LB";
    if (p.includes("DEFENSIVE END")) return "EDGE";
    if (p.includes("EDGE")) return "EDGE";
    if (p.includes("DEFENSIVE TACKLE") || p === "NOSE") return "DT";
    if (p.includes("KICKER")) return "K";
    if (p.includes("PUNTER")) return "P";

    return null;
  }

  private scorePositionNeed(
    position: string,
    rosterCount: number,
    avgAge: number | null,
    expiringCount: number
  ): { priority: number; reasons: string[] } {
    const reasons: string[] = [];
    let priority = 1;

    if (rosterCount === 0) {
      priority = 5;
      reasons.push("No active players on roster at this position.");
      return { priority, reasons };
    }

    if (rosterCount === 1) {
      priority = 4;
      reasons.push("Only 1 active roster player at this position.");
    } else if (rosterCount === 2) {
      priority = 3;
      reasons.push("Only 2 active roster players at this position.");
    } else if (rosterCount === 3) {
      priority = 2;
      reasons.push("Thin depth (3 active roster players).");
    }

    // Age pressure (opinionated thresholds)
    const ageThreshold = this.ageThreshold(position);
    if (avgAge !== null && avgAge >= ageThreshold) {
      priority = Math.min(5, Math.max(priority, 3));
      reasons.push(`Aging group (avg age ${avgAge} ≥ ${ageThreshold}).`);
    }

    if (expiringCount >= 2) {
      priority = Math.min(5, Math.max(priority, 3));
      reasons.push(`${expiringCount} contracts end by evaluation year.`);
    } else if (expiringCount === 1 && priority >= 2) {
      reasons.push("1 contract ends by evaluation year.");
    }

    // Don’t emit fluff
    if (priority === 1) reasons.push("Roster appears stable at this position.");

    return { priority, reasons };
  }

  private ageThreshold(position: string): number {
    switch (position) {
      case "QB": return 33;
      case "RB": return 28;
      case "WR": return 30;
      case "TE": return 31;
      case "OT":
      case "OG":
      case "C": return 32;
      case "EDGE":
      case "DT":
      case "LB": return 31;
      case "CB":
      case "S": return 30;
      default: return 30;
    }
  }
}

