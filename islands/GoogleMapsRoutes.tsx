import { useContext, useEffect, useState } from "npm:preact/hooks";
import { bikeRoute } from "../core/session-main.ts";
import { googleMapsContext } from "./GoogleMapsLibraryContext.tsx";
import { Signal } from "npm:@preact/signals-core";

type UseMapsRouteOptions = {
  startAt: google.maps.DirectionsRequest["origin"];
  endAt: google.maps.DirectionsRequest["destination"];
};

function useMapsRoute({ startAt, endAt }: UseMapsRouteOptions) {
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
  }, [JSON.stringify(startAt), JSON.stringify(endAt)]);
  return routes;
}

type GoogleMapsRoutesLoaderProps = {
  startAt: typeof bikeRoute.routeStart;
  endAt: typeof bikeRoute.routeEnd;
  routesSignal: Signal<google.maps.DirectionsRoute[] | null>;
};

export default function GoogleMapsRoutesLoader(
  { startAt, endAt, routesSignal }: GoogleMapsRoutesLoaderProps,
) {
  const context = useContext(googleMapsContext);
  if (!context) return null;
  console.log("GoogleMapsRoutesLoader");
  const routes = useMapsRoute({
    startAt,
    endAt,
  });
  if (routes) routesSignal.value = routes;
  // const json = useMemo(() => JSON.stringify(routes, null, 2), [routes]);
  return null;
}
