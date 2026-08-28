import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <ComingSoon
      title="Search"
      blurb="Fast, forgiving search across shows, actors, characters, creators, networks, and streaming services. Arrives with the search milestone."
    />
  );
}
