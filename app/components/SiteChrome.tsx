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
            : "flex flex-col w-full flex-1 m-4 sm:m-8 lg:m-10 pt-25"
        }
      >
        {children}
      </main>
    </div>
  );
}
