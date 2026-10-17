import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Teacher sign in" };

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="relative mx-auto flex min-h-[calc(100svh-64px)] max-w-7xl items-center justify-center px-5 py-8 sm:px-8 sm:py-10">
      <LoginForm role="teacher" roleMismatch={reason === "role"} />
    </main>
  );
}
