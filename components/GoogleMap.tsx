// @deno-types="npm:@types/google.maps"
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { presence } from "../core/session-main.ts";
import { LatLong } from "../core/types.ts";
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

  const trip = useObservable(presence);
  const tripPosLatLng = useMemo(
    () =>
      trip?.position
        ? new googleMaps.LatLng({
          lat: trip.position[0],
          lng: trip.position[1],
        })
        : null,
    [trip?.position[0], trip?.position[1]],
  );

  const mapRef = useRef<HTMLDivElement | null>(null);
  const panoRef = useRef<HTMLDivElement | null>(null);

  const [map, setMap] = useState<null | google.maps.Map>(null);
  const [panorama, setPanorama] = useState<
    null | google.maps.StreetViewPanorama
  >(null);
  const [selfMarker, setSelfMarker] = useState<
    null | google.maps.marker.AdvancedMarkerElement
  >(null);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current) return;
    console.log("Got mapref", mapRef.current);
    const newMap = new googleMaps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: zoomLevel,
      mapId,
    });
    setMap(newMap);
  }, [mapRef.current]);

  // Street view panorama initialization
  useEffect(() => {
    if (!map || !panoRef.current) return;
    if (!trip?.heading.degrees) return;
    const settings = {
      position: { lat, lng },
      pov: {
        heading: trip?.heading.degrees ?? startDirection,
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
    setPanorama(newPanorama);
  }, [map, panoRef.current, startDirection, trip?.heading.degrees]);

  useEffect(() => {
    if (!panorama || !map) return;
    map.setStreetView(panorama);
  }, [panorama, map]);

  useEffect(() => {
    if (!map) return;
    const newSelfMarker = new googleMaps.marker.AdvancedMarkerElement({
      map,
      title: "Presence",
    });
    newSelfMarker.id = "selfMarker";
    setSelfMarker(newSelfMarker);
  }, [map]);

  // Update marker position
  useEffect(() => {
    if (!selfMarker || !tripPosLatLng) return;

    // Update self marker position
    console.log("Setting marker position", tripPosLatLng.toString());
    selfMarker.position = tripPosLatLng;

    // Center map on marker
    map?.panTo(tripPosLatLng);

    // Update panorama
    panorama?.setPosition(tripPosLatLng);
    panorama?.setPov(trip?.heading.degrees ?? startDirection);
  }, [selfMarker, tripPosLatLng, map]);

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
