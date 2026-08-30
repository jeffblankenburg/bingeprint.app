"use client";

import { useState } from "react";
import { RecCard, type RecItem } from "@/components/recommendations/rec-card";

/**
 * A horizontally-scrolling recommendation row. Shows a window of `size` cards
 * and keeps the rest as reserve: when a card gets feedback (add / already
 * watched / not for me) it's removed and the next reserve pick slides into the
 * window, so acting on a rec always brings a fresh one forward.
 */
export function RecRow({ items, size = 12 }: { items: RecItem[]; size?: number }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = items.filter((i) => !removed.has(i.showId)).slice(0, size);
  if (visible.length === 0) return null;

  function drop(showId: string) {
    setRemoved((prev) => {
      const next = new Set(prev);
      next.add(showId);
      return next;
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {visible.map((item) => (
        <RecCard key={item.showId} {...item} onDone={drop} />
      ))}
    </div>
  );
}
