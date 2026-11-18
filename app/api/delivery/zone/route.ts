import { NextResponse } from "next/server";
import { DELIVERY_RADIUS_KM } from "@lib/deliveryZone";
import { RESTAURANT_LOCATION_REQUIRED_MESSAGE } from "@lib/googleDelivery";
import { restaurantOrigin } from "@lib/restaurantLocation";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = restaurantOrigin();

  if (!origin) {
    return NextResponse.json(
      { error: RESTAURANT_LOCATION_REQUIRED_MESSAGE },
      { status: 503 },
    );
  }

  return NextResponse.json({
    latitude: origin.latitude,
    longitude: origin.longitude,
    radiusKm: DELIVERY_RADIUS_KM,
  });
}
