import { z } from "zod";
import { findOrCreateDemoStudent } from "@/features/student-portal/demo-profile-store";
import { clearDemoStudentSession, isStudentDemoModeEnabled, setDemoStudentSession } from "@/lib/auth/student-session";
import { apiFailure, apiSuccess } from "@/types/api";

const credentialsSchema = z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(1024) }).strict();

export async function POST(request: Request): Promise<Response> {
  if (!isStudentDemoModeEnabled()) {
    return Response.json(apiFailure("DEMO_MODE_DISABLED", "Demo student access is disabled. Use your assigned student account."), { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json(apiFailure("INVALID_JSON", "Request body must be valid JSON."), { status: 400 });
  }
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return Response.json(apiFailure("INVALID_CREDENTIALS", "Enter any non-empty email or name and password."), { status: 400 });

  try {
    const { profile, created } = await findOrCreateDemoStudent(parsed.data.email);
    await setDemoStudentSession(profile.id);
    return Response.json(apiSuccess({ profile, created, demoMode: true }));
  } catch {
    return Response.json(apiFailure("DEMO_PROFILE_SAVE_FAILED", "The demo profile could not be saved. Please retry."), { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  await clearDemoStudentSession();
  return Response.json(apiSuccess({ signedOut: true }));
}
