import { buildMentorHint } from "@/features/ai-mentor";
import { apiFailure, apiSuccess } from "@/types/api";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 });
  }

  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).query !== "string") {
    return Response.json(apiFailure("INVALID_QUERY", "A question is required."), { status: 400 });
  }
  const { query, conceptId } = body as Record<string, unknown>;
  if ((query as string).trim().length === 0 || (query as string).length > 2_000) {
    return Response.json(apiFailure("INVALID_QUERY", "Question must contain 1 to 2,000 characters."), { status: 400 });
  }
  if (conceptId !== undefined && (typeof conceptId !== "string" || conceptId.length > 80)) {
    return Response.json(apiFailure("INVALID_CONCEPT", "Concept id must be a short string."), { status: 400 });
  }

  return Response.json(apiSuccess(buildMentorHint(query as string, conceptId as string | undefined)));
}
