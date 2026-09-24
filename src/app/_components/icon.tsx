"use client";

import * as Icons from "lucide-react";
import { type LucideProps } from "lucide-react";

interface IconProps extends LucideProps {
  name: string;
}

/**
 * Renders any lucide icon by name — used to keep the router meta declarative.
 */
export function Icon({ name, ...props }: IconProps) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp {...props} />;
}
