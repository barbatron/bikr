import { useEffect, useRef } from "preact/hooks";

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleMap() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      console.log(ref.current);

      new window.google.maps.Map(ref.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 8,
      });
    }
  }, [ref.current]);

  return <div style={{ width: "100%", height: "100vh" }} ref={ref} id="map" />;
}
