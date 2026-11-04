/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// app shell offline
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api\//] }));
// API reads: network first, cached copy when offline
registerRoute(({ url, request }) => url.pathname.startsWith("/api/") && request.method === "GET" && !url.pathname.startsWith("/api/barcode"),
  new NetworkFirst({ cacheName: "api", networkTimeoutSeconds: 4 }));
registerRoute(({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({ cacheName: "fonts" }));

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

self.addEventListener("push", (event) => {
  const d = event.data?.json() ?? { title: "Mochi Kcal", body: "" };
  const water = d.tag === "water";
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      tag: d.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { date: d.date ?? today() },
      ...(water ? { actions: [{ action: "drink", title: "Drank +150 ml" }] } : {}),
    } as NotificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "drink") {
    const date = event.notification.data?.date ?? today();
    event.waitUntil(
      fetch(`/api/days/${date}/water`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ delta: 150 }) })
        .then(() => self.clients.matchAll({ type: "window" }).then((cs) => cs.forEach((c) => c.postMessage({ type: "water-updated" }))))
    );
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("/")))
  );
});
