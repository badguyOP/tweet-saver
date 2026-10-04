export const runtime = "edge";

export async function GET(req) {
  const url = new URL(req.url).searchParams.get("url") || "";
  const m = url.match(/(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
  if (!m) return Response.json({ error: "That doesn't look like a tweet link." }, { status: 400 });
  try {
    const r = await fetch(`https://api.fxtwitter.com/status/${m[1]}`, { headers: { "User-Agent": "TweetSaver/1.0" } });
    const j = await r.json();
    if (!r.ok || !j.tweet) return Response.json({ error: "Tweet not found, private, or deleted." }, { status: 404 });
    const t = j.tweet;
    return Response.json({
      id: t.id, text: t.text, created_at: t.created_at,
      author: { name: t.author.name, handle: t.author.screen_name, avatar: t.author.avatar_url },
      stats: { replies: t.replies, reposts: t.retweets, likes: t.likes, views: t.views },
      media: (t.media?.all || []).map(x => ({ type: x.type, url: x.url, thumb: x.thumbnail_url || x.url, w: x.width, h: x.height })),
    });
  } catch { return Response.json({ error: "Couldn't reach the tweet service. Try again." }, { status: 502 }); }
}
