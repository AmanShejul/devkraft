export class PersistenceConfigurationError extends Error {
  readonly code = "PERSISTENCE_NOT_CONFIGURED";

  constructor(resource: string) {
    super(`${resource} requires Supabase persistence in production. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.`);
    this.name = "PersistenceConfigurationError";
  }
}

/** Local JSON storage is allowed for the intentional unauthenticated demo fallback, but is not durable on serverless hosts. */
export function assertLocalPersistenceAllowed(resource: string, demoMode = false): void {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const demoFallback = !supabaseConfigured || process.env.STUDENT_DEMO_MODE === "true" || process.env.TEACHER_DEMO_MODE === "true";
  if (process.env.NODE_ENV === "production" && !demoMode && !demoFallback) throw new PersistenceConfigurationError(resource);
}

export function isPersistenceConfigurationError(error: unknown): error is PersistenceConfigurationError {
  return error instanceof PersistenceConfigurationError;
}

export function persistenceErrorDetails(error: unknown, fallbackCode: string, fallbackMessage: string): { code: string; message: string; status: 500 | 503 } {
  return isPersistenceConfigurationError(error)
    ? { code: error.code, message: error.message, status: 503 }
    : { code: fallbackCode, message: fallbackMessage, status: 500 };
}
