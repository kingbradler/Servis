// ══════════════════════════════════════════
// SERVIS — Service Worker PWA
// Version : v2 — Stratégie Cache First ⚡
// ══════════════════════════════════════════

const CACHE_NAME = 'servis-v2';
const CACHE_URLS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css',
  'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── Installation : mise en cache des assets statiques ──
self.addEventListener('install', event => {
  console.log('[SW] Install v2');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('[SW] Certains assets non mis en cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activation : suppression des anciens caches ──
self.addEventListener('activate', event => {
  console.log('[SW] Activate v2');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache :', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch : stratégie Cache First ⚡ ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Toujours réseau pour Supabase (données live)
  if(url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')){
    return; // pas d'interception
  }

  // Toujours réseau pour Mapbox
  if(url.hostname.includes('mapbox.com') || url.hostname.includes('mapbox.cn')){
    return;
  }

  // ⚡ Cache First pour tout le reste
  event.respondWith(
    caches.match(event.request).then(cached => {

      if(cached){
        // ✅ Trouvé dans le cache → réponse instantanée
        // En arrière-plan, on met à jour le cache silencieusement
        fetch(event.request).then(response => {
          if(response && response.status === 200 && response.type === 'basic'){
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {}); // Silencieux si pas de réseau

        return cached; // ⚡ Affichage immédiat
      }

      // ❌ Pas en cache → on télécharge
      return fetch(event.request)
        .then(response => {
          // On met en cache pour la prochaine fois
          if(response && response.status === 200 && response.type === 'basic'){
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Pas de réseau et pas en cache → page principale
          return caches.match('./');
        });
    })
  );
});

// ── Message : forcer mise à jour ──
self.addEventListener('message', event => {
  if(event.data === 'skipWaiting'){
    self.skipWaiting();
  }
});
