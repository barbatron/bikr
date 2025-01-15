// @deno-types="npm:@types/google.maps"
import { useMemo } from "https://esm.sh/v128/preact@10.19.6/hooks/src/index.js";
import { useContext, useEffect, useRef, useState } from "npm:preact/hooks";
import {
  distinctPresence,
  startPresence,
  streetViewLinks,
} from "../core/session-main.ts";
import {
  positionToLatLng,
  toUsableLinks,
} from "../core/world/streetview-utils.ts";
import { useObservable } from "../hooks/useObservable.ts";
import { googleMapsContext } from "../islands/GoogleMapIsland.tsx";
import { IS_BROWSER } from "$fresh/runtime.ts";

export type GoogleMapProps = {
  mapId: string;
  zoomLevel: number;
};

export default function GoogleMap(
  {
    mapId,
    zoomLevel,
  }: GoogleMapProps,
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  console.log("GoogleMap", { mapId, zoomLevel });
  const googleMaps = useContext(googleMapsContext);
  console.log("Has context?", googleMaps);
  if (!googleMaps) {
    return <p>Loading Google Maps...</p>;
  }
  const presence = useObservable(distinctPresence) ?? startPresence;

  const tripPosLatLng = useMemo<google.maps.LatLngLiteral>(
    () => positionToLatLng(presence.position),
    [...presence.position],
  );
  const tripDirection = useMemo<number>(() => presence.heading.degrees, [
    presence.heading.degrees,
  ]);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<HTMLDivElement | null>(null);

  const [map, setMap] = useState<null | google.maps.Map>(null);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current) return;
    console.log("Got mapref", mapRef.current);
    const newMap = new google.maps.Map(mapRef.current, {
      center: tripPosLatLng,
      heading: tripDirection,
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
      tripDirection: tripDirection,
    });
    streetViewLinks.value = toUsableLinks(links);
  }

  // Street view panorama initialization
  useEffect(() => {
    if (!map || !panoRef.current) return;
    const settings = {
      position: tripPosLatLng,
      pov: {
        heading: tripDirection,
        pitch: 0,
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

  // Update marker position
  useEffect(() => {
    // Center map on marker
    if (!map) return;
    console.log("Update map+pano from position/heading", {
      tripPosLatLng: tripPosLatLng,
      tripDirection: tripDirection,
    });
    const m = map as google.maps.Map;
    m.panTo(tripPosLatLng);
    m.setHeading(tripDirection);

    // Update panorama
    const panorama = m.getStreetView();
    if (panorama) {
      const p = panorama as google.maps.StreetViewPanorama;
      p.setOptions({
        position: tripPosLatLng,
        pov: { heading: tripDirection, pitch: 0 },
      });
    } else console.warn("Could not set panorama position/pov");
  }, [tripPosLatLng, tripDirection]);

  return (
    <>
      <div
        style={{ float: "left", height: "100vh", width: "50%" }}
        ref={mapRef}
        id="map"
      />
      <div
        style={{ float: "left", height: "100vh", width: "50%" }}
        ref={panoRef}
        id="pano"
      />
    </>
  );
}
