"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Layers, ArrowRight } from "lucide-react";
import { hrefFor, type PageId } from "../_lib/router";

/**
 * RelatedTopics — reusable cross-page navigation component.
 * Drop into any page to show "Related topics" with links to
 * conceptually connected pages.
 *
 * Usage:
 *   <RelatedTopics
 *     topics={[
 *       { id: "streaming", reason: "Kafka for real-time CDC" },
 *       { id: "databricks", reason: "Spark for transform" },
 *     ]}
 *   />
 */

interface RelatedTopic {
  id: PageId;
  reason: string;
}

export function RelatedTopics({ topics }: { topics: RelatedTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-primary" /> Related topics — cross-page navigation
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        {topics.map((t, i) => (
          <span key={t.id} className="flex items-center gap-1">
            <Link href={hrefFor(t.id)} className="text-primary hover:underline">
              → {t.reason}
            </Link>
            {i < topics.length - 1 && <span className="text-muted-foreground">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
