import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "XPMatch — your AI travel planner",
  description:
    "Personalized, actionable travel recommendations: destinations, hotels, flights, restaurants and attractions.",
};

// viewport-fit=cover lets the tab bar pad itself above the iPhone home indicator (safe-area insets).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* dvh follows the phone browser's collapsing toolbars; h-full stays as the fallback. */}
      <body className="h-full overflow-hidden supports-[height:100dvh]:h-[100dvh]">{children}</body>
    </html>
  );
}
