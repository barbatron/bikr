import { IS_BROWSER } from "$fresh/runtime.ts";
import { signal } from "npm:@preact/signals-core";
import { ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import GoogleMap, { GoogleMapProps } from "../components/GoogleMap.tsx";
import { bikeRoute, worldSource } from "../core/session-main.ts";
import { StreetViewWorld } from "../core/world/streetview-world.ts";
// import { useMapsRoute } from "../hooks/useMapsRoute.ts";

export type MapsLibs = typeof google.maps;

export const googleMapsContext = createContext<MapsLibs | null>(null);

export const bikeRouteSignal = signal<ReturnType<typeof useMapsRoute>>(null);

export function GoogleMapsProvider(
  props: { children: ComponentChildren; apiKey: string },
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  return (
    <>
      <script
        onLoad={() => {
          console.log("Loaded script");
          if (!googleMaps) setGoogleMaps(google.maps);
          worldSource.next(
            new StreetViewWorld(new google.maps.StreetViewService()),
          );
        }}
        src={`https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=maps,marker,streetView,routes`}
        crossorigin=""
      />
      {/* Provide context to children */}
      <googleMapsContext.Provider value={googleMaps}>
        {props.children}
      </googleMapsContext.Provider>
    </>
  );
}

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
  }, [JSON.stringify(startAt), JSON.stringify(endAt)]);
  return routes;
}

function RouteTest() {
  const context = useContext(googleMapsContext);
  if (!context) return null;
  console.log("RouteTest");
  const routes = useMapsRoute({
    startAt: bikeRoute.routeStart,
    endAt: bikeRoute.routeEnd,
  });
  if (routes) bikeRouteSignal.value = routes;
  // const json = useMemo(() => JSON.stringify(routes, null, 2), [routes]);
  return null;
}

export default function GoogleMapIsland(
  props: GoogleMapProps & { apiKey: string },
) {
  return (
    <GoogleMapsProvider apiKey={props.apiKey}>
      <RouteTest />
      <GoogleMap {...props} mapsRoute={bikeRouteSignal} />
    </GoogleMapsProvider>
  );
}
