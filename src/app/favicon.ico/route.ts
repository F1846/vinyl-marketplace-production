export const runtime = "edge";

export async function GET(request: Request) {
  return Response.redirect(new URL("/icon", request.url), 308);
}
