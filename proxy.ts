import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isStaffHostHeaderList } from "@lib/staffHost";

export function proxy(request: NextRequest) {
  const isStaffSite = isStaffHostHeaderList([
    request.headers.get("x-forwarded-host"),
    request.headers.get("x-vercel-forwarded-host"),
    request.headers.get("host"),
    request.nextUrl.host,
  ]);

  if (!isStaffSite || request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/staff/dashboard";

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/",
};
