export interface LearnerSnapshot {
  id: string;
  name: string;
  initials: string;
  progress: number;
  activity: string;
  mastery: Readonly<Record<string, number>>;
}

export interface ClassSummary {
  learnerCount: number;
  onTrackCount: number;
  averageProgress: number;
  conceptWeaknesses: { conceptId: string; averageMastery: number; learnersBelowThreshold: number }[];
}

/** Aggregates sample or authenticated snapshots without coupling analytics to the UI. */
export function summarizeClass(learners: readonly LearnerSnapshot[], threshold = 0.65): ClassSummary {
  const conceptIds = [...new Set(learners.flatMap((learner) => Object.keys(learner.mastery)))];
  const conceptWeaknesses = conceptIds.map((conceptId) => {
    const scores = learners.flatMap((learner) => typeof learner.mastery[conceptId] === "number" ? [learner.mastery[conceptId]] : []);
    return {
      conceptId,
      averageMastery: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      learnersBelowThreshold: learners.filter((learner) => (learner.mastery[conceptId] ?? 0) < threshold).length,
    };
  }).sort((a, b) => a.averageMastery - b.averageMastery || a.conceptId.localeCompare(b.conceptId));

  return {
    learnerCount: learners.length,
    onTrackCount: learners.filter((learner) => learner.progress >= threshold * 100).length,
    averageProgress: learners.length ? Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length) : 0,
    conceptWeaknesses,
  };
}
