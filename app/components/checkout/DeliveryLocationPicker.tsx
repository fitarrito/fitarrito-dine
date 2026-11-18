"use client";

import { useEffect, useRef, useState } from "react";
import { FaLocationArrow, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import {
  OUTSIDE_DELIVERY_ZONE_MESSAGE,
  isWithinDeliveryRadius,
  type DeliveryCoordinate,
} from "@lib/deliveryZone";
import { googleMapsApiKey, loadGoogleMapsLibraries } from "@lib/googleMaps";
import styles from "./DeliveryLocationPicker.module.css";

export type SelectedDeliveryLocation = {
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  city: string;
  pincode: string;
};

type DeliveryLocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (location: SelectedDeliveryLocation, zoneMessage: string | null) => void;
};

type AddressParts = Pick<SelectedDeliveryLocation, "address" | "area" | "city" | "pincode">;

function componentValue(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
) {
  return components?.find((component) => component.types.includes(type))?.long_name ?? "";
}

function addressFromComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  formattedAddress: string,
  placeName?: string,
): AddressParts {
  const street = [componentValue(components, "street_number"), componentValue(components, "route")]
    .filter(Boolean)
    .join(" ");
  const area =
    componentValue(components, "sublocality_level_1") ||
    componentValue(components, "sublocality") ||
    componentValue(components, "neighborhood") ||
    componentValue(components, "locality");
  const city =
    componentValue(components, "locality") ||
    componentValue(components, "administrative_area_level_2") ||
    "Chennai";

  const firstLine = formattedAddress.split(",")[0]?.trim() || formattedAddress;

  return {
    address: street || placeName || firstLine,
    area,
    city,
    pincode: componentValue(components, "postal_code"),
  };
}

export default function DeliveryLocationPicker({
  latitude,
  longitude,
  onChange,
}: DeliveryLocationPickerProps) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const searchBoundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const searchAddressRef = useRef<(query: string) => void>(() => {});
  const searchTimerRef = useRef<number | null>(null);
  const searchSerialRef = useRef(0);
  const zoneRef = useRef<DeliveryCoordinate | null>(null);
  const lastValidRef = useRef<google.maps.LatLngLiteral | null>(null);
  const acceptPositionRef = useRef<(latitude: number, longitude: number) => void>(() => {});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const authWindow = window as Window & { gm_authFailure?: () => void };
    const previousAuthFailure = authWindow.gm_authFailure;
    authWindow.gm_authFailure = () => {
      setMapFailed(true);
      setLoadError(
        "The map couldn't be loaded. Enter your house, street, area, and pincode below. You can continue without the pin.",
      );
      previousAuthFailure?.();
    };

    if (!googleMapsApiKey()) {
      setMapFailed(true);
      setLoadError(
        "The map isn't available right now. Enter your house, street, area, and pincode below.",
      );
      return () => {
        authWindow.gm_authFailure = previousAuthFailure;
      };
    }

    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];

    const insideRadius = (latitude: number, longitude: number) => {
      const origin = zoneRef.current;

      return origin != null && isWithinDeliveryRadius(origin, latitude, longitude);
    };

    const restoreMarker = () => {
      const last = lastValidRef.current;

      if (last && markerRef.current) markerRef.current.setPosition(last);
    };

    const rejectOutside = () => {
      setZoneMessage(OUTSIDE_DELIVERY_ZONE_MESSAGE);
      restoreMarker();
    };

    const publish = (position: google.maps.LatLngLiteral, parts: AddressParts) => {
      if (!insideRadius(position.lat, position.lng)) {
        rejectOutside();
        return;
      }

      setZoneMessage(null);
      onChangeRef.current(
        {
          latitude: position.lat,
          longitude: position.lng,
          ...parts,
        },
        null,
      );
    };

    const placeMarker = (position: google.maps.LatLngLiteral) => {
      const map = mapRef.current;

      if (!map || !insideRadius(position.lat, position.lng)) {
        rejectOutside();
        return false;
      }

      lastValidRef.current = position;

      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map,
          position,
          draggable: true,
        });
        listeners.push(
          markerRef.current.addListener("dragend", () => {
            const next = markerRef.current?.getPosition();

            if (!next) return;

            if (!insideRadius(next.lat(), next.lng())) {
              rejectOutside();
              return;
            }

            void geocode(next.lat(), next.lng());
          }),
        );
      } else {
        markerRef.current.setPosition(position);
      }

      map.panTo(position);
      return true;
    };

    const geocode = async (lat: number, lng: number) => {
      const geocoder = geocoderRef.current;

      if (!geocoder) return;

      if (!insideRadius(lat, lng)) {
        rejectOutside();
        return;
      }

      placeMarker({ lat, lng });

      try {
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        const result = results[0];
        const parts = result
          ? addressFromComponents(result.address_components, result.formatted_address)
          : { address: "", area: "", city: "Chennai", pincode: "" };

        if (searchRef.current && result?.formatted_address) {
          searchRef.current.value = result.formatted_address;
        }

        publish({ lat, lng }, parts);
      } catch {
        setZoneMessage("We couldn't read that pin. Search for the address or try another spot.");
      }
    };

    const start = async () => {
      try {
        const zoneResponse = await fetch("/api/delivery/zone");
        const zone = (await zoneResponse.json()) as {
          latitude?: number;
          longitude?: number;
          radiusKm?: number;
          error?: string;
        };

        if (cancelled) return;

        if (
          !zoneResponse.ok ||
          typeof zone.latitude !== "number" ||
          typeof zone.longitude !== "number"
        ) {
          setMapFailed(true);
          setLoadError(
            zone.error ||
              "Delivery area isn't available right now. Enter your address below and we'll check it before payment.",
          );
          return;
        }

        zoneRef.current = { latitude: zone.latitude, longitude: zone.longitude };

        const { maps, geocoding } = await loadGoogleMapsLibraries();

        if (cancelled || !mapNodeRef.current || !searchRef.current) return;

        const center = { lat: zone.latitude, lng: zone.longitude };
        const map = new maps.Map(mapNodeRef.current, {
          center,
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        mapRef.current = map;
        geocoderRef.current = new geocoding.Geocoder();

        const circle = new maps.Circle({
          map,
          center,
          radius: (zone.radiusKm ?? 15) * 1000,
          strokeColor: "#fc1e1e",
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: "#fc1e1e",
          fillOpacity: 0.06,
          clickable: false,
        });
        const bounds = circle.getBounds();

        if (bounds) map.fitBounds(bounds, 24);

        listeners.push(
          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;

            void geocode(event.latLng.lat(), event.latLng.lng());
          }),
        );

        if (latitude != null && longitude != null && insideRadius(latitude, longitude)) {
          placeMarker({ lat: latitude, lng: longitude });
        } else if (latitude != null && longitude != null) {
          setZoneMessage(OUTSIDE_DELIVERY_ZONE_MESSAGE);
        }

        searchBoundsRef.current = bounds;

        searchAddressRef.current = (query: string) => {
          const trimmed = query.trim();
          const geocoder = geocoderRef.current;

          if (!geocoder || trimmed.length < 3) return;

          const requestId = ++searchSerialRef.current;

          void geocoder
            .geocode({
              address: trimmed,
              componentRestrictions: { country: "IN" },
              bounds: searchBoundsRef.current ?? undefined,
            })
            .then(({ results }) => {
              if (cancelled || requestId !== searchSerialRef.current) return;
              if (searchRef.current?.value.trim() !== trimmed) return;

              const result = results[0];
              const location = result?.geometry?.location;

              if (!result || !location) {
                setZoneMessage(
                  "We couldn't find that place. Type the address below or tap the map.",
                );
                return;
              }

              const position = { lat: location.lat(), lng: location.lng() };

              if (!insideRadius(position.lat, position.lng)) {
                setZoneMessage(OUTSIDE_DELIVERY_ZONE_MESSAGE);
                return;
              }

              placeMarker(position);
              publish(
                position,
                addressFromComponents(result.address_components, result.formatted_address),
              );
            })
            .catch(() => {
              if (cancelled || requestId !== searchSerialRef.current) return;

              setZoneMessage(
                "We couldn't find that place. Type the address below or tap the map.",
              );
            });
        };

        acceptPositionRef.current = (nextLatitude, nextLongitude) => {
          void geocode(nextLatitude, nextLongitude);
        };

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setMapFailed(true);
          setLoadError(
            "The map couldn't be loaded. Enter your house, street, area, and pincode below. You can continue without the pin.",
          );
        }
      }
    };

    void start();

    const mapNode = mapNodeRef.current;
    const observer = new MutationObserver(() => {
      const text = mapNode?.innerText ?? "";

      if (
        text.includes("didn't load Google Maps correctly") ||
        text.includes("Oops! Something went wrong")
      ) {
        setMapFailed(true);
        setLoadError(
          "The map couldn't be loaded. Enter your house, street, area, and pincode below. You can continue without the pin.",
        );
      }
    });

    if (mapNode) observer.observe(mapNode, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelled = true;
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      observer.disconnect();
      authWindow.gm_authFailure = previousAuthFailure;
      listeners.forEach((listener) => listener.remove());
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
    // The map is created once for this address step. Saved coordinates are read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setZoneMessage("This browser can't share your location. Search for the address instead.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const origin = zoneRef.current;

        if (!origin || !isWithinDeliveryRadius(origin, next.lat, next.lng)) {
          setZoneMessage(OUTSIDE_DELIVERY_ZONE_MESSAGE);
          return;
        }

        acceptPositionRef.current(next.lat, next.lng);
      },
      () => {
        setLocating(false);
        setZoneMessage("Allow location access, or search for the address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const mapUnavailable = mapFailed || Boolean(loadError);


  return (
    <div className={styles.panel}>
      <p className={styles.panelHeader}>
        <FaMapMarkerAlt aria-hidden />
        Find your delivery location
      </p>
      {mapUnavailable ? (
        <div className={styles.fallback}>
          <p>{loadError}</p>
          <button
            type="button"
            className={styles.locateButton}
            onClick={useMyLocation}
            disabled={locating}
          >
            <FaLocationArrow aria-hidden />
            {locating ? "Finding..." : "Use my location"}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.searchRow}>
            <label className={styles.searchWrap}>
              <FaSearch aria-hidden />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search area, street, building..."
                autoComplete="off"
                aria-label="Search delivery location"
                onChange={(event) => {
                  const value = event.target.value;

                  if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);

                  searchTimerRef.current = window.setTimeout(() => {
                    searchAddressRef.current(value);
                  }, 450);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  event.preventDefault();

                  if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);

                  searchAddressRef.current(event.currentTarget.value);
                }}
              />
            </label>
            <button
              type="button"
              className={styles.locateButton}
              onClick={useMyLocation}
              disabled={!ready || locating}
            >
              <FaLocationArrow aria-hidden />
              {locating ? "Finding..." : "Use my location"}
            </button>
          </div>
          <div className={styles.mapWrap}>
            <div ref={mapNodeRef} className={styles.map} />
            <button
              type="button"
              className={styles.adjustButton}
              disabled={!ready}
              onClick={() => mapRef.current?.panTo(markerRef.current?.getPosition() ?? mapRef.current.getCenter()!)}
            >
              Adjust pin on map
            </button>
          </div>
        </>
      )}
      {zoneMessage ? (
        <p className={styles.message}>{zoneMessage}</p>
      ) : mapUnavailable ? null : (
        <p className={styles.hint}>
          We deliver within 15 km of the restaurant. Search, use your location, or tap the map to drop the pin. You can also type the address below.
        </p>
      )}
    </div>
  );
}
