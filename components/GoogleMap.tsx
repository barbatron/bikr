// @deno-types="npm:@types/google.maps"
// import * as google from "npm:@types/google.maps";
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { LatLong } from "../core/types.ts";
import { useObservable } from "../hooks/useObservable.ts";
import { presence } from "../core/session-main.ts";
import { googleMapsContext } from "../islands/GoogleMapIsland.tsx";

export type GoogleMapProps = {
  mapId: string;
  lat: number;
  lng: number;
  zoomLevel: number;
  marker?: LatLong;
};

// function SelfMarker(props: { latLong: google.maps.LatLng | null, map: google.maps.Map }) { 
//   const googleMaps = useContext(googleMapsContext)!;
//   const marker = useMemo(() => new googleMaps.marker.AdvancedMarkerElement({
//     map: props.map,
//     title: "Presence",
//   }), [props.map]);
//   if (props.latLong) marker.position = props.latLong;
//   return <>{marker}</>;
// }

export default function GoogleMap(
  {
    mapId,
    lat,
    lng,
    zoomLevel,
  }: GoogleMapProps,
) {
  console.log("GoogleMap", { mapId, lat, lng, zoomLevel });
  const googleMaps = useContext(googleMapsContext);
  if (!googleMaps) {
    return <p>Loading Google Maps...</p>;
  }
  
  const trip = useObservable(presence);
  const [map, setMap] = useState<null | google.maps.Map>(null);
  const [selfMarker, setSelfMarker] = useState<null | google.maps.marker.AdvancedMarkerElement>(null);
  
  const ref = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (ref.current) {
      console.log(ref.current);

      const newMap = new googleMaps.Map(ref.current, {
        center: { lat, lng },
        zoom: zoomLevel,
        mapId,
      });
      setMap(newMap);
    }
  }, [ref.current]);

  useEffect(() => {
    if (!map) return;
    const newSelfMarker = new googleMaps.marker.AdvancedMarkerElement({
      map,
      title: "Presence",
    });
    newSelfMarker.id="selfMarker";
    setSelfMarker(newSelfMarker);
  }, [map]);

  // Update marker position
  useEffect(() => {
    if (!selfMarker || !tripPosLatLng) return;
    
    // Update self marker position
    console.log("Setting marker position", tripPosLatLng.toString());
    selfMarker.position=tripPosLatLng;
    
    // Center map on marker
    map?.panTo(tripPosLatLng);
  }, [selfMarker, tripPosLatLng, map]);
  
  return (
    <div style={{ width: "100%", height: "100vh" }} ref={ref} id="map">
    </div>
  );
}
