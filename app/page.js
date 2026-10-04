"use client";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

const P = u => "/api/img?url=" + encodeURIComponent(u);
const fmt = n => n == null ? "–" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n;
const waitImgs = el => Promise.all([...el.querySelectorAll("img")].map(i => i.complete ? 1 : new Promise(r => (i.onload = i.onerror = r))));
const save = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

export default function Home() {
  const [url, setUrl] = useState("");
  const [t, setT] = useState(null);
  const [theme, setTheme] = useState("");
  const [hide, setHide] = useState({});
  const tog = k => setHide(h => ({ ...h, [k]: !h[k] }));
  const stats = t ? [["replies", "Replies"], ["reposts", "Reposts"], ["likes", "Likes"], ["views", "Views"]].filter(([k]) => !hide[k]) : [];
  const [err, setErr] = useState("");
  const [slot, setSlot] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState("");
  const card = useRef(null);
  const ff = useRef(null);

  async function lookup() {
    setErr(""); setT(null); setPreview(""); setBusy("fetch");
    try {
      const r = await fetch("/api/tweet?url=" + encodeURIComponent(url.trim()));
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setT(j);
    } catch (e) { setErr(e.message || "Something went wrong."); }
    setBusy("");
  }

  async function render(scale) {
    await waitImgs(card.current);
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(card.current, { scale, backgroundColor: null, useCORS: true });
  }

  async function saveImage() {
    setBusy("img");
    const c = await render(3);
    const d = c.toDataURL("image/png");
    setPreview(d); save(d, `tweet_${t.id}.png`);
    setBusy("");
  }

  // Builds "tweet text + video" MP4 entirely in the visitor's browser (ffmpeg.wasm).
  async function saveTextVideo() {
    const v = t.media.find(m => m.type !== "photo");
    setBusy("vid"); setMsg("Preparing card…");
    try {
      flushSync(() => setSlot(true));
      const S = 1.5, c = await render(S);
      const tr = card.current.getBoundingClientRect(), sr = document.getElementById("slot").getBoundingClientRect();
      const ev = n => Math.round(n) - (Math.round(n) % 2);
      const [X, Y, W, H] = [(sr.left - tr.left) * S, (sr.top - tr.top) * S, sr.width * S, sr.height * S].map(ev);
      flushSync(() => setSlot(false));


      setMsg("Loading video engine (first time ~30 MB)…");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      if (!ff.current) {
        const f = new FFmpeg();
        const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
        await f.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ff.current = f;
      }
      const f = ff.current;
      f.on("progress", ({ progress }) => setMsg(`Encoding… ${Math.min(100, Math.round(progress * 100))}%`));
      setMsg("Downloading video…");
      await f.writeFile("card.png", await fetchFile(c.toDataURL("image/png")));
      await f.writeFile("in.mp4", await fetchFile("/api/video?url=" + encodeURIComponent(v.url)));
      const filter = `[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black[v];` +
        `[0:v][v]overlay=${X}:${Y}:shortest=1,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[out]`;
      await f.exec(["-loop", "1", "-framerate", "24", "-i", "card.png", "-i", "in.mp4", "-filter_complex", filter,
        "-map", "[out]", "-map", "1:a?", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac", "-shortest", "-movflags", "+faststart", "out.mp4"]);
      const data = await f.readFile("out.mp4");
      save(URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" })), `tweet_${t.id}_video.mp4`);
      setMsg("Done.");
    } catch (e) { setSlot(false); setMsg("Couldn't build the video on this device. Try a shorter clip or a desktop browser."); }
    setBusy("");
  }

  const v0 = t?.media.find(m => m.type !== "photo");
  const vis = t ? t.media.slice(0, 4) : [];
  const d = t ? new Date(t.created_at) : null;

  return (
    <main>
      <h1>Tweet Saver</h1>
      <p className="sub">Paste a tweet link. Download it as an image, plus its videos and photos.</p>
      <div className="row">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()} placeholder="https://x.com/user/status/123…" inputMode="url" />
        <button onClick={lookup} disabled={busy === "fetch"}>{busy === "fetch" ? "…" : "Get"}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {t && (<>
        <div className="chips">{[["date", "Date & time"], ["replies", "Replies"], ["reposts", "Reposts"], ["likes", "Likes"], ["views", "Views"]].map(([k, l]) => <label key={k}><input type="checkbox" checked={!hide[k]} onChange={() => tog(k)} />{l}</label>)}</div>
        <div className="row"><select value={theme} onChange={e => setTheme(e.target.value)}><option value="">Light</option><option value="dim">Dim</option><option value="dark">Dark</option></select></div>
        <div id="tw" ref={card} className={theme}>
          <div className="h"><img className="av" src={P(t.author.avatar)} alt="" /><div><div className="nm">{t.author.name}</div><div className="hd">@{t.author.handle}</div></div></div>
          <div className="tx">{t.text}</div>
          {slot && v0 ? <div className="md" id="slot" style={{ aspectRatio: `${v0.w || 16}/${v0.h || 9}`, background: "#000" }} />
            : vis.length > 0 && <div className={"md" + (vis.length > 1 ? " two" : "")}>{vis.map((m, i) => <img key={i} src={P(m.thumb)} alt="" />)}{vis[0].type !== "photo" && <div className="pl"><span>▶</span></div>}</div>}
          {!hide.date && <div className="dt">{isNaN(d) ? "" : d.toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", year: "numeric" })}</div>}
          {stats.length > 0 && <div className="st">{stats.map(([k, l]) => <span key={k}><b>{fmt(t.stats[k])}</b> {l}</span>)}</div>}
        </div>
        <button onClick={saveImage} disabled={!!busy}>Download tweet as image</button>
        {v0 && <button onClick={saveTextVideo} disabled={!!busy}>{busy === "vid" ? "Building video…" : "Download tweet text + video (MP4)"}</button>}
        {msg && <div className="note">{msg}</div>}
        {t.media.map((m, i) => {
          const photo = m.type === "photo", label = photo ? "photo" : m.type === "gif" ? "GIF" : "video";
          return <a key={i} className="btn alt" href={`/api/video?url=${encodeURIComponent(m.url)}&name=${t.author.handle}_${t.id}_${i + 1}.${photo ? "jpg" : "mp4"}`}>Download {label} {t.media.length > 1 ? i + 1 : ""}</a>;
        })}
        {preview && <div className="out"><img src={preview} alt="tweet" /></div>}
      </>)}
      <p className="note">Only save content you have the right to use. Credit the original author.</p>
    </main>
  );
}
