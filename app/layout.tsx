import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider";
import Header from "./components/Header";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Providers>
          <div className="flex flex-col">
            <Header />
            <main className="flex flex-col w-full flex-1 m-4 sm:m-8 lg:m-10 pt-25">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
