// sw.js 建议版本
const CACHE_NAME = 'gmemp-v3';
const CACHE_EXTS = ['.mp3', '.webp', '.jpg', '.png', '.lrc', '.srt', '.json', '.js', '.css'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // 清理旧版本缓存（防止占用过多空间）
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isMedia = CACHE_EXTS.some(ext => url.pathname.toLowerCase().endsWith(ext));

    if (isMedia) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // 命中缓存直接返回，不打印任何东西
                    if (response) return response;

return fetch(event.request).then(networkResponse => {
    // 只缓存 200 成功的请求，且对于音频请求，我们只要完整的响应
    if (networkResponse.status === 200) {
        const cacheCopy = networkResponse.clone();
        cache.put(event.request, cacheCopy);
    }
    return networkResponse;
                    }).catch(() => {
                        // 只有抓取失败才输出报错，方便排查断网情况
                    });
                });
            })
        );
    }
});