import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/layout/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillPath — Learn with direction.", template: "%s | SkillPath" },
  description: "A coding path shaped around what you know—and what you need next.",
  applicationName: "SkillPath",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
