// sw.js - Service Worker для PWA

const CACHE_NAME = 'asopb-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/utils.js',
  '/js/data/checklists.js',
  '/js/services/pdf-generator.service.js',
  '/js/yandex-disk.service.js',
  '/js/local-cache.service.js',
  '/js/sync-manager.service.js',
  '/js/app.js',
  '/js/components/yandex-disk-connect.js',
  '/js/main.js',
  '/fire.svg',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование статических ресурсов');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Ресурсы закэшированы');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker активирован');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы не к нашему домену
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API запросы к Яндекс.Диску не кэшируем
  if (event.request.url.includes('yandex.net') || 
      event.request.url.includes('yandex.ru')) {
    return;
  }

  // Стратегия: Cache First, затем Network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Возвращаем из кэша
          return cachedResponse;
        }

        // Загружаем из сети
        return fetch(event.request)
          .then((networkResponse) => {
            // Проверяем успешность ответа
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Клонируем ответ для кэширования
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Ошибка загрузки:', error);
            // Возвращаем офлайн-страницу для навигации
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  console.log('[SW] Фоновая синхронизация:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Отправляем сообщение клиенту для начала синхронизации
      self.clients.matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_REQUESTED'
            });
          });
        })
    );
  }
});

// Уведомления
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open-app') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clients) => {
          if (clients.length > 0) {
            clients[0].focus();
          } else {
            self.clients.openWindow('/');
          }
        })
    );
  }
});

// Сообщения от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
