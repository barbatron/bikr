import { protos, v2 } from "npm:@googlemaps/routing";
import { useEffect, useState } from "npm:preact/hooks";

const { RoutesClient } = v2;

type UseMapsRouteOptions = {
  startAt: google.maps.LatLngLiteral;
  endAt: google.maps.LatLngLiteral;
};

export type GRoute = protos.google.maps.routing.v2.IRoute;

export function useMapsRoute({ startAt, endAt }: UseMapsRouteOptions) {
  const origin = {
    location: {
      latLng: { latitude: startAt.lat, longitude: startAt.lng },
    },
  };
  const destination = {
    location: {
      latLng: { latitude: endAt.lat, longitude: endAt.lng },
    },
  };

  const [route, setRoute] = useState<
    GRoute | undefined
  >();

  useEffect(() => {
    // Instantiates a client
    const routingClient = new RoutesClient();

    const request = {
      origin,
      destination,
    };
    // Run request
    routingClient.computeRoutes(request, {
      otherArgs: {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "YOUR_API_KEY",
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
      },
    }).then(
      (
        response: [
          protos.google.maps.routing.v2.IComputeRoutesResponse,
          unknown,
          unknown,
        ],
      ) => {
        console.log("route reseponse", response);
        const [result] = response;
        if (result.routes) {
          const route = result.routes[0];
          setRoute(route);
        } else {
          console.warn("[useMapsRoute] no route found maybe", response);
        }
      },
    );
  }, [JSON.stringify({ startAt, endAt })]);

  return route;
}
