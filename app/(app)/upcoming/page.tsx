import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Upcoming" };

export default function UpcomingPage() {
  return (
    <ComingSoon
      title="Upcoming"
      blurb="A personal release calendar — new episodes, premieres, and finales for the shows you follow. Today, this week, this month. Arrives with the calendar milestone."
    />
  );
}
