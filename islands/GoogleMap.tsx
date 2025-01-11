/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "preact/hooks";
import { LatLong } from "../core/types.ts";
import { useObservable } from "./useObservable.ts";
import { presence } from "../core/session-main.ts";
import { google } from '../core/types.ts';

declare global {
  interface Window {
    google: google.maps.MapsLibrary;
  }
}

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
    marker, 
  }: GoogleMapProps
) {
  const trip = useObservable(presence);
  const [map, setMap] = useState<null | google.maps.Map>(null);

  console.log("GoogleMap trip", trip);

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      console.log(ref.current);

      const newMap = new globalThis.google.maps.Map(ref.current, {
        center: { lat, lng },
        zoom: zoomLevel,
        mapId,
      });

      setMap(newMap);
    }
  }, [ref.current]);

  useEffect(() => {
    if (!map || !trip) return;
    if (trip.position) {
      const [lat, lng] = trip.position;
      console.log("Addng or updating trip", trip);
      const markerPos = { lat, lng };
      const _marker = new globalThis.google.maps.marker.AdvancedMarkerElement({
        map,
        position: markerPos,
        title: "You",
      });
      console.log('Created marker');
      map.setCenter(markerPos);
    } else { 
      console.log("No trip");
    }
  },[map, trip?.position])

  return <div style={{ width: "100%", height: "100vh" }} ref={ref} id="map" />;
}
