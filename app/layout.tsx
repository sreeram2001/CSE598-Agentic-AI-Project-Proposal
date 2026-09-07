import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "SparkyFi - Your AI Financial Advisor",
  description: "SparkyFi - ASU's AI financial advisor powered by Sparky",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={syne.variable} suppressHydrationWarning>
      <body style={{ fontFamily: "var(--font-syne), sans-serif" }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
