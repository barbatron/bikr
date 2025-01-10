import { useEffect, useRef } from "preact/hooks";
import { LatLong } from "../core/types.ts";
import { useObservable } from "./useObservable.ts";
import { presence } from "../core/session-main.ts";

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleMap(
  props: { lat: number; lng: number; zoomLevel: number; marker?: LatLong },
) {
  const trip = useObservable(presence);

  console.log("GoogleMap trip", trip);

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      console.log(ref.current);

      const map = new window.google.maps.Map(ref.current, {
        center: { lat: props.lat, lng: props.lng },
        zoom: props.zoomLevel,
      });

      if (trip && trip.position) {
        console.log("Addng or updating trip", trip);
        const marker = new window.google.maps.AdvancedMarkerElement({
          map,
          position: { lat: trip.position[0], lng: trip.position[1] },
          title: "You",
        });
        map.setCenter(marker.getPosition());
      }
    }
  }, [ref.current]);

  return <div style={{ width: "100%", height: "100vh" }} ref={ref} id="map" />;
}
