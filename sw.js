// FluxZero service worker: показывает push-уведомления, когда приложение закрыто.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch (x) { d = { title: "FluxZero", body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    const cs = await clients.matchAll({ type: "window", includeUncontrolled: true });
    if (cs.some(c => c.visibilityState === "visible" && c.focused)) return; // приложение открыто: плашка показывается внутри него
    await self.registration.showNotification(d.title || "FluxZero", {
      body: d.body || "", icon: "icon-192.png", badge: "icon-192.png",
      tag: d.chat || "msg", renotify: true, vibrate: [80, 40, 80], data: { chat: d.chat }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const chat = e.notification.data && e.notification.data.chat;
  e.waitUntil((async () => {
    const cs = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) { await c.focus(); if (chat) c.postMessage({ chat }); return; }
    await clients.openWindow("./" + (chat ? "?chat=" + encodeURIComponent(chat) : ""));
  })());
});
