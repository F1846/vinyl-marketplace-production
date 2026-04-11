export const runtime = "edge";

// Serve the icon PNG directly so crawlers (including Google) get a real
// image instead of following a redirect chain.
export async function GET(request: Request) {
  const iconUrl = new URL("/icon", request.url).toString();
  const upstream = await fetch(iconUrl);
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
