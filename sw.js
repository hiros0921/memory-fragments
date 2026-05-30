// Service Worker for offline support
const CACHE_VERSION = 2;
const CACHE_NAME = 'memory-fragments-v' + CACHE_VERSION;
const urlsToCache = [
    './',
    './index.html',
    './js/firebase-config.js',
    './js/auth-manager.js',
    './js/auth-ui.js',
    './js/storage-manager.js',
    './js/premium-features.js',
    './js/cloud-sync-manager.js',
    './js/toast-notification.js',
    './js/onboarding.js',
    './js/analytics.js'
    // 外部URLはキャッシュから除外（CORSエラー回避）
];

// インストール時にキャッシュ & skipWaiting
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// フェッチリクエストの処理（Network-first with cache fallback）
self.addEventListener('fetch', event => {
    // chrome-extension:// スキームのリクエストは除外
    const url = new URL(event.request.url);
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // APIリクエストやFirebaseはキャッシュしない
    if (url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('stripe.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 正常なレスポンスをキャッシュに保存
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    if (event.request.url.startsWith('http://') || event.request.url.startsWith('https://')) {
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache).catch(() => {});
                            })
                            .catch(() => {});
                    }
                }
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return new Response('オフラインです。インターネット接続を確認してください。', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain; charset=utf-8'
                        })
                    });
                });
            })
    );
});

// 古いキャッシュを削除 & クライアントを即座に制御
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// バックグラウンド同期
self.addEventListener('sync', event => {
    if (event.tag === 'sync-memories') {
        event.waitUntil(syncMemories());
    }
});

async function syncMemories() {
    // IndexedDBから未同期データを取得
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const items = await store.getAll();

    // 同期処理
    for (const item of items) {
        try {
            // Firebaseに送信
            await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            });

            // 成功したら削除
            await deleteFromSyncQueue(item.id);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MemoryFragmentsDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFromSyncQueue(id) {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.delete(id);
}
