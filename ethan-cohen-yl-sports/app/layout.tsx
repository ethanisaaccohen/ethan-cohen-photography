import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const title = "Ethan Cohen | Yeshiva League Sports Photography";
const description =
  "Yeshiva League baseball, basketball, and hockey photography.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: title,
    template: "%s | Ethan Cohen Photography",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "Ethan Cohen Photography",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
