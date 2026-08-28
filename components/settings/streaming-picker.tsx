"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setStreamingServices } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TMDB_IMAGE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export type ServiceOption = { id: string; name: string; logoPath: string | null };

/** Toggle-grid of streaming services the user subscribes to. */
export function StreamingPicker({
  services,
  initialSelected,
}: {
  services: ServiceOption[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const res = await setStreamingServices([...selected]);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {services.map((s) => {
          const on = selected.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={on}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors",
                on ? "border-primary bg-primary/10" : "border-input bg-card hover:border-ring",
              )}
            >
              {on && (
                <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <div className="h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                {s.logoPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${TMDB_IMAGE}/w92${s.logoPath}`}
                    alt={s.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight">
                {s.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save services"}
        </Button>
        {saved && <span className="text-sm text-primary">Saved.</span>}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {selected.size} selected
        </span>
      </div>
    </div>
  );
}
