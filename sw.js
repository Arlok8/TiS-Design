// TiS Design Service Worker
// Versione: 1.0.0

const CACHE_NAME = 'tis-design-v1.0.0';
const STATIC_CACHE = 'tis-design-static-v1.0.0';
const DYNAMIC_CACHE = 'tis-design-dynamic-v1.0.0';

// Risorse da cacheare immediatamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/immagini/logo_bianco.png',
  '/immagini/logo_nero.png',
  '/immagini/bg-neon.jpg',
  '/immagini/og-preview.jpg',
  '/immagini/carte/tshirt_viola.webp',
  '/immagini/carte/gadget_viola.webp',
  '/immagini/carte/vetrine_viola.webp',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png'
];

// Risorse da cacheare dinamicamente
const DYNAMIC_ASSETS = [
  '/immagini/icon-192.png',
  '/immagini/icon-512.png'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('TiS Design SW: Installazione in corso...');
  
  event.waitUntil(
    Promise.all([
      // Cache delle risorse statiche
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('TiS Design SW: Cacheando risorse statiche...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache delle risorse dinamiche
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log('TiS Design SW: Cacheando risorse dinamiche...');
        return cache.addAll(DYNAMIC_ASSETS);
      })
    ]).then(() => {
      console.log('TiS Design SW: Installazione completata!');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('TiS Design SW: Errore durante installazione:', error);
    })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('TiS Design SW: Attivazione in corso...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Rimuovi cache vecchie
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('TiS Design SW: Rimuovendo cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('TiS Design SW: Attivazione completata!');
      return self.clients.claim();
    })
  );
});

// Intercettazione delle richieste
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Strategia per risorse statiche
  if (STATIC_ASSETS.includes(url.pathname) || DYNAMIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log('TiS Design SW: Servendo da cache:', url.pathname);
          return response;
        }
        
        return fetch(request).then((fetchResponse) => {
          // Cache della risposta per uso futuro
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // Strategia per HTML (sempre dalla rete, cache come fallback)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request).then((response) => {
        // Cache della risposta HTML
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback alla cache se la rete non è disponibile
        return caches.match(request);
      })
    );
    return;
  }
  
  // Strategia per immagini
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // Strategia di default: Network First
  event.respondWith(
    fetch(request).then((response) => {
      // Cache della risposta se valida
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // Fallback alla cache
      return caches.match(request);
    })
  );
});

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Gestione push notifications (per uso futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/immagini/icon-192.png',
      badge: '/immagini/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Vedi offerta',
          icon: '/immagini/icon-192.png'
        },
        {
          action: 'close',
          title: 'Chiudi',
          icon: '/immagini/icon-192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Gestione click su notifiche
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('TiS Design SW: Service Worker caricato!'); 