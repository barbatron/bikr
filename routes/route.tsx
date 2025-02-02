import { Handlers } from "$fresh/server.ts";
import * as path from "jsr:@std/path";

export const handler: Handlers = {
  async POST(req) {
    console.log("[route] POST");
    const body = await req.json();
    const outPath = path.join("testdata", "client-route-result.json");
    await Deno.writeTextFile(outPath, JSON.stringify(body));
    console.log(`[route] Wrote ${outPath}`);
    return new Response(null, {
      status: 201,
    });
  },
};
