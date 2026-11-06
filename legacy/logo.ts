import { blob } from "https://esm.town/v/std/blob/main.ts";

export default async function (req: Request): Promise<Response> {
  const res = await blob.get("logo.jpg");
  const bytes = await res.arrayBuffer();
  return new Response(bytes, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=604800",
    },
  });
}
