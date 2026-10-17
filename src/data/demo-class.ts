import type { LearnerSnapshot } from "@/features/teacher-analytics/summary";

/** Explicitly scoped sample roster used only by the integrity review queue. */
export const DEMO_CLASS: LearnerSnapshot[] = [
  { id: "learner-1", name: "Jordan Lee", initials: "JL", progress: 76, activity: "Practiced yesterday", mastery: { loops: 0.3, functions: 0.45, arrays: 0.7, variables: 0.9 } },
  { id: "learner-2", name: "Sam Rivera", initials: "SR", progress: 54, activity: "Needs a next step", mastery: { loops: 0.45, functions: 0.6, arrays: 0.6, variables: 0.75 } },
  { id: "learner-3", name: "Taylor Chen", initials: "TC", progress: 41, activity: "Last active 4 days ago", mastery: { loops: 0.35, functions: 0.35, arrays: 0.6, variables: 0.55 } },
  { id: "learner-4", name: "Alex Morgan", initials: "AM", progress: 68, activity: "Practiced today", mastery: { loops: 0.58, functions: 0.65, arrays: 0.65, variables: 0.8 } },
];
