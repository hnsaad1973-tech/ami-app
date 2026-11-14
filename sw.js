// AMI service worker: shows phone notifications
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "AMI", {
    body: d.body || "", icon: "https://xxdqrvcpxhsepwzfmnjs.supabase.co/storage/v1/object/public/public-assets/ami/icon-192.png", badge: "https://xxdqrvcpxhsepwzfmnjs.supabase.co/storage/v1/object/public/public-assets/ami/icon-192.png", tag: d.tag || undefined, data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
