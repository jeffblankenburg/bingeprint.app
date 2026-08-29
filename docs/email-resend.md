# Email setup (Resend) — deferred, do this when we're ready

Two things need real email delivery, and both should go through **Resend**:

1. **Auth emails** (magic link + OTP). Today these use Supabase's built-in SMTP —
   heavily rate-limited (~2–4/hour), poor deliverability, often spam. Fine for
   dev, not for real users.
2. **Notification emails** (new-episode alerts, digests) for M8 — not built yet.

The `resend` npm package is already installed, and `.env.example` already stubs
`RESEND_API_KEY` and `EMAIL_FROM`. Domain `bingeprint.app` is live on Cloudflare DNS.

---

## 1. Resend account + verify the domain

1. Sign up at resend.com; create the team/project.
2. **Add domain** `bingeprint.app`. Resend shows DNS records — add them **in
   Cloudflare, all DNS-only (grey cloud)**. They'll look like:
   - **MX** on `send.bingeprint.app` → `feedback-smtp.<region>.amazonses.com` (priority 10)
   - **TXT (SPF)** on `send.bingeprint.app` → `v=spf1 include:amazonses.com ~all`
   - **TXT (DKIM)** on `resend._domainkey.bingeprint.app` → (long key from Resend)
   - **TXT (DMARC)** on `_dmarc.bingeprint.app` → `v=DMARC1; p=none;` (start at
     `none`, monitor, then tighten to `quarantine`/`reject`)

   > Use the exact records Resend gives you — the above is the shape, not the values.
3. Wait for **Verified** (green).
4. Create an **API key** → this is `RESEND_API_KEY`.
5. Pick a From address, e.g. `Bingeprint <hello@bingeprint.app>` (or `noreply@`).

---

## 2. Point Supabase Auth at Resend (fixes magic-link / OTP delivery)

Resend SMTP credentials:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | your `RESEND_API_KEY` |
| Sender | `hello@bingeprint.app` |

**Option A — versioned via `supabase/config.toml` (preferred).** Fill in the
`[auth.email.smtp]` block (currently commented out):

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 465
user = "resend"
pass = "env(RESEND_API_KEY)"     # references the secret, not committed
admin_email = "hello@bingeprint.app"
sender_name = "Bingeprint"
```

Then set the secret and push:

```bash
supabase secrets set RESEND_API_KEY=re_xxx   # for the hosted project
supabase config push
```

Also bump the auth send limit now that delivery is real — in `[auth.rate_limit]`
raise `email_sent` (default 2) to something sane (e.g. 30).

**Option B — Supabase dashboard.** Authentication → Emails → SMTP Settings →
enable custom SMTP with the creds above.

The branded magic-link template (already configured, includes `{{ .Token }}` + the
link) renders regardless of provider.

---

## 3. App notification emails (M8 — build alongside notifications)

Set env everywhere (local `.env.local` + Vercel prod & preview):

```
RESEND_API_KEY=re_xxx
EMAIL_FROM="Bingeprint <hello@bingeprint.app>"
```

Add a thin sender (keep the app channel-agnostic):

```ts
// lib/notifications/email.ts
import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) return; // no-op when unconfigured
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Bingeprint <hello@bingeprint.app>",
    ...opts,
  });
}
```

Then the notification subsystem (still to build for M8):

- Tables: `release_events`, `notification_preferences`, `notifications` (internal
  queue — generate events, don't send inline).
- `check-releases` cron detects new/announced episodes for followed shows →
  writes `notifications` rows honoring `notification_preferences`.
- `send-notifications` cron delivers pending `notifications` via `sendEmail()`.
- Analytics: `notification_generated` / `notification_delivered` / `notification_opened`.
- Keep the delivery layer swappable so web/mobile push can be added later.

---

## 4. Verify

- Trigger a magic-link login → email arrives from `bingeprint.app` via Resend,
  not spam. Check headers: `SPF=pass`, `DKIM=pass`, `DMARC=pass`.
- Send a test notification email.
- Resend dashboard shows the delivery.

## Notes

- All Resend DNS records are **DNS-only** in Cloudflare (email records aren't proxied).
- Start DMARC at `p=none`; only tighten after confirming SPF/DKIM pass.
- Watch Resend's free-tier send limits; upgrade when volume grows.
