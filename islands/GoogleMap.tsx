// @deno-types="npm:@types/google.maps"
import { Signal } from "npm:@preact/signals-core";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { distinctUntilChanged, withLatestFrom } from "rxjs";
import { speedStream, triggerSpeed } from "../core/bike-telemetry.ts";
import {
  presence,
  startPresence,
  streetViewLinks,
} from "../core/session-main.ts";
import { LatLong, Presence } from "../core/types.ts";
import { findClosestDirection } from "../core/world/streetview-utils.ts";
import { useObservable } from "../hooks/useObservable.ts";

const presenceWithSpeed = presence.pipe(
  withLatestFrom(speedStream),
  distinctUntilChanged(
    ([prevPresence, prevSpeed], [currPresence, currSpeed]) => {
      return prevPresence.position[0] === currPresence.position[0] &&
        prevPresence.position[1] === currPresence.position[1] &&
        prevPresence.heading.degrees === currPresence.heading.degrees &&
        prevSpeed === currSpeed;
    },
  ),
);

export type GoogleMapProps = {
  mapId: string;
  lat: number;
  lng: number;
  startDirection: number;
  zoomLevel: number;
  marker?: LatLong;
  mapsRoute?: Signal<google.maps.DirectionsRoute[] | null>;
};

export default function GoogleMap(
  {
    mapId,
    lat,
    lng,
    startDirection,
    zoomLevel,
    // mapsRoute,
  }: GoogleMapProps,
) {
  console.log("GoogleMap", { mapId, lat, lng, zoomLevel });

  const [trip, speed] = useObservable(
    presenceWithSpeed,
    [startPresence, 0.0],
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

  // Map initialization
  useEffect(() => {
    if (!mapRef.current) return;
    console.log("Got mapref", mapRef.current);
    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      heading: startDirection,
      zoom: zoomLevel,
      mapId,
      colorScheme: google.maps.ColorScheme.DARK,
    });
    setMap(newMap);
  }, [mapRef.current]);

  function handleNewLinks(this: google.maps.StreetViewPanorama) {
    const links = this.getLinks();
    console.log("Got new links", {
      headings: links?.map((l) => l?.heading),
      currentHeading: this.getPov().heading,
    });
    streetViewLinks.next(
      (links ?? []).filter((l) => !!l && l !== null).map(
        (l) => l as google.maps.StreetViewLink,
      ),
    );
  }

  function handlePanoPresenceUpdate(this: google.maps.StreetViewPanorama) {
    const pos = this.getPosition();
    const pov = this.getPov();
    console.log("[gm] Pano pos/pov updated", { pos, pov });
    if (pos?.lat() && pos?.lng()) {
      // Check if same as trip position and heading
      const tripPos = tripPosLatLng;
      const tripDir = tripDirection;
      const posDiff = Math.abs(pos.lat() - tripPos.lat) +
        Math.abs(pos.lng() - tripPos.lng);
      const dirDiff = Math.abs(pov.heading - tripDir);
      if (posDiff < 0.0001 && dirDiff < 0.1) {
        console.log("[gm] Pano position matches trip position", {
          posDiff,
          dirDiff,
          pos: pos.toJSON(),
          tripPos,
          dir: pov.heading,
          tripDir,
        });
        return;
      }
      // Update presence based on pano
      const newPresence = {
        position: [pos.lat(), pos.lng()],
        heading: { degrees: pov.heading },
      } satisfies Presence;
      console.log("[gm] Updating presence from pano", { trip, newPresence });
      presence.next(newPresence);
    }
  }

  // Street view panorama initialization
  useEffect(() => {
    if (!map || !panoRef.current) return;
    if (!tripDirection) return;
    const settings = {
      position: { lat, lng },
      pov: {
        heading: trip.heading.degrees ?? startDirection,
        pitch: 10,
      },
    };
    console.log("Creating panorama", {
      panoRef: panoRef.current,
      settings,
    });
    const newPanorama = new google.maps.StreetViewPanorama(
      panoRef.current,
      settings,
    );
    map.setStreetView(newPanorama);
    const listeners = [
      newPanorama.addListener(
        "links_changed",
        handleNewLinks,
      ),
      newPanorama.addListener(
        "position_changed",
        handlePanoPresenceUpdate,
      ),
      newPanorama.addListener(
        "pov_changed",
        handlePanoPresenceUpdate,
      ),
    ];
    return () => {
      console.log("Unsubbing from pano events");
      listeners.forEach((l) => l.remove());
    };
  }, [map, panoRef.current]);

  // useEffect(() => {
  //   if (!map) return;
  //   const newSelfMarker = new googleMaps.marker.AdvancedMarkerElement({
  //     map,
  //     title: "Presence",
  //   });
  //   newSelfMarker.id = "selfMarker";
  //   setSelfMarker(newSelfMarker);
  // }, [map]);

  // Update marker position
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

    // Update panorama
    const panorama = m.getStreetView();
    if (panorama) {
      const p = panorama as google.maps.StreetViewPanorama;
      p.setPov({ heading: tripDirection, pitch: 0 });
      p.setPosition(tripPosLatLng);
    } else console.warn("Could not set panorama position/pov");
  }, [tripPosLatLng, tripDirection, map]);

  const closestLink = findClosestDirection(
    tripDirection,
    streetViewLinks.value,
  );
  const mapC = (map as google.maps.Map)?.getCenter();
  const posToStr = (pos: (number | undefined)[]) =>
    `(${pos.map((x) => x?.toFixed(5).padStart(10)).join(", ")})`;
  const mapPos = useMemo(() => posToStr([mapC?.lat(), mapC?.lng()]), [
    mapC?.lat(),
    mapC?.lng(),
  ]);

  return (
    <>
      <div
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
          speed: {speed.toFixed(1)}
        </span>
        <span style={{ margin: "0.5em", minWidth: "10em" }}>
          dir: {trip.heading.degrees.toFixed(2)}
        </span>
        <span style={{ margin: "0.5em" }}>
          dirs: {streetViewLinks.value.map((l) => {
            const fmt = closestLink?.pano == l.pano ? "oblique" : "normal";
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
        <button
          style={{ justifySelf: "end", margin: "0.5em", minWidth: "10em" }}
          onClick={() => void triggerSpeed(5)}
        >
          5 kph
        </button>
      </div>
      <div
        style={{ height: "80vh", width: "100%" }}
        ref={panoRef}
        id="pano"
      />
      <div
        style={{ height: "20vh", width: "100%" }}
        ref={mapRef}
        id="map"
      />
    </>
  );
}
