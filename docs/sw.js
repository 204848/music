// sw.js
const CACHE_NAME = 'gmemp-media-v1';

// 需要持久化缓存的资源后缀
const CACHE_EXTS = ['.mp3', '.webp', '.jpg', '.png', '.lrc', '.srt', '.json'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isMedia = CACHE_EXTS.some(ext => url.pathname.endsWith(ext));

    if (isMedia) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // 如果缓存里有，直接返回；否则去网络抓取并存入缓存
                    return response || fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});