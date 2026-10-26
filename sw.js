// Keeps the tracker working with no internet once it has been opened online.
// Online: always loads the newest tracker from the website. Offline: uses the saved copy.
const CACHE = "job-skills-1792979486";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fetch(new Request(f, {cache: "reload"})).then(r => { if (r.ok) return c.put(f, r); }).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
function fresh(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("slow")), ms);
    fetch(req, {cache: "no-store"}).then(r => { clearTimeout(t); r && r.ok ? resolve(r) : reject(new Error("bad")); }, err => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    // the page itself: newest from the internet when it answers within 4 seconds, otherwise the saved copy
    e.respondWith(fresh(new Request("./index.html"), 4000)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => { c.put("./index.html", copy.clone()); c.put("./", copy); }); return r; })
      .catch(() => caches.match("./index.html").then(h => h || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; });
    return hit ? (net.catch(() => hit), hit) : net.catch(() => caches.match("./index.html"));
  }));
});
