"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncExternalStore } from "react";

// Empty subscription — we just want to detect when the theme provider has mounted
const noopSubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const mounted = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme, setTheme } = useTheme();
  if (!mounted) {
    return <div className="h-9 w-9" />;
  }
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle colour theme"
      className="h-9 w-9 rounded-md border border-border/60"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
