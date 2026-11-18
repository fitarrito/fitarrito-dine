import { NextResponse } from "next/server";
import { quoteDeliveryAddress, readDeliveryAddress, DeliveryQuoteError } from "@lib/googleDelivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const quote = await quoteDeliveryAddress(readDeliveryAddress(body));

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof DeliveryQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Delivery quote error:", error);

    return NextResponse.json(
      { error: "Something went wrong while calculating delivery." },
      { status: 500 },
    );
  }
}
