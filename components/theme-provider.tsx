"use client";

import { useEffect } from "react";
import { getTheme, applyTheme } from "@/lib/preferences";

/**
 * Applies theme from localStorage on mount and listens for system preference changes when theme is "system".
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}
