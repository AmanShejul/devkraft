import { z } from "zod";
import { clearDemoTeacherSession, isTeacherDemoModeEnabled, setDemoTeacherSession } from "@/lib/auth/teacher-session";
import { apiFailure, apiSuccess } from "@/types/api";

const credentialsSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(1024) }).strict();

export async function POST(request: Request): Promise<Response> {
  if (!isTeacherDemoModeEnabled()) return Response.json(apiFailure("DEMO_MODE_DISABLED", "Use your authorized teacher account."), { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 }); }
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return Response.json(apiFailure("INVALID_CREDENTIALS", "Enter a valid email and non-empty password."), { status: 400 });

  await setDemoTeacherSession();
  return Response.json(apiSuccess({ email: parsed.data.email.trim().toLowerCase(), demoMode: true }));
}

export async function DELETE(): Promise<Response> {
  await clearDemoTeacherSession();
  return Response.json(apiSuccess({ signedOut: true }));
}