import type { LearningMission } from "@/types/domain";

export const LEARNING_MISSIONS: LearningMission[] = [
  { id: "store-a-score", title: "Keep a score", description: "Give a value a name and update it as the score changes.", conceptId: "variables", estimatedMinutes: 8, difficulty: "starter" },
  { id: "choose-a-route", title: "Choose a route", description: "Use a condition to choose which action to take.", conceptId: "conditionals", estimatedMinutes: 9, difficulty: "starter" },
  { id: "loop-count", title: "Count it down", description: "Use a loop to keep score as a counter changes.", conceptId: "loops", estimatedMinutes: 12, difficulty: "starter" },
  { id: "array-basics", title: "A list of favorites", description: "Build a small array and pick out the values you need.", conceptId: "arrays", estimatedMinutes: 10, difficulty: "starter" },
  { id: "function-helper", title: "Make a helper", description: "Turn repeated steps into a reusable function.", conceptId: "functions", estimatedMinutes: 14, difficulty: "developing" },
  { id: "array-walk", title: "Walk the collection", description: "Combine arrays and loops to summarize a list.", conceptId: "array-iteration", estimatedMinutes: 18, difficulty: "developing" },
];
