"use client";

import { useEffect, useState } from "react";
import { parseHash, type PageId } from "./router";

/**
 * Hash-router hook — emulates full page navigation by listening to
 * `hashchange` and scrolling to top on every page swap. This delivers
 * an MPA feel while remaining compatible with the single-route sandbox.
 */
export function useHashRoute(): PageId {
  const [route, setRoute] = useState<PageId>(() => parseHash());

  useEffect(() => {
    const onChange = () => {
      const next = parseHash();
      setRoute((prev) => (prev === next ? prev : next));
      // emulate full page reload — scroll to top + reset focus
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onChange);
    // initial mount
    onChange();
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
