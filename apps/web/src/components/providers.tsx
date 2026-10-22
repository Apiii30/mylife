"use client";

import { MotionConfig } from "motion/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!rounded-2xl !border-line !bg-[var(--glass-bg-strong)] !text-ink !backdrop-blur-2xl !shadow-xl",
            }}
          />
        </MotionConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
