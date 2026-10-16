import type { Concept, ConceptId } from "@/types/domain";

export const CONCEPT_GRAPH: readonly Concept[] = [
  { id: "variables", title: "Variables & values", description: "Store and use information.", prerequisites: [] },
  { id: "conditionals", title: "Conditionals", description: "Make decisions with boolean conditions.", prerequisites: ["variables"] },
  { id: "loops", title: "Loops", description: "Repeat work with controlled iteration.", prerequisites: ["variables", "conditionals"] },
  { id: "arrays", title: "Arrays", description: "Group ordered values in a collection.", prerequisites: ["variables"] },
  { id: "functions", title: "Functions", description: "Package reusable behavior with inputs and outputs.", prerequisites: ["variables"] },
  { id: "array-iteration", title: "Array iteration", description: "Visit and transform each value in an array.", prerequisites: ["arrays", "loops"] },
];

export function getConcept(conceptId: ConceptId): Concept | undefined {
  return CONCEPT_GRAPH.find((concept) => concept.id === conceptId);
}

export function getUnmetPrerequisites(
  conceptId: ConceptId,
  masteryByConcept: Readonly<Record<ConceptId, number>>,
  threshold = 0.65,
): ConceptId[] {
  const concept = getConcept(conceptId);
  if (!concept) return [];
  return concept.prerequisites.filter((id) => (masteryByConcept[id] ?? 0) < threshold);
}

export function isConceptEligible(
  conceptId: ConceptId,
  masteryByConcept: Readonly<Record<ConceptId, number>>,
  threshold = 0.65,
): boolean {
  if (!getConcept(conceptId)) return false;
  return getUnmetPrerequisites(conceptId, masteryByConcept, threshold).length === 0;
}
