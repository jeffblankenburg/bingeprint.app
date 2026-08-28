"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: ProfileState = { ok: false };

export function ProfileForm({
  displayName,
  username,
  isPublic,
}: {
  displayName: string;
  username: string;
  isPublic: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="display_name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName}
          placeholder="Jeff"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">bingeprint.app/</span>
          <Input
            id="username"
            name="username"
            defaultValue={username}
            placeholder="jeff"
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your public profile URL. 3–30 characters: a–z, 0–9, underscore.
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-md border bg-card px-3 py-3">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={isPublic}
          className="size-4 accent-[var(--primary)]"
        />
        <span className="text-sm">
          <span className="font-medium">Make my Bingeprint public</span>
          <span className="block text-xs text-muted-foreground">
            Off by default. When on, anyone with your URL can see your profile.
          </span>
        </span>
      </label>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="text-sm text-primary">Saved.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
