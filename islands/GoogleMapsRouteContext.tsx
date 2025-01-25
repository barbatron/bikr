import { IS_BROWSER } from "$fresh/runtime.ts";
import { assert } from "$std/assert/assert.ts";
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
import { gmRouteToJunctions } from "../core/world/streetview/streetview-utils.ts";

type GoogleMapsRouteContextProps = {
  startAt: google.maps.DirectionsRequest["origin"];
  endAt: google.maps.DirectionsRequest["destination"];
  children: ComponentChildren;
  // deno-lint-ignore no-explicit-any
  mockData?: any;
};

type DirectionsResultWithAtLeastOneRoute = google.maps.DirectionsResult & {
  routes: [google.maps.DirectionsRoute, ...google.maps.DirectionsRoute[]];
};

type GoogleMapsRouteContext = { status: "loading" } | {
  status: "error";
  error: unknown;
} | {
  status: "loaded";
  directionsResult: DirectionsResultWithAtLeastOneRoute;
};

function hasAtLeastOneRoute(
  result: google.maps.DirectionsResult,
): result is DirectionsResultWithAtLeastOneRoute {
  return result.routes.length > 0;
}

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
      : { status: "loaded", directionsResult: mockData[0] },
  );

  useEffect(() => {
    if (value.status !== "loading") return; // TODO: Test helper, remove
    const svc = new google.maps.DirectionsService();
    let cancelled = false;
    svc.route({
      origin: startAt,
      destination: endAt,
      travelMode: google.maps.TravelMode.BICYCLING,
    }, function (result, status) {
      if (cancelled) return;
      switch (status) {
        case google.maps.DirectionsStatus.OK: {
          assert(result);
          console.log(
            `[gmrc] Got ${result.routes.length} routes`,
            result.routes,
          );
          if (hasAtLeastOneRoute(result)) {
            setValue(
              { directionsResult: result, status: "loaded" },
            );
          } else {
            setValue({
              status: "error",
              error: new Error("No routes in response: "),
            });
          }
          break;
        }
        case google.maps.DirectionsStatus.INVALID_REQUEST:
        case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
        case google.maps.DirectionsStatus.NOT_FOUND:
        case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        case google.maps.DirectionsStatus.REQUEST_DENIED:
        case google.maps.DirectionsStatus.UNKNOWN_ERROR:
        case google.maps.DirectionsStatus.ZERO_RESULTS:
          setValue({
            status: "error",
            error: new Error(`Directions request failed: ${status}`),
          });
          break;
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
    console.log("[gmrc] Route loaded");
    const sv = new google.maps.StreetViewService();
    const junctions = gmRouteToJunctions(value.directionsResult.routes[0]);
    const routeTracker = new GoogleMapsRouteTracker(junctions);
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
