import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ethan Cohen | Yeshiva League Sports Photography", description: "Yeshiva League baseball, basketball, and hockey photography." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }