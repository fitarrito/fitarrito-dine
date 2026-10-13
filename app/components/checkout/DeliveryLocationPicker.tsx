"use client";

import { useEffect, useRef, useState } from "react";
import { FaLocationArrow, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import {
  DELIVERY_ZONE,
  OUTSIDE_DELIVERY_ZONE_MESSAGE,
  isInsideDeliveryZone,
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

  return {
    address: street || placeName || formattedAddress,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!googleMapsApiKey()) {
      setLoadError(
        "Location search needs a Google Maps API key. Enable the Maps JavaScript API, Places API, and Geocoding API, then set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
      );
      return;
    }

    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    let autocomplete: google.maps.places.Autocomplete | null = null;

    const publish = (position: google.maps.LatLngLiteral, parts: AddressParts) => {
      const inside = isInsideDeliveryZone(position.lat, position.lng);
      const message = inside ? null : OUTSIDE_DELIVERY_ZONE_MESSAGE;

      setZoneMessage(message);
      onChangeRef.current(
        {
          latitude: position.lat,
          longitude: position.lng,
          ...parts,
        },
        message,
      );
    };

    const placeMarker = (position: google.maps.LatLngLiteral) => {
      const map = mapRef.current;

      if (!map) return;

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

            void geocode(next.lat(), next.lng());
          }),
        );
      } else {
        markerRef.current.setPosition(position);
      }

      map.panTo(position);
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
    };

    const geocode = async (lat: number, lng: number) => {
      const geocoder = geocoderRef.current;

      if (!geocoder) return;

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
        const { maps, places, geocoding } = await loadGoogleMapsLibraries();

        if (cancelled || !mapNodeRef.current || !searchRef.current) return;

        const center = {
          lat: latitude ?? DELIVERY_ZONE.center.latitude,
          lng: longitude ?? DELIVERY_ZONE.center.longitude,
        };
        const map = new maps.Map(mapNodeRef.current, {
          center,
          zoom: latitude == null ? 12 : 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        mapRef.current = map;
        geocoderRef.current = new geocoding.Geocoder();

        new maps.Circle({
          map,
          center: {
            lat: DELIVERY_ZONE.center.latitude,
            lng: DELIVERY_ZONE.center.longitude,
          },
          radius: DELIVERY_ZONE.radiusKm * 1000,
          strokeColor: "#fc1e1e",
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: "#fc1e1e",
          fillOpacity: 0.06,
          clickable: false,
        });

        listeners.push(
          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;

            void geocode(event.latLng.lat(), event.latLng.lng());
          }),
        );

        if (latitude != null && longitude != null) {
          placeMarker({ lat: latitude, lng: longitude });
        }

        const bounds = new maps.Circle({
          center: {
            lat: DELIVERY_ZONE.center.latitude,
            lng: DELIVERY_ZONE.center.longitude,
          },
          radius: DELIVERY_ZONE.radiusKm * 1000,
        }).getBounds();

        autocomplete = new places.Autocomplete(searchRef.current, {
          componentRestrictions: { country: "in" },
          fields: ["address_components", "formatted_address", "geometry", "name"],
          bounds: bounds ?? undefined,
        });
        listeners.push(
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete?.getPlace();
            const location = place?.geometry?.location;

            if (!place || !location) {
              setZoneMessage("Choose one of the suggested addresses so we can place the pin.");
              return;
            }

            const position = { lat: location.lat(), lng: location.lng() };

            placeMarker(position);
            publish(
              position,
              addressFromComponents(
                place.address_components,
                place.formatted_address ?? "",
                place.name,
              ),
            );
          }),
        );

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Google Maps could not be loaded. Enable the Maps JavaScript API, Places API, and Geocoding API for this key.",
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
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
        const geocoder = geocoderRef.current;

        if (!geocoder || !mapRef.current) return;

        if (!markerRef.current) {
          markerRef.current = new google.maps.Marker({
            map: mapRef.current,
            position: next,
            draggable: true,
          });
          markerRef.current.addListener("dragend", () => {
            const dragged = markerRef.current?.getPosition();

            if (!dragged || !geocoderRef.current) return;

            void geocoderRef.current
              .geocode({ location: { lat: dragged.lat(), lng: dragged.lng() } })
              .then(({ results }) => {
                const result = results[0];
                const parts = result
                  ? addressFromComponents(result.address_components, result.formatted_address)
                  : { address: "", area: "", city: "Chennai", pincode: "" };
                const inside = isInsideDeliveryZone(dragged.lat(), dragged.lng());

                setZoneMessage(inside ? null : OUTSIDE_DELIVERY_ZONE_MESSAGE);
                onChangeRef.current(
                  {
                    latitude: dragged.lat(),
                    longitude: dragged.lng(),
                    ...parts,
                  },
                  inside ? null : OUTSIDE_DELIVERY_ZONE_MESSAGE,
                );
              });
          });
        } else {
          markerRef.current.setPosition(next);
        }

        mapRef.current.panTo(next);
        mapRef.current.setZoom(16);

        void geocoder.geocode({ location: next }).then(({ results }) => {
          const result = results[0];
          const parts = result
            ? addressFromComponents(result.address_components, result.formatted_address)
            : { address: "", area: "", city: "Chennai", pincode: "" };

          if (searchRef.current && result?.formatted_address) {
            searchRef.current.value = result.formatted_address;
          }

          const inside = isInsideDeliveryZone(next.lat, next.lng);

          setZoneMessage(inside ? null : OUTSIDE_DELIVERY_ZONE_MESSAGE);
          onChangeRef.current(
            { latitude: next.lat, longitude: next.lng, ...parts },
            inside ? null : OUTSIDE_DELIVERY_ZONE_MESSAGE,
          );
        });
      },
      () => {
        setLocating(false);
        setZoneMessage("Allow location access, or search for the address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={styles.panel}>
      <p className={styles.panelHeader}>
        <FaMapMarkerAlt aria-hidden />
        Find your delivery location
      </p>
      <div className={styles.searchRow}>
        <label className={styles.searchWrap}>
          <FaSearch aria-hidden />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search area, street, building..."
            autoComplete="off"
            aria-label="Search delivery location"
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
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
      {loadError || zoneMessage ? (
        <p className={styles.message}>{loadError || zoneMessage}</p>
      ) : (
        <p className={styles.hint}>
          We deliver around {DELIVERY_ZONE.label}. Search, use your location, or tap the map to drop the pin.
        </p>
      )}
    </div>
  );
}
