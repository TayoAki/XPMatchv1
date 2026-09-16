import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "XPMatch — your AI travel planner",
  description:
    "Personalized, actionable travel recommendations: destinations, hotels, flights, restaurants and attractions.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
