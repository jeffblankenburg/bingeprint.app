"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import {
  sendLoginCode,
  verifyLoginCode,
  type LoginState,
} from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";

const INITIAL: LoginState = { ok: false };

export function LoginForm({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState(sendLoginCode, INITIAL);
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyLoginCode,
    INITIAL,
  );

  const sent = sendState.sent === true;
  const email = sendState.email ?? "";

  useEffect(() => {
    if (sent) track("signup_started", { method: "magic_link" });
  }, [sent]);

  if (!sent) {
    return (
      <form action={sendAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            autoFocus
          />
        </div>
        {sendState.error && (
          <p className="text-sm text-destructive">{sendState.error}</p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={sending}>
          {sending ? "Sending…" : "Send me a login link"}
        </Button>
        <p className="text-center font-mono text-xs text-muted-foreground">
          No password. We&rsquo;ll email you a link and a code.
        </p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <label htmlFor="token" className="text-sm font-medium">
          Enter the 6-digit code
        </label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          required
          autoFocus
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
        <p className="text-sm text-muted-foreground">
          Sent to <span className="text-foreground">{email}</span>. Or just click
          the link in the email.
        </p>
      </div>
      {verifyState.error && (
        <p className="text-sm text-destructive">{verifyState.error}</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={verifying}>
        {verifying ? "Verifying…" : "Verify & continue"}
      </Button>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        {/* Resend re-submits this form's email to the send action. */}
        <button
          type="submit"
          formAction={sendAction}
          className="underline-offset-4 hover:underline"
        >
          Resend code
        </button>
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="underline-offset-4 hover:underline"
        >
          Use a different email
        </Link>
      </div>
    </form>
  );
}
