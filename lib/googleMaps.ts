import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;

export function googleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function configureGoogleMaps() {
  const key = googleMapsApiKey();

  if (!key) return false;

  if (!configured) {
    setOptions({
      key,
      v: "weekly",
      region: "IN",
      language: "en",
    });
    configured = true;
  }

  return true;
}

export async function loadGoogleMapsLibraries() {
  if (!configureGoogleMaps()) {
    throw new Error("Google Maps API key is missing.");
  }

  const [maps, places, geocoding] = await Promise.all([
    importLibrary("maps"),
    importLibrary("places"),
    importLibrary("geocoding"),
  ]);

  return { maps, places, geocoding };
}
