import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function RoleHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Cambiar rol
        </Link>
        <div className="font-display font-bold text-lg">{title}</div>
        <div className="w-24 flex justify-end">{right}</div>
      </div>
    </header>
  );
}
