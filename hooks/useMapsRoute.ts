import { useContext, useEffect, useState } from "npm:preact/hooks";
import { googleMapsContext } from "../islands/GoogleMapIsland.tsx";

type UseMapsRouteOptions = {
  startAt: google.maps.DirectionsRequest["origin"];
  endAt: google.maps.DirectionsRequest["destination"];
};

export function useMapsRoute({ startAt, endAt }: UseMapsRouteOptions) {
  const hasGoogleMaps = useContext(googleMapsContext);
  if (!hasGoogleMaps) {
    return null;
  }
  const [routes, setRoutes] = useState<google.maps.DirectionsRoute[] | null>(
    null,
  );
  const svc = new google.maps.DirectionsService();
  useEffect(() => {
    let cancelled = false;
    svc.route({
      origin: startAt,
      destination: endAt,
      travelMode: google.maps.TravelMode.BICYCLING,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.routes) {
          console.log("[useMapsRoute] Got routes", result.routes);
          setRoutes(result.routes);
        } else {
          setRoutes(null);
        }
      });
    return () => {
      console.log("[useMapsRoute] Cancel pending", {
        previouslyCancelled: cancelled,
      });
      cancelled = true;
    };
  });
  return routes;
}
