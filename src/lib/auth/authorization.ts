import type { User } from "@supabase/supabase-js";

export type AppRole = "student" | "teacher";

/** Reads trusted application metadata; user-editable profile metadata is not an authorization source. */
export function hasAppRole(user: User | null, role: AppRole): boolean {
  const roles = user?.app_metadata?.roles;
  return Array.isArray(roles) && roles.includes(role);
}
