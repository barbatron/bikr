import { IS_BROWSER } from "$fresh/runtime.ts";
import { ComponentChildren, createContext } from "preact";
import { useEffect, useState } from "preact/hooks";
import { worldSource } from "../core/session-main.ts";
import {
  GoogleMapsRouteTracker,
} from "../core/world/streetview/gm-route-tracker.ts";
import {
  createMapsApiLinksResolver,
  StreetViewWorld,
} from "../core/world/streetview/index.ts";

type GoogleMapsRouteContextProps = {
  startAt: google.maps.DirectionsRequest["origin"];
  endAt: google.maps.DirectionsRequest["destination"];
  children: ComponentChildren;
  // deno-lint-ignore no-explicit-any
  mockData?: any;
};

type GoogleMapsRouteContext = { status: "loading" } | {
  status: "error";
  error: unknown;
} | {
  status: "loaded";
  route: google.maps.DirectionsResult;
};

export const googleMapsRouteContext = createContext<GoogleMapsRouteContext>({
  status: "loading",
});

export default function GoogleMapsRouteContext(
  { startAt, endAt, children, mockData }: GoogleMapsRouteContextProps,
) {
  if (!IS_BROWSER) {
    return (
      <p>Google Maps must be loaded on the client. No children will render</p>
    );
  }

  console.log("[gmrc] Load route", { startAt, endAt });

  const [value, setValue] = useState<GoogleMapsRouteContext>(
    !mockData
      ? { status: "loading" }
      : { status: "loaded", route: mockData[0] },
  );

  useEffect(() => {
    if (value.status !== "loading") return; // TODO: Test helper, remove
    const svc = new google.maps.DirectionsService();
    let cancelled = false;
    svc.route({
      origin: startAt,
      destination: endAt,
      travelMode: google.maps.TravelMode.BICYCLING,
    })
      .then((result) => {
        if (cancelled) return;
        console.log(`[gmrc] Got ${result.routes.length} routes`, result.routes);
        if (result.routes.length) {
          setValue(
            { route: result, status: "loaded" },
          );
        } else {
          setValue({
            status: "error",
            error: new Error("No routes in response"),
          });
        }
      });

    return () => {
      console.log("[gmrc] Cancel pending", {
        previouslyCancelled: cancelled,
      });
      cancelled = true;
    };
  }, [JSON.stringify(startAt), JSON.stringify(endAt)]);

  useEffect(() => {
    if (value.status !== "loaded") return;
    console.log("[gmrc] Route loaded", value.route);
    const route = value.route.routes[0];
    const sv = new google.maps.StreetViewService();
    const routeTracker = new GoogleMapsRouteTracker(route);
    worldSource.next(
      new StreetViewWorld(
        sv,
        routeTracker,
        createMapsApiLinksResolver(sv),
        50,
      ),
    );
  });
  return (
    <googleMapsRouteContext.Provider value={value}>
      {value.status === "loaded" ? children : <p>Loading route...</p>}
    </googleMapsRouteContext.Provider>
  );
}
