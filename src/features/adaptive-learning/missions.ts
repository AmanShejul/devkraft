import type { ConceptId, LearningMission } from "@/types/domain";
import { isConceptEligible } from "./concept-graph";

export interface MissionSelection {
  mission: LearningMission;
  targetMastery: number;
}

/** Picks the least-mastered mission whose prerequisites have reached threshold. */
export function selectNextMission(
  missions: readonly LearningMission[],
  masteryByConcept: Readonly<Record<ConceptId, number>>,
  threshold = 0.65,
): MissionSelection | null {
  const eligible = missions
    .filter((mission) => isConceptEligible(mission.conceptId, masteryByConcept, threshold))
    .map((mission) => ({ mission, targetMastery: masteryByConcept[mission.conceptId] ?? 0 }))
    .sort((a, b) => a.targetMastery - b.targetMastery || a.mission.id.localeCompare(b.mission.id));

  return eligible[0] ?? null;
}
