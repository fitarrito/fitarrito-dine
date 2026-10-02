import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fitarrito Staff Orders",
  robots: { index: false, follow: false, noarchive: true },
};

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
