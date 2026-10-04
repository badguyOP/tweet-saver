export const runtime = "edge";

// Small image proxy (avatars, photos, thumbnails) so the browser can draw them to a canvas.
export async function GET(req) {
  let u;
  try { u = new URL(new URL(req.url).searchParams.get("url")); } catch { return new Response("Bad URL", { status: 400 }); }
  if (u.protocol !== "https:" || !/(^|\.)twimg\.com$/.test(u.hostname)) return new Response("Host not allowed", { status: 403 });
  const r = await fetch(u);
  if (!r.ok) return new Response("Upstream error", { status: 502 });
  return new Response(r.body, { headers: {
    "Content-Type": r.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  }});
}
