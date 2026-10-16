import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/authorization";
import { hasAppRole } from "@/lib/auth/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireWorkspaceRole(role: AppRole): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login/${role}`);
  if (!hasAppRole(user, role)) redirect(`/login/${role}?reason=role`);
}