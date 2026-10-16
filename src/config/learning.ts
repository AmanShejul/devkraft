export const LEARNING_CONFIG = {
  masteryThreshold: 0.65,
  bkt: {
    // Illustrative defaults only; these have not been calibrated against learner data.
    // initialMastery = P(L0), the starting probability that the learner knows a concept.
    initialMastery: 0.2,
    // learnProbability = P(T), the chance practice changes unknown to known.
    learnProbability: 0.15,
    // guessProbability = P(G), chance of a correct response without mastery.
    guessProbability: 0.2,
    // slipProbability = P(S), chance of an incorrect response despite mastery.
    slipProbability: 0.1,
  },
} as const;
