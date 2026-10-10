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
    <div className="flex flex-col">
      {isStaffPage ? null : <Header />}
      <main
        className={
          isStaffPage
            ? "flex flex-col w-full flex-1 px-4 py-6 sm:px-8"
            : "flex flex-col w-full min-w-0 max-w-full flex-1 px-4 pb-4 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
