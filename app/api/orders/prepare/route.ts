import { NextResponse } from "next/server";
import { DeliveryQuoteError } from "@lib/googleDelivery";
import { prepareCheckoutOrder } from "@lib/prepareCheckoutOrder";
import { RestaurantOrderError } from "@lib/restaurantOrder";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof RestaurantOrderError || error instanceof DeliveryQuoteError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Prepare order error:", error);

  return NextResponse.json(
    { error: "Something went wrong while preparing your order." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const prepared = await prepareCheckoutOrder(body);

    return NextResponse.json(prepared);
  } catch (error) {
    return errorResponse(error);
  }
}
