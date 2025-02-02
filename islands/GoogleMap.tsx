import type { Signal } from "@preact/signals-core";
import { getPreciseDistance } from "geolib";
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { triggerSpeed } from "../core/bike-telemetry.ts";
import {
  presence,
  startDirection,
  startPosition,
} from "../core/session-main.ts";
import { LatLong } from "../core/types.ts";
import {
  findClosestDirection,
  StreetViewLinkWithHeading,
  toValidLinks,
} from "../core/world/streetview/index.ts";
import { useObservable } from "../hooks/useObservable.ts";
import { googleMapsRouteContext } from "./GoogleMapsRouteContext.tsx";
import { GoogleStreetViewPresenceWorldData } from "../core/world/streetview/types.ts";

const posToStr = (pos: LatLong) =>
  // @ts-ignore - we know it's a number array
  `(${pos.map((x) => x?.toFixed(5).padStart(10)).join(", ")})`;

export type GoogleMapProps = {
  mapId: string;
  zoomLevel: number;
  marker?: LatLong;
  streetViewLinks?: Signal<StreetViewLinkWithHeading[]>;
  streetView: boolean;
};

export default function GoogleMap(
  {
    mapId,
    zoomLevel,
    streetView,
    streetViewLinks,
  }: GoogleMapProps,
) {
  console.log("[gm] Render", { mapId, zoomLevel });
  const route = useContext(googleMapsRouteContext);
  const trip = useObservable(
    presence,
    {
      position: startPosition,
      heading: {
        degrees:
          (route.status === "loaded"
            ? route.routeTracker?.routePoints[0].headingOut?.absolute
            : undefined) ?? startDirection,
      },
      world: {},
    },
  );

  const tripPosLatLng = useMemo<google.maps.LatLngLiteral>(
    () => ({
      lat: trip.position[0],
      lng: trip.position[1],
    }),
    [trip.position[0], trip.position[1]],
  );
  const tripDirection = trip.heading.degrees;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<HTMLDivElement | null>(null);

  const [map, setMap] = useState<null | google.maps.Map>(null);
  const [panorama, setPanorama] = useState<
    null | google.maps.StreetViewPanorama
  >(null);

  const [panoStr, setPanoStr] = useState<string | null>(null);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current) return;
    console.log("[gm] Got mapref", mapRef.current);
    const hasRoute = route?.status == "loaded";
    const newMap = new google.maps.Map(mapRef.current, {
      center: tripPosLatLng,
      heading: tripDirection,
      zoom: zoomLevel,
      mapId,
      colorScheme: google.maps.ColorScheme.DARK,
      streetViewControl: false,
      // Create a tilted navigation-style map if there's a route to follow
      ...(hasRoute && { tilt: 80 }),
    });

    if (hasRoute) {
      new google.maps.DirectionsRenderer({
        map: newMap,
        preserveViewport: true,
        draggable: false,
        routeIndex: 0,
        directions: route.directionsResult,
      });
    }
    setMap(newMap);
    // const timer = setInterval(() => {
    //   const dir = (Date.now() / 1000 * 30) % 360;
    //   newMap.setHeading(dir);
    // }, 1000);
    // return () => {
    //   clearInterval(timer);
    // };
  }, [mapRef.current]);

  // Street view panorama initialization
  useEffect(() => {
    if (!map || !panoRef.current || !streetView) return;
    if ((map as google.maps.Map).getStreetView() == panorama) {
      console.log("[gm] Map already has street view, skipping pano init");
      return;
    }
    const settings: google.maps.StreetViewPanoramaOptions = {
      position: tripPosLatLng,
      pov: {
        heading: tripDirection,
        pitch: 0,
      },
      fullscreenControl: false,
      clickToGo: false,
      addressControl: false,
    };
    console.log("[gm] Got map, creating panorama", {
      panoRef: panoRef.current,
      settings,
    });
    const newPanorama = new google.maps.StreetViewPanorama(
      panoRef.current,
      settings,
    );
    map.setStreetView(newPanorama);
    setPanorama(newPanorama);
  }, [map, panoRef.current]);

  // Update map+panorama based on trip position and heading
  useEffect(() => {
    // Center map on marker
    if (!map) return;
    console.log("Update map+pano from position/heading", {
      tripPosLatLng,
      tripDirection,
    });
    const m = map as google.maps.Map;
    m.panTo(tripPosLatLng);
    m.setHeading(tripDirection);

    // Update panorama, if exists
    if (panorama) {
      const p = panorama as google.maps.StreetViewPanorama;
      p.setOptions({
        position: tripPosLatLng,
        pov: { heading: tripDirection, pitch: 0 },
      });
    } else console.warn("Could not set panorama position/pov");
  }, [tripPosLatLng, tripDirection, map]);

  const closestLink = streetViewLinks?.value
    ? findClosestDirection(
      tripDirection,
      streetViewLinks.value,
    )
    : null;
  const mapC = (map as google.maps.Map)?.getCenter();
  const mapPos = useMemo(() => posToStr([mapC?.lat() ?? 0, mapC?.lng() ?? 0]), [
    mapC?.lat(),
    mapC?.lng(),
  ]);

  return (
    <div class="flex flex-col" style={{ height: "100vh" }}>
      <div>
        <div
          id="status"
          style={{
            display: "flex",
            flexDirection: "row",
            fontSize: "0.75em",
            fontFamily: "monospace",
            color: "white",
          }}
        >
          <span style={{ margin: "0.5em", minWidth: "20em" }}>
            {"trip_pos: "}
            {posToStr(trip.position)}
          </span>
          <span style={{ margin: "0.5em", minWidth: "20em" }}>
            map_pos: {mapPos}
          </span>

          <span style={{ margin: "0.5em", minWidth: "10em" }}>
            speed: {/*speed.toFixed(1)*/ "???"}
          </span>

          <span style={{ margin: "0.5em", minWidth: "10em" }}>
            dir: {trip.heading.degrees.toFixed(2)}
          </span>

          <span style={{ margin: "0.5em" }}>
            dirs: {streetViewLinks?.value.map((l) => {
              const fmt = closestLink?.link.pano == l.pano
                ? "oblique"
                : "normal";
              return (
                <span
                  key={l.pano ?? ""}
                  style={{ marginRight: "0.5em", fontStyle: fmt }}
                >
                  {(l.heading ?? -1).toFixed(2).padEnd(8)}
                </span>
              );
            })}
          </span>

          <span style={{ margin: "0.5em", minWidth: "10em" }}>
            pano: {panoStr ?? "???"}
          </span>

          <button
            class="bg-gray-700"
            style={{ justifySelf: "end", margin: "0.5em", minWidth: "10em" }}
            onClick={() => void triggerSpeed(5)}
          >
            5 kph
          </button>
          <button
            class="bg-gray-700"
            style={{ justifySelf: "end", margin: "0.5em", minWidth: "10em" }}
            onClick={() => void triggerSpeed(40)}
          >
            40 kph
          </button>
        </div>
        <div>
          <div
            class="route-status"
            style={{
              display: "flex",
              flexDirection: "row",
              fontSize: "0.75em",
              fontFamily: "monospace",
              color: "white",
            }}
          >
            {"junctionInfo" in trip.world
              ? (
                <span
                  style={{ margin: "0.5em", minWidth: "20em" }}
                  dangerouslySetInnerHTML={{
                    __html: (trip
                      .world as GoogleStreetViewPresenceWorldData).junctionInfo
                      ?.htmlInstructions ?? "",
                  }}
                >
                </span>
              )
              : null}
          </div>
        </div>
      </div>

      {streetView
        ? (
          <div
            style={{ height: "70vh" }}
            ref={panoRef}
            id="pano"
          />
        )
        : null}

      <div
        class="flex-grow"
        ref={mapRef}
        id="map"
      />
    </div>
  );
}
