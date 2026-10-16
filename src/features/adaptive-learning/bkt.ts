import type { ConceptMastery } from "@/types/domain";

export interface BktParameters {
  initialMastery: number;
  learnProbability: number;
  guessProbability: number;
  slipProbability: number;
}

function assertProbability(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a probability between 0 and 1.`);
  }
}

/**
 * One BKT update: infer mastery after an observed response, then apply the
 * chance of learning from that practice. Defaults are illustrative demo values,
 * not calibrated or validated educational parameters.
 */
export function updateMastery(
  priorMastery: number,
  answeredCorrectly: boolean,
  parameters: BktParameters,
): number {
  assertProbability("priorMastery", priorMastery);
  assertProbability("learnProbability", parameters.learnProbability);
  assertProbability("guessProbability", parameters.guessProbability);
  assertProbability("slipProbability", parameters.slipProbability);

  const { guessProbability: guess, slipProbability: slip, learnProbability: learn } = parameters;
  const correctLikelihood = priorMastery * (1 - slip) + (1 - priorMastery) * guess;
  const incorrectLikelihood = priorMastery * slip + (1 - priorMastery) * (1 - guess);
  const posterior = answeredCorrectly
    ? (correctLikelihood === 0 ? priorMastery : (priorMastery * (1 - slip)) / correctLikelihood)
    : (incorrectLikelihood === 0 ? priorMastery : (priorMastery * slip) / incorrectLikelihood);

  return Math.min(1, Math.max(0, posterior + (1 - posterior) * learn));
}

export function updateConceptMastery(
  current: ConceptMastery,
  answeredCorrectly: boolean,
  parameters: BktParameters,
  now = new Date(),
): ConceptMastery {
  return {
    conceptId: current.conceptId,
    probability: updateMastery(current.probability, answeredCorrectly, parameters),
    updatedAt: now.toISOString(),
  };
}
