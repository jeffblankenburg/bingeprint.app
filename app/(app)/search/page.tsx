import type { Metadata } from "next";
import { LiveSearch } from "@/components/search/live-search";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Find something
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Search</h1>
      </div>
      <LiveSearch />
    </div>
  );
}
