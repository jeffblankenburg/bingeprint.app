import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SmpteBars, BarMeter, SMPTE_BARS } from "@/components/brand/smpte-bars";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

const QUESTIONS = [
  {
    n: "01",
    q: "What have I watched?",
    a: "Your permanent record of television — every show, every episode, across every service.",
  },
  {
    n: "02",
    q: "What should I watch next?",
    a: "Recommendations with a reason. Never “you might like this” — always “because you loved Severance, Dark, and Silo.”",
  },
  {
    n: "03",
    q: "When is it coming back?",
    a: "A personal release calendar and new-episode alerts for the shows you actually care about.",
  },
];

const SAMPLE_PRINT = [
  { label: "Drama", value: 82, color: "var(--bar-cyan)" },
  { label: "Sci-Fi", value: 68, color: "var(--bar-yellow)" },
  { label: "Mystery", value: 61, color: "var(--bar-green)" },
  { label: "Comedy", value: 54, color: "var(--bar-magenta)" },
];

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <TrackOnMount event="landing_page_viewed" />
      <SmpteBars height="8px" />

      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Now tuning in
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Your television,
            <br />
            decoded.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Bingeprint learns what you watch, what you love, and what you&rsquo;ll
            enjoy next. Netflix knows Netflix. Bingeprint knows{" "}
            <span className="text-foreground">everywhere.</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/login"
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Build your Bingeprint
            </Link>
            <span className="font-mono text-xs text-muted-foreground">
              No password. Just your email.
            </span>
          </div>
        </div>

        {/* Sample Bingeprint card */}
        <div className="relative">
          <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
            <SmpteBars height="6px" />
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Your Bingeprint
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  214 shows &middot; 4,817 eps
                </span>
              </div>
              <div className="space-y-3">
                {SAMPLE_PRINT.map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.label}</span>
                      <span className="tabular font-mono text-muted-foreground">
                        {row.value}%
                      </span>
                    </div>
                    <BarMeter value={row.value} color={row.color} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 pt-1">
                {SMPTE_BARS.map((c, i) => (
                  <span
                    key={i}
                    className="h-6 flex-1 rounded-sm"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The three questions */}
      <section className="border-t bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {QUESTIONS.map((item) => (
            <div key={item.n} className="space-y-3">
              <span className="font-mono text-sm text-primary">{item.n}</span>
              <h2 className="font-display text-xl font-semibold">{item.q}</h2>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <Logo size={20} />
          <p className="font-mono">
            Bingeprint &middot; your permanent record of television
          </p>
        </div>
      </footer>
    </main>
  );
}
