import { LEARNING_CONFIG } from "@/config/learning";
import { updateConceptMastery } from "@/features/adaptive-learning/bkt";
import type { ConceptMastery } from "@/types/domain";

export const COUNTDOWN_MISSION_CONCEPTS = ["loops"] as const;

export function updateMissionMasteryFromSubmission(
  currentMastery: readonly ConceptMastery[],
  answeredCorrectly: boolean,
  now = new Date(),
): ConceptMastery[] {
  const mastery = new Map(currentMastery.map((item) => [item.conceptId, item]));
  for (const conceptId of COUNTDOWN_MISSION_CONCEPTS) {
    const current = mastery.get(conceptId) ?? {
      conceptId,
      probability: LEARNING_CONFIG.bkt.initialMastery,
    };
    mastery.set(conceptId, updateConceptMastery(current, answeredCorrectly, LEARNING_CONFIG.bkt, now));
  }
  return [...mastery.values()];
}
