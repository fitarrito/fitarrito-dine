import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./provider";
import SiteChrome from "./components/SiteChrome";
import { isStaffHostHeaderList } from "@lib/staffHost";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fitarrito Dine-In",
  description: "Order fresh Mexican and Pan Asian meals for dine-in.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const isStaffSite = isStaffHostHeaderList([
    headerStore.get("x-forwarded-host"),
    headerStore.get("x-vercel-forwarded-host"),
    headerStore.get("host"),
  ]);

  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers>
          <SiteChrome isStaffHost={isStaffSite}>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
