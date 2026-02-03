const CACHE_NAME = 'gmemp-v2'; // 每次改代码记得升个版本号（v1 -> v2）

const CACHE_EXTS = ['.mp3', '.webp', '.jpg', '.png', '.lrc', '.srt', '.json', '.js', '.css'];

self.addEventListener('install', (event) => {
    // 强制跳过等待，立即激活新版本
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // 激活后立即接管所有页面
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isMedia = CACHE_EXTS.some(ext => url.pathname.toLowerCase().endsWith(ext));

    if (isMedia) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        // console.log('从缓存读取:', url.pathname);
                        return response;
                    }

                    // 核心逻辑：如果是音乐请求，处理 Range 问题
                    let fetchRequest = event.request;
                    
                    // 如果请求头包含 Range，我们先通过 fetch 获取完整文件再存入缓存
                    // 这样下次 Howler 请求 Range 时，我们可以从完整的缓存中提供数据
                    return fetch(fetchRequest).then(networkResponse => {
                        // 只有状态码正常（200）才缓存
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
    }
});