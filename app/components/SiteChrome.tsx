"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function SiteChrome({
  isStaffHost,
  children,
}: {
  isStaffHost: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStaffPage = isStaffHost || pathname.startsWith("/staff");

  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-hidden">
      {isStaffPage ? null : <Header />}
      <main
        className={
          isStaffPage
            ? "flex w-full min-w-0 max-w-full flex-1 flex-col px-4 py-6 sm:px-8"
            : "flex w-full min-w-0 max-w-full flex-1 flex-col px-4 pb-4 pt-[6.5rem] sm:px-8 sm:pb-8 lg:px-10 lg:pb-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
