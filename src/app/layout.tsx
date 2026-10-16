import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillPath | Your Skills. Your Path. Your Progress.", template: "%s | SkillPath" },
  description: "A guided coding-learning workspace for practice, feedback, and steady progress.",
  applicationName: "SkillPath",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
