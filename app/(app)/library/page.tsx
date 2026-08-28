import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <ComingSoon
      title="Your Library"
      blurb="Every show you track — filterable by status, genre, service, year, and rating. Arrives with the tracking milestone."
    />
  );
}
