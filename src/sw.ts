/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Make TS happy about self
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

// Minimal SyncEvent typing for TS
interface SyncEvent extends ExtendableEvent { tag: string }

self.skipWaiting();
clientsClaim();

// Precaching manifest will be injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Runtime caching similar to previous config
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new StaleWhileRevalidate({ cacheName: 'assets-cache' })
);

registerRoute(
  ({ url }) => /\/data\/.*/.test(url.pathname) || url.pathname.endsWith('.geojson'),
  new CacheFirst({ cacheName: 'data-cache' })
);

// Cache OSM tiles for offline use (respecting OSM tile usage policy with modest caps)
registerRoute(
  ({ url, request }) => request.destination === 'image' && url.hostname.endsWith('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 14 * 24 * 60 * 60 }),
    ],
  })
);

// Fallback tile (SVG) when both network and cache miss
const OFFLINE_TILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#64748b">Offline</text></svg>';

setCatchHandler(async ({ event, request, url }) => {
  // Offline tile fallback for OSM tile requests
  if ((request as Request).destination === 'image' && (url as URL).hostname.endsWith('tile.openstreetmap.org')) {
    return new Response(OFFLINE_TILE_SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } });
  }
  return Response.error();
});

async function notifyClients(tag: string) {
  const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of all) {
    client.postMessage(`sync:${tag}`);
  }
}

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'submit-reports') {
    event.waitUntil(notifyClients('submit-reports'));
  }
});

export {};
