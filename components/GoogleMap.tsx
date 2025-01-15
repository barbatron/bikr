// @deno-types="npm:@types/google.maps"
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { withLatestFrom } from "rxjs";
import { speedStream } from "../core/bike-telemetry.ts";
import {
  presence,
  startPresence,
  streetViewLinks,
} from "../core/session-main.ts";
import { LatLong } from "../core/types.ts";
import { roundTo } from "../core/utils.ts";
import { findClosestDirection } from "../core/world/streetview-utils.ts";
import { useObservable } from "../hooks/useObservable.ts";
import { googleMapsContext } from "../islands/GoogleMapIsland.tsx";

export type GoogleMapProps = {
  mapId: string;
  lat: number;
  lng: number;
  startDirection: number;
  zoomLevel: number;
  marker?: LatLong;
};

export default function GoogleMap(
  {
    mapId,
    lat,
    lng,
    startDirection,
    zoomLevel,
  }: GoogleMapProps,
) {
  console.log("GoogleMap", { mapId, lat, lng, zoomLevel });
  const googleMaps = useContext(googleMapsContext);
  if (!googleMaps) {
    return <p>Loading Google Maps...</p>;
  }

  const [trip, speed] = useObservable(
    presence.pipe(withLatestFrom(speedStream)),
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
    // const gmap = map as google.maps.Map | null;
    // if (!gmap) return;
    // console.log("handleNewLinks", { thisIs: this, gmap });
    const links = this.getLinks();
    console.log("Got new links", {
      headings: links?.map((l) => l?.heading),
      currentHeading: this.getPov().heading,
    });
    streetViewLinks.value = (links ?? []).filter((l) => !!l && l !== null).map(
      (l) => l as google.maps.StreetViewLink,
    );
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
    const events = newPanorama.addListener("links_changed", handleNewLinks);
    return () => {
      console.log("Unsubbing from links_changed");
      events.remove();
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
      // p.setOptions({
      //   position: tripPosLatLng,
      //   pov: { heading: tripDirection, pitch: 0 },
      // });
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
          dirs: {streetViewLinks.value.map((l, i) => {
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
