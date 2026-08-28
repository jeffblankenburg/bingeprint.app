import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <ComingSoon
      title="Bingeprint Insights"
      blurb="Your television taste, decoded — favorite genres, most-watched networks and actors, watch time, and your year in review. Arrives with the insights milestone."
    />
  );
}
