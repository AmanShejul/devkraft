import { getPublicQuestions } from "@/features/assessments";
import { apiSuccess } from "@/types/api";

export function GET(): Response {
  return Response.json(apiSuccess(getPublicQuestions()));
}
