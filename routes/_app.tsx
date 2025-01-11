import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  const API_KEY = Deno.env.get("GOOGLE_MAP_API_KEY");
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>google map fresh example</title>
        <link rel="stylesheet" href="/styles.css" />
        {/* <script
          src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=maps,marker,streetView`}
        >
        </script> */}
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
