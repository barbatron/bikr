// @deno-types="npm:@types/google.maps"
// import * as google from "npm:@types/google.maps";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { LatLong, loadGoogleMaps } from "../core/types.ts";
import { useObservable } from "./useObservable.ts";
import { presence } from "../core/session-main.ts";

type GoogleMapProps = {
  mapId: string;
  lat: number; 
  lng: number; 
  zoomLevel: number; 
  marker?: LatLong;
}
export default function GoogleMap(
  { 
    mapId,
    lat, 
    lng,
    zoomLevel,
  }: GoogleMapProps
) {
  // const google = globalThis.google as google.maps.MapsLibrary;
  // useEffect(() => {
  //   loadGoogleMaps().then(setGoogle);
  // }, [setGoogle]);
  const trip = useObservable(presence);
  const [map, setMap] = useState<null | google.maps.Map>(null);
  const [selfMarker, setSelfMarker] = useState<null | google.maps.marker.AdvancedMarkerElement>(null);

  console.log("GoogleMap trip", trip);

  const ref = useRef<HTMLDivElement | null>(null);
  const tripPosLatLng = useMemo(() => trip?.position ? new google.maps.LatLng({ lat: trip.position[0], lng: trip.position[1] }) : null, [trip?.position[0], trip?.position[1]]);

  useEffect(() => {
    if (ref.current) {
      console.log(ref.current);

      const newMap = new google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: zoomLevel,
        mapId,
      });

      setMap(newMap);
    }
  }, [ref.current, setMap]);

  // Init things on map
  useEffect(() => {
    if (!map || !trip) return;
    
    if (!selfMarker) {
      const newMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        title: "You"
      });
      console.log('Created marker');
      setSelfMarker(newMarker);
    } else { 
      console.log("No trip");
      setSelfMarker(null);
    }
  },[map, selfMarker, setSelfMarker]);

  // Update marker position
  useEffect(() => {
    if (!selfMarker || !tripPosLatLng) return;
    console.log('Setting marker position');
    selfMarker.position = tripPosLatLng;
    // Center map on marker
    if (map) map.setCenter(tripPosLatLng);
  }, [selfMarker, tripPosLatLng]);

  // // Center map on marker
  // useEffect(() => {
  //   if (!map) return;
  //   if (selfMarker?.position) {
  //     console.log('centering map on marker');
  //     map.setCenter(selfMarker.position);
  //   }
  // }, [selfMarker, map])

  return <div style={{ width: "100%", height: "100vh" }} ref={ref} id="map" ></div>;
}
