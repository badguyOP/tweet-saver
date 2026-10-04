export const runtime = "edge";

// Streaming video proxy. Edge functions stream the body instead of buffering it,
// which avoids the normal serverless response-size limit.
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  let u;
  try { u = new URL(sp.get("url")); } catch { return new Response("Bad URL", { status: 400 }); }
  if (u.protocol !== "https:" || !/(^|\.)twimg\.com$/.test(u.hostname)) return new Response("Host not allowed", { status: 403 });
  const r = await fetch(u);
  if (!r.ok) return new Response("Upstream error", { status: 502 });
  const h = new Headers({ "Content-Type": r.headers.get("content-type") || "video/mp4" });
  const len = r.headers.get("content-length");
  if (len) h.set("Content-Length", len);
  const name = sp.get("name");
  if (name) h.set("Content-Disposition", `attachment; filename="${name.replace(/[^\w.\-]/g, "_")}"`);
  return new Response(r.body, { headers: h });
}
