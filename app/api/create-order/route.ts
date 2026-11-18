import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Payment now starts by reserving the restaurant order. Refresh checkout and try again.",
    },
    { status: 409 },
  );
}
