// GreenAI/frontend/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "../components/Providers";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "GreenAI Audit Platform",
  description: "Carbon-aware monitoring for AI workloads",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
