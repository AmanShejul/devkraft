import type { ConceptMastery, LearningMission } from "@/types/domain";

export const DEMO_MASTERY: ConceptMastery[] = [
  { conceptId: "variables", probability: 0.88 },
  { conceptId: "conditionals", probability: 0.71 },
  { conceptId: "loops", probability: 0.43 },
  { conceptId: "arrays", probability: 0.54 },
  { conceptId: "functions", probability: 0.32 },
  { conceptId: "array-iteration", probability: 0.12 },
];

export const DEMO_MISSIONS: LearningMission[] = [
  { id: "store-a-score", title: "Keep a score", description: "Give a value a name and update it as the score changes.", conceptId: "variables", estimatedMinutes: 8, difficulty: "starter" },
  { id: "choose-a-route", title: "Choose a route", description: "Use a condition to choose which action to take.", conceptId: "conditionals", estimatedMinutes: 9, difficulty: "starter" },
  { id: "loop-count", title: "Count it down", description: "Use a loop to keep score as a counter changes.", conceptId: "loops", estimatedMinutes: 12, difficulty: "starter" },
  { id: "array-basics", title: "A list of favorites", description: "Build a small array and pick out the values you need.", conceptId: "arrays", estimatedMinutes: 10, difficulty: "starter" },
  { id: "function-helper", title: "Make a helper", description: "Turn repeated steps into a reusable function.", conceptId: "functions", estimatedMinutes: 14, difficulty: "developing" },
  { id: "array-walk", title: "Walk the collection", description: "Combine arrays and loops to summarize a list.", conceptId: "array-iteration", estimatedMinutes: 18, difficulty: "developing" },
];

export const DEMO_RECENT_ACTIVITY = [
  { label: "Completed: Branching paths", detail: "Conditionals · 8 min", time: "Yesterday", icon: "check" },
  { label: "Practiced: Variable values", detail: "Variables · 12 min", time: "Mon", icon: "code" },
  { label: "Started: A list of favorites", detail: "Arrays · 3 min", time: "Mon", icon: "book" },
] as const;
