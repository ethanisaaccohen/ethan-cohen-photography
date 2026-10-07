import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Find Yeshiva League game galleries and tagged photos by player or team.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
