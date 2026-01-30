let media = "media/";

// ==========================================================
// == 可配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;

// 音频可视化灵敏度 (0.0 - 1.0, 值越小越不敏感/平缓, 值越大越敏感/激烈)
// * 建议值范围: 0.3 (非常平缓) 到 0.8 (比较激烈)
const VISUALIZATION_SENSITIVITY = 0.5;

// 音频可视化透明度 (0.0 - 1.0)
const VISUALIZATION_OPACITY = 0.5;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'waveCanvas', 'loading', 'playlist', 'list', 'lyricBtn', 'lyricContainer', 'modeBtn'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

// 新增的底部进度条元素
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressFilled = document.getElementById('progress-filled');
const progressSlider = document.getElementById('progress-slider');
const currentTimeDisplay = document.getElementById('progress-current-time');
const durationDisplay = document.getElementById('progress-duration');

// 音量控制相关元素
const volumePopup = document.getElementById('volume-popup');
const volumeBarTrack = document.getElementById('volume-bar-track');
const volumeBarFilled = document.getElementById('volume-bar-filled');
const volumePercentage = document.getElementById('volume-percentage');

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');

// 新增歌词元素引用
const lyricLines = {
    prev2: document.querySelector('.prev-line-2'),
    prev1: document.querySelector('.prev-line-1'),
    current: document.querySelector('.current-line'),
    next1: document.querySelector('.next-line-1'),
    next2: document.querySelector('.next-line-2')
};

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricInterval = null;
let lastLyricIndex = -1; // 用于跟踪当前歌词索引
let isSeeking = false;
let pendingSeekPercent = null; // 用于存储等待播放时的seek位置
let preloadedDurations = {}; // 缓存预加载的时长
let preloadedLyrics = {}; // 缓存预加载的歌词

// 背景轮询与缓存相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// SVG 图标 Data URIs (保持不变)
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96h32V64c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H96c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416H352c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H96c30.2 0 58.7 14.2 76.8 38.4l153.6 204.8c6 8.1 15.5 12.8 25.6 12.8h32V320c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 224c0 17.7 14.3 32 32 32s32-14.3 32-32c0-53 43-96 96-96H320v32c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l64-64c6-6 9.4-14.1 9.4-22.6s-3.4-16.6-9.4-22.6l-64-64c-9.2-9.2-22.9-11.9-34.9-6.9S320 19.1 320 32V64H160C71.6 64 0 135.6 0 224zm512 64c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 53-43 96-96 96H192V352c0-12.9-7.8-24.6-19.8-29.6s-25.7-2.2-34.9 6.9l-64 64c-6 6-9.4 14.1-9.4 22.6s3.4 16.6 9.4 22.6l64 64c9.2 9.2 22.9 11.9 34.9 6.9s19.8-16.6 19.8-29.6V448H352c88.4 0 160-71.6 160-160z'/%3E%3C/svg%3E"
};

const modeTitles = {
    list: '顺序播放',
    shuffle: '随机播放',
    single: '单曲循环'
};

// 音量控制相关变量
let isVolumeDragging = false;
let volumeHideTimeout = null;

let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    console.log(jsonData);

    if (window.location.hash != '') {
        try {
            playNum = parseInt(window.location.hash.slice(1));
            if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = jsonData.length - 1;
        } catch {
            playNum = jsonData.length - 1;
        }
    } else {
        playNum = jsonData.length - 1;
    }

    player = new Player(jsonData);
};

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3})|\:(\d{2}))?\]/g;
        let match;
        let lastIndex = 0;
        let times = [];
        while ((match = regex.exec(line)) !== null) {
            let min = parseInt(match[1]);
            let sec = parseInt(match[2]);
            let ms = 0;
            if (match[3]) ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
            else if (match[4]) ms = parseInt(match[4]) * 10;
            times.push(min * 60 + sec + ms / 1000);
            lastIndex = match.index + match[0].length;
        }
        const text = line.substring(lastIndex).trim();
        if (text && times.length > 0) {
            for (let time of times) {
                result.push({ time, text });
            }
        }
    }
    result.sort((a, b) => a.time - b.time);
    for (let i = 0; i < result.length - 1; i++) {
        result[i].end = result[i + 1].time;
    }
    if (result.length > 0) {
        result[result.length - 1].end = Infinity;
    }
    return result;
}

function parseSRT(srtText) {
    if (!srtText) return [];
    const lines = srtText.split(/\r?\n/);
    const result = [];
    let i = 0;
    while (i < lines.length) {
        const indexLine = lines[i].trim();
        if (!/^\d+$/.test(indexLine)) { i++; continue; }
        i++;
        if (i >= lines.length) break;
        const timeLine = lines[i].trim();
        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (!timeMatch) { i++; continue; }
        const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
        const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
            if (text) text += '<br>';
            text += lines[i].trim();
            i++;
        }
        if (text) result.push({ time: start, end, text });
    }
    return result;
}

function getCurrentLyricIndex(time, lyrics) {
    if (!lyrics || lyrics.length === 0) return -1;

    if (time < lyrics[0].time) {
        return 0;
    }

    let left = 0;
    let right = lyrics.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lyrics[mid].time <= time) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    if (result >= 0 && time < (lyrics[result].end || Infinity)) {
        return result;
    }

    return Math.max(0, result);
}

function updateLyricDisplay(lyrics, currentIndex) {
    if (!lyrics || lyrics.length === 0) {
        lyricLines.prev2.textContent = '';
        lyricLines.prev1.textContent = '';
        lyricLines.current.textContent = '暂无歌词';
        lyricLines.next1.textContent = '';
        lyricLines.next2.textContent = '';
        return;
    }

    const prev2El = lyricLines.prev2;
    const prev1El = lyricLines.prev1;
    const currentEl = lyricLines.current;
    const next1El = lyricLines.next1;
    const next2El = lyricLines.next2;

    prev2El.style.opacity = '0';
    prev1El.style.opacity = '0';
    currentEl.style.opacity = '0';
    next1El.style.opacity = '0';
    next2El.style.opacity = '0';

    setTimeout(() => {
        const index = Math.max(0, Math.min(currentIndex, lyrics.length - 1));

        prev2El.textContent = (index >= 2) ? lyrics[index - 2].text : '';
        prev1El.textContent = (index >= 1) ? lyrics[index - 1].text : '';
        currentEl.textContent = (index >= 0) ? lyrics[index].text : '';
        next1El.textContent = (index < lyrics.length - 1) ? lyrics[index + 1].text : '';
        next2El.textContent = (index < lyrics.length - 2) ? lyrics[index + 2].text : '';

        prev2El.style.opacity = index >= 2 ? '0.7' : '0';
        prev1El.style.opacity = index >= 1 ? '0.7' : '0';
        currentEl.style.opacity = '1';
        next1El.style.opacity = index < lyrics.length - 1 ? '0.7' : '0';
        next2El.style.opacity = index < lyrics.length - 2 ? '0.7' : '0';

        prev2El.style.transform = index >= 2 ? 'translateY(-32px)' : 'translateY(0)';
        prev1El.style.transform = index >= 1 ? 'translateY(-16px)' : 'translateY(0)';
        currentEl.style.transform = 'scale(1.05)';
        next1El.style.transform = index < lyrics.length - 1 ? 'translateY(16px)' : 'translateY(0)';
        next2El.style.transform = index < lyrics.length - 2 ? 'translateY(32px)' : 'translateY(0)';
    }, 150);
}

function showVolumePopup() {
    clearTimeout(volumeHideTimeout);
    volumePopup.classList.add('show');
    progressContainer.style.width = '89%';
}

function hideVolumePopup() {
    volumeHideTimeout = setTimeout(() => {
        volumePopup.classList.remove('show');
        progressContainer.style.width = '100%';
    }, 300);
}

function updateVolumeDisplay(volume) {
    const percent = Math.round(volume * 100);
    const heightPercent = percent;
    volumeBarFilled.style.height = heightPercent + '%';
    volumePercentage.textContent = percent + '%';
}

function setVolume(volume) {
    Howler.volume(volume);
    updateVolumeDisplay(volume);
}

function calculateVolumeFromPosition(clientY) {
    const rect = volumeBarTrack.getBoundingClientRect();
    const position = (rect.bottom - clientY) / rect.height;
    return Math.max(0, Math.min(1, position));
}

let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list';
    this.mediaSource = null;
    this.currentlyLoadingIndex = -1; // 新增：记录当前正在加载的歌曲索引

    // --- 加载优先级调整开始 ---
    // 1. 设置当前歌曲的基本信息和OG标签，确保最快显示
    let data = playlist[this.index];
    track.innerHTML = data.title;
    artist.innerHTML = data.artist;
    document.title = `${data.title} - Gmemp`;
    post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
    const initialPicForOG = Array.isArray(data.pic) ? data.pic[0] : data.pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPicForOG));
    document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);

    // 2. 立即加载当前歌曲的背景图片（所有图片如果有多张）
    this.setBackground(data.pic, true);

    // 3. 立即加载当前歌曲的歌词
    this.loadLyric(data.lyric || null);

    // 4. 初始化当前歌曲的Howl实例并开始预加载 'auto' 级别的数据
    this.currentlyLoadingIndex = this.index; // 设置当前正在加载的索引
    if (!data.howl) {
        data.howl = new Howl({
            src: [media + data.mp3],
            html5: isMobile(),
            preload: 'auto', // 播放前尽可能多的加载，以减少卡顿
            onloadeddata: () => { // 仅HTML5模式下触发，通常用于获取元数据后继续下载
                console.log(`当前歌曲 (${data.title}) 元数据/部分数据加载完成 (HTML5模式)`);
                this.updateDurationDisplays(data.howl.duration());
                preloadedDurations[this.index] = data.howl.duration();
            },
            onload: () => { // Web Audio API 和 HTML5 模式都会触发，表示已准备好播放
                console.log(`当前歌曲 (${data.title}) 完全加载完成`);
                this.updateDurationDisplays(data.howl.duration());
                preloadedDurations[this.index] = data.howl.duration();
                this.currentlyLoadingIndex = -1; // 加载完成
                // 如果当前正好在加载此歌曲且用户点击了播放但还未开始，则启动
                if (loading.style.display === 'block' && !data.howl.playing()) {
                    playBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    loading.style.display = 'none';
                }
            },
            onloaderror: (id, err) => {
                console.error(`当前歌曲 (${data.title}) 加载失败:`, err);
                this.currentlyLoadingIndex = -1; // 加载失败
                // 恢复播放按钮，隐藏加载动画
                playBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
                loading.style.display = 'none';
            }
        });
    } else {
        // 如果Howl实例已经存在，确保其 preload 状态是 'auto'
        if (data.howl.state() === 'loaded') {
            this.updateDurationDisplays(data.howl.duration());
            preloadedDurations[this.index] = data.howl.duration();
            this.currentlyLoadingIndex = -1; // 已经是加载完成状态
        } else if (data.howl.state() === 'loading') {
            // 如果还在加载中，等待其完成
            data.howl.once('load', () => {
                this.updateDurationDisplays(data.howl.duration());
                preloadedDurations[this.index] = data.howl.duration();
                this.currentlyLoadingIndex = -1;
                 // 如果当前正好在加载此歌曲且用户点击了播放但还未开始，则启动
                if (loading.style.display === 'block' && !data.howl.playing()) {
                    playBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    loading.style.display = 'none';
                }
            });
            data.howl.once('loaderror', (id, err) => {
                console.error(`当前歌曲 (${data.title}) 预加载失败:`, err);
                this.currentlyLoadingIndex = -1;
                // 恢复播放按钮，隐藏加载动画
                playBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
                loading.style.display = 'none';
            });
        }
    }
    // --- 加载优先级调整结束 ---

    // 初始化音量显示
    updateVolumeDisplay(Howler.volume());

    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = `${song.title} - ${song.artist}`;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.updateModeButton();

    // 在播放器初始化时预加载相邻曲目
    this.preloadAdjacentTracks(this.index);
};

Player.prototype = {
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = typeof index === 'number' ? index : this.index;
        let data = this.playlist[index];
        let sound;

        // 清除之前的定时器
        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricIndex = -1;

        // 如果是新track，重置进度条
        if (isNewTrack) {
            this.resetProgressBar();
            // 如果切换了歌曲，停止旧歌曲的Howl实例
            if (this.playlist[this.index] && this.playlist[this.index].howl) {
                this.playlist[this.index].howl.stop();
            }
            // 确保旧歌曲的可视化被清理
            if (this.drawId) {
                cancelAnimationFrame(this.drawId);
                this.drawId = null;
            }
        }

        if (!isNewTrack && this.isSlideshowRunning) {
            if (!backgroundInterval && data.howl && data.howl.playing()) {
                this.startBackgroundSlideshow(data.pic, false);
            }
        } else if (isNewTrack) {
            this.setBackground(data.pic, true);
        }

        // --- 避免重复请求音频文件：如果Howl实例已经存在且加载中或已加载，则直接使用 ---
        if (data.howl && data.howl.state() !== 'unloaded') {
            sound = data.howl;
            // 确保预加载模式为 'auto'
            if (sound._preload !== 'auto') {
                // 如果是 HTML5 模式，需要重新 load 才能改变 preload 行为
                // 但 Howler.js 没有直接更改 preload 的 API，通常是重新创建 Howl
                // 对于已有的 Howl 实例，通常不会重新设置 preload
                // 为了简化，我们假设 preload 在创建时就已设置好
            }

            if (sound.state() === 'loading') {
                loading.style.display = 'block';
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'none';
                this.currentlyLoadingIndex = index; // 更新当前正在加载的索引
                // 监听加载完成事件，完成后再播放
                sound.once('load', () => {
                    loading.style.display = 'none';
                    if (this.index === index && !sound.playing()) { // 确保是当前歌曲且未播放
                        sound.play(); // 加载完成立即播放
                    }
                });
                sound.once('loaderror', (id, err) => {
                    console.error(`播放歌曲 (${data.title}) 失败:`, err);
                    loading.style.display = 'none';
                    playBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    this.currentlyLoadingIndex = -1;
                });
                return; // 等待加载完成再播放
            }
        } else {
            // 如果Howl实例不存在或已卸载，则创建新的
            this.currentlyLoadingIndex = index; // 设置当前正在加载的索引
            sound = data.howl = new Howl({
                src: [media + data.mp3],
                html5: isMobile(),
                preload: 'auto', // 播放时可以设置为auto，确保更快的启动和更少卡顿
                onplay: () => {
                    this.updateDurationDisplays(sound.duration());
                    if (!isSeeking) {
                         requestAnimationFrame(this.step.bind(this));
                    }
                    pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';

                    lyricInterval = setInterval(() => {
                        if (!isSeeking) {
                            const pos = sound.seek();
                            const lyrics = preloadedLyrics[index] || currentLyrics;
                            const currentIndex = getCurrentLyricIndex(pos, lyrics);
                            if (currentIndex !== lastLyricIndex) {
                                updateLyricDisplay(lyrics, currentIndex);
                                lastLyricIndex = currentIndex;
                            }
                        }
                    }, 80);

                    this.setupVisualization(sound);

                    if (pendingSeekPercent !== null) {
                        sound.seek(sound.duration() * pendingSeekPercent);
                        this.setPositionUI(sound.duration() * pendingSeekPercent, sound.duration());
                        pendingSeekPercent = null;
                    }
                    if (this.isSlideshowRunning && !backgroundInterval) {
                        this.startBackgroundSlideshow(data.pic, false);
                    }
                },
                onload: () => {
                    loading.style.display = 'none';
                    this.updateDurationDisplays(sound.duration());
                    preloadedDurations[index] = sound.duration();
                    this.currentlyLoadingIndex = -1; // 加载完成
                    // 在这里触发播放，因为可能是在等待onload后才播放
                    if (this.index === index && !sound.playing()) { // 确保是当前歌曲且未播放
                         sound.play();
                    }
                },
                onend: () => { this.playNextTrack(); },
                onpause: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (this.drawId) {
                        cancelAnimationFrame(this.drawId);
                        this.drawId = null;
                    }
                },
                onstop: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (this.drawId) {
                        cancelAnimationFrame(this.drawId);
                        this.drawId = null;
                    }
                },
                onseek: () => {
                    const pos = sound.seek();
                    const lyrics = preloadedLyrics[index] || currentLyrics;
                    const currentIndex = getCurrentLyricIndex(pos, lyrics);
                    updateLyricDisplay(lyrics, currentIndex);
                    lastLyricIndex = currentIndex;
                    if (sound.playing() && !isSeeking) {
                        requestAnimationFrame(this.step.bind(this));
                    }
                },
                onloaderror: (id, err) => {
                    console.error(`加载歌曲 (${data.title}) 失败:`, err);
                    loading.style.display = 'none';
                    playBtn.style.display = 'block';
                    pauseBtn.style.display = 'none';
                    this.currentlyLoadingIndex = -1;
                }
            });
            // 立即开始加载
            sound.load(); // Howler.js 默认在创建后立即加载，但显式调用更明确
            loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none';
        }

        // 如果声音已经加载完成，并且没有在播放，就播放它
        if (sound.state() === 'loaded' && !sound.playing()) {
            sound.play();
        }

        if (isNewTrack) {
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
            window.location.hash = "#" + index;
            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            if(document.querySelector('#list-song-' + playNum)) { document.querySelector('#list-song-' + playNum).style.backgroundColor = ''; }
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;
            this.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) this.updateMediaSession(data);
            // setupVisualization 会在 onplay 中被调用
        }

        // 根据当前加载状态更新UI
        if (this.currentlyLoadingIndex === index) {
            loading.style.display = 'block';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
        } else if (sound.state() === 'loaded') {
            loading.style.display = 'none';
            if (sound.playing()) {
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'block';
            } else {
                playBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
            }
        } else {
            // 如果不是当前加载的，也不是已加载的，可能是发生了错误或者状态不明确
            console.warn(`Unexpected sound state for ${data.title}: ${sound.state()}`);
            loading.style.display = 'none';
            playBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
        }

        this.index = index;
        this.preloadAdjacentTracks(this.index);
    },

    resetProgressBar: function() {
        progressFilled.style.width = '0%';
        progressSlider.style.left = '0%';
        currentTimeDisplay.innerHTML = '0:00';
        timer.innerHTML = '0:00';
        pendingSeekPercent = null;
    },

    // 简化 preloadDuration，主要用于确保 durationDisplays 被更新
    preloadDuration: function(data, index) {
        if (preloadedDurations[index]) {
            this.updateDurationDisplays(preloadedDurations[index]);
            return;
        }

        if (data.howl && data.howl.state() === 'loaded') {
            const duration = data.howl.duration();
            preloadedDurations[index] = duration;
            this.updateDurationDisplays(duration);
        } else if (data.howl && data.howl.state() === 'loading') {
            data.howl.once('load', () => {
                const duration = data.howl.duration();
                preloadedDurations[index] = duration;
                this.updateDurationDisplays(duration);
            });
            data.howl.once('loaderror', () => {
                console.log(`Failed to get duration for ${data.title} during preload.`);
            });
        }
    },

    preloadAdjacentTracks: function(currentTrackIndex) {
        const nextIndex = (currentTrackIndex + 1) % this.playlist.length;
        const prevIndex = (currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;

        // 预加载下一曲 (如果Howl实例还未创建且不是当前正在加载的歌曲)
        if (!this.playlist[nextIndex].howl && nextIndex !== this.currentlyLoadingIndex) {
            this.playlist[nextIndex].howl = new Howl({
                src: [media + this.playlist[nextIndex].mp3],
                html5: isMobile(),
                preload: 'metadata', // 预加载时只获取元数据
                onloadeddata: () => {
                    console.log(`预加载下一曲 (${this.playlist[nextIndex].title}) 元数据完成 (HTML5模式)`);
                    if (!preloadedDurations[nextIndex] && this.playlist[nextIndex].howl.duration()) {
                        preloadedDurations[nextIndex] = this.playlist[nextIndex].howl.duration();
                    }
                },
                onload: () => {
                    console.log(`预加载下一曲 (${this.playlist[nextIndex].title}) 加载完成`);
                    if (!preloadedDurations[nextIndex] && this.playlist[nextIndex].howl.duration()) {
                        preloadedDurations[nextIndex] = this.playlist[nextIndex].howl.duration();
                    }
                },
                onloaderror: (id, err) => {
                    console.error(`预加载下一曲失败 (${this.playlist[nextIndex].title}):`, err);
                }
            });
        }

        // 预加载上一曲 (可选，优先级低于下一曲)
        if (!this.playlist[prevIndex].howl && prevIndex !== this.currentlyLoadingIndex) {
            this.playlist[prevIndex].howl = new Howl({
                src: [media + this.playlist[prevIndex].mp3],
                html5: isMobile(),
                preload: 'metadata',
                onloadeddata: () => {
                    console.log(`预加载上一曲 (${this.playlist[prevIndex].title}) 元数据完成 (HTML5模式)`);
                    if (!preloadedDurations[prevIndex] && this.playlist[prevIndex].howl.duration()) {
                        preloadedDurations[prevIndex] = this.playlist[prevIndex].howl.duration();
                    }
                },
                 onload: () => {
                    console.log(`预加载上一曲 (${this.playlist[prevIndex].title}) 加载完成`);
                    if (!preloadedDurations[prevIndex] && this.playlist[prevIndex].howl.duration()) {
                        preloadedDurations[prevIndex] = this.playlist[prevIndex].howl.duration();
                    }
                },
                onloaderror: (id, err) => {
                    console.error(`预加载上一曲失败 (${this.playlist[prevIndex].title}):`, err);
                }
            });
        }
    },

    updateDurationDisplays: function(duration) {
        if (duration && !isNaN(duration) && isFinite(duration)) {
            const formattedDuration = this.formatTime(Math.round(duration));
            if (window.duration.innerHTML !== formattedDuration) {
                window.duration.innerHTML = formattedDuration;
            }
            if (durationDisplay.innerHTML !== formattedDuration) {
                durationDisplay.innerHTML = formattedDuration;
            }
        }
    },

    setupVisualization: function(sound) {
        if (!Howler.usingWebAudio || !Howler.ctx) {
            console.warn("Web Audio API 不可用，无法进行可视化。");
            if (this.drawId) {
                cancelAnimationFrame(this.drawId);
                this.drawId = null;
            }
            return;
        }

        if (this.analyser) {
            try { this.analyser.disconnect(0); } catch (e) { /* ignore */ }
        }
        if (this.mediaSource) {
            try { this.mediaSource.disconnect(0); } catch (e) { /* ignore */ }
            this.mediaSource = null;
        }

        this.analyser = Howler.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        const howlInstance = this.playlist[this.index].howl;

        if (howlInstance && howlInstance._webAudio === false && howlInstance._sounds.length > 0) {
            const audioEl = howlInstance._sounds[0]._node;
            if (audioEl) {
                this.mediaSource = Howler.ctx.createMediaElementSource(audioEl);
                this.mediaSource.connect(this.analyser);
                this.analyser.connect(Howler.masterGain);
                console.log("可视化已连接到 HTML5 Audio 元素 (流式)。");
            } else {
                console.warn("无法获取 HTML5 Audio 元素进行可视化。");
            }
        } else {
            Howler.masterGain.connect(this.analyser);
            console.log("可视化已连接到 Web Audio API Master Gain。");
        }

        if (!this.drawId) {
            this.drawId = requestAnimationFrame(this.draw.bind(this));
        }
    },

    draw: function() {
        if (!this.analyser || waveCanvas.style.display === 'none') {
            this.drawId = null;
            return;
        }
        let W = window.innerWidth, H = window.innerHeight;
        waveCanvas.width = W; waveCanvas.height = H;

        this.analyser.getByteFrequencyData(this.dataArray);
        const canvasCtx = waveCanvas.getContext("2d");
        canvasCtx.clearRect(0, 0, W, H);

        canvasCtx.fillStyle = `rgba(255,255,255,${VISUALIZATION_OPACITY})`;

        const barWidth = (W / this.bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        for(let i = 0; i < this.bufferLength; i++) {
            barHeight = (this.dataArray[i] / 255.0) * H * VISUALIZATION_SENSITIVITY;
            canvasCtx.fillRect(x, H - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        this.drawId = requestAnimationFrame(this.draw.bind(this));
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index);
        } else {
            this.skip('next');
        }
    },

    updateMediaSession: function(data) {
        if (!('mediaSession' in navigator)) return;
        const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic;
        const metadata = { title: data.title, artist: data.artist };
        const setMetadata = (artwork = []) => {
            navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork });
        };
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev'));
        navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next'));
        if (!coverPic) {
            setMetadata();
            return;
        }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const size = 512; canvas.width = size; canvas.height = size;
            const srcSize = Math.min(img.width, img.height);
            const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2;
            ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
            setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]);
        };
        img.onerror = () => {
            console.warn("封面图片加载失败 for mediaSession: " + img.src);
            setMetadata();
        };
        img.src = media + encodeURI(coverPic);
    },

    setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        backgroundInterval = null;

        if (forceReset || !currentImageCache || currentImageCache.length === 0 || !picData || !Array.isArray(picData)) {
            currentImageCache = [];
            currentBgIndex = 0;
            const imagesToPreload = Array.isArray(picData) ? picData : [picData];
            imagesToPreload.forEach(picName => {
                const img = new Image();
                img.src = media + encodeURI(picName);
                currentImageCache.push(img);
            });
        }

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            const firstImageSrc = currentImageCache[0] ? currentImageCache[0].src : `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = `url('${firstImageSrc}')`;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;

            const currentSong = this.playlist[this.index];
            if (currentSong && currentSong.howl && currentSong.howl.playing()) {
                this.startBackgroundSlideshow(picData, false);
            }
        } else {
            this.isSlideshowRunning = false;
            const singlePicSrc = currentImageCache[0] ? currentImageCache[0].src : `url('${media}${encodeURI(Array.isArray(picData) ? picData[0] : picData)}')`;
            bgLayer1.style.backgroundImage = `url('${singlePicSrc}')`;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;
        }
    },

    startBackgroundSlideshow: function(images, resetIndex = true) {
        if (backgroundInterval) clearInterval(backgroundInterval);

        if (resetIndex) currentBgIndex = 0;

        if (currentImageCache.length === 0) {
            images.forEach(picName => {
                const img = new Image();
                img.src = media + encodeURI(picName);
                currentImageCache.push(img);
            });
        }

        const changeImage = () => {
            if (currentImageCache.length === 0) return;

            currentBgIndex = (currentBgIndex + 1) % images.length;
            const nextImage = currentImageCache[currentBgIndex];
            if(nextImage) {
                let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
                let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
        };

        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) {
            sound.pause();
            if (this.drawId) {
                cancelAnimationFrame(this.drawId);
                this.drawId = null;
            }
        }
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
        loading.style.display = 'none'; // 确保暂停时隐藏加载动画
    },

    skip: function (direction) {
        let index = this.index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * this.playlist.length);
                } while (newIndex === this.index);
                index = newIndex;
            }
        } else {
            if (direction === 'next') {
                index = (this.index + 1) % this.playlist.length;
            } else {
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            }
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) {
            sound.stop();
            if (this.drawId) {
                cancelAnimationFrame(this.drawId);
                this.drawId = null;
            }
        }
        this.resetProgressBar();
        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricIndex = -1;

        // 切换歌曲时，需要先设置新歌曲信息，再尝试播放
        const data = this.playlist[index];
        track.innerHTML = data.title;
        artist.innerHTML = data.artist;
        document.title = `${data.title} - Gmemp`;
        post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
        const initialPicForOG = Array.isArray(data.pic) ? data.pic[0] : data.pic;
        document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPicForOG));
        document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);

        this.play(index);
    },

    toggleMode: function() {
        if (this.playbackMode === 'list') this.playbackMode = 'shuffle';
        else if (this.playbackMode === 'shuffle') this.playbackMode = 'single';
        else this.playbackMode = 'list';
        this.updateModeButton();
    },

    updateModeButton: function() {
        if (modeBtn) {
            modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
            modeBtn.title = modeTitles[this.playbackMode];
        }
    },

    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        const currentIndex = this.index;
        const cachedDuration = preloadedDurations[currentIndex];

        if (sound) {
            if (sound.playing()) {
                const duration = sound.duration();
                sound.seek(duration * per);
                const seekTime = duration * per;
                this.setPositionUI(seekTime, duration);
                this.updateLyricAtTime(seekTime, currentIndex);
            } else {
                pendingSeekPercent = per;
                const duration = sound.duration() || cachedDuration;
                if (duration && !isNaN(duration) && isFinite(duration)) {
                    const seekTime = duration * per;
                    this.setPositionUI(seekTime, duration);
                    this.updateLyricAtTime(seekTime, currentIndex);
                }
            }
        } else {
            pendingSeekPercent = per;
            if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                const seekTime = cachedDuration * per;
                this.setPositionUI(seekTime, cachedDuration);
                this.updateLyricAtTime(seekTime, currentIndex);
            }
        }
    },

    updateLyricAtTime: function(time, index) {
        const lyrics = preloadedLyrics[index] || currentLyrics;
        if (lyrics && lyrics.length > 0) {
            const currentIndex = getCurrentLyricIndex(time, lyrics);
            updateLyricDisplay(lyrics, currentIndex);
            lastLyricIndex = currentIndex;
        }
    },

    setPositionUI: function(seek, duration) {
        const formattedSeek = this.formatTime(Math.floor(seek));
        const formattedDuration = duration && isFinite(duration) ? this.formatTime(Math.floor(duration)) : '0:00';

        if (timer.innerHTML !== formattedSeek) {
            timer.innerHTML = formattedSeek;
        }
        if (currentTimeDisplay.innerHTML !== formattedSeek) {
            currentTimeDisplay.innerHTML = formattedSeek;
        }

        if (duration && isFinite(duration)) {
            const formattedTotal = this.formatTime(Math.floor(duration));
            if (window.duration.innerHTML !== formattedTotal) {
                window.duration.innerHTML = formattedTotal;
            }
            if (durationDisplay.innerHTML !== formattedTotal) {
                durationDisplay.innerHTML = formattedTotal;
            }
        }

        if (duration && isFinite(duration) && duration > 0) {
            const percent = (seek / duration) * 100;
            progressFilled.style.width = percent + '%';
            progressSlider.style.left = percent + '%';
        }
    },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound || !sound.playing() || isSeeking) {
            this.drawId = null;
            return;
        }
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();

        this.setPositionUI(seek, durationVal);

        requestAnimationFrame(this.step.bind(this));
    },

    loadLyric: function (filename) {
        const currentIndex = this.index;
        if (!filename) {
            currentLyrics = [];
            preloadedLyrics[currentIndex] = [];
            updateLyricDisplay([], -1);
            return;
        }

        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
            const parsedLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
            preloadedLyrics[currentIndex] = parsedLyrics;
            currentLyrics = parsedLyrics;

            const sound = this.playlist[currentIndex].howl;
            const pos = sound ? sound.seek() : 0;
            const currentIndexInLyrics = getCurrentLyricIndex(pos, parsedLyrics);
            updateLyricDisplay(parsedLyrics, currentIndexInLyrics);
            lastLyricIndex = currentIndexInLyrics;
        }).catch(() => {
            preloadedLyrics[currentIndex] = [];
            currentLyrics = [];
            updateLyricDisplay([], -1);
        });
    },

    togglePlaylist: function () {
        let display = (playlist.style.display === 'block') ? 'none' : 'block';
        setTimeout(() => {
            playlist.style.display = display;
            if (display === 'block') {
                const currentSongElement = document.querySelector('#list-song-' + playNum);
                if (currentSongElement) {
                    list.scrollTop = currentSongElement.offsetTop - list.offsetHeight / 2;
                }
            }
        }, (display === 'block') ? 0 : 500);
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
    },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () {
        waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none";
        if (waveCanvas.style.display == "none") {
            if (player && player.drawId) {
                cancelAnimationFrame(player.drawId);
                player.drawId = null;
            }
        } else {
            if (player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
                if (!player.drawId) player.drawId = requestAnimationFrame(player.draw.bind(player));
            } else if (player && player.playlist[player.index].howl) {
                // 如果没有播放，但有howl实例，重新 setupVisualization 以便在播放时启动
                player.setupVisualization(player.playlist[player.index].howl);
            }
        }
    },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; }
};

// Event Listeners
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));

const startSeek = (e) => {
    isSeeking = true;
    progressSlider.classList.add('active');
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onSeek);
    window.addEventListener('mouseup', endSeek);
    window.addEventListener('touchmove', onSeek, { passive: false });
    window.addEventListener('touchend', endSeek);
    e.preventDefault();
    onSeek(e);
};

const onSeek = (e) => {
    if (!isSeeking) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const rect = progressBar.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    progressFilled.style.width = (percent * 100) + '%';
    progressSlider.style.left = (percent * 100) + '%';

    const currentIndex = player.index;
    const sound = player.playlist[currentIndex].howl;
    const cachedDuration = preloadedDurations[currentIndex];

    let duration = null;
    if (sound && sound.duration()) {
        duration = sound.duration();
    } else if (cachedDuration) {
        duration = cachedDuration;
    }

    if (duration && !isNaN(duration) && isFinite(duration)) {
        const seekTime = duration * percent;
        const formattedSeek = player.formatTime(Math.floor(seekTime));
        if (timer.innerHTML !== formattedSeek) {
            timer.innerHTML = formattedSeek;
        }
        if (currentTimeDisplay.innerHTML !== formattedSeek) {
            currentTimeDisplay.innerHTML = formattedSeek;
        }

        const lyrics = preloadedLyrics[currentIndex] || currentLyrics;
        if (lyrics && lyrics.length > 0) {
            const currentIndexInLyrics = getCurrentLyricIndex(seekTime, lyrics);
            updateLyricDisplay(lyrics, currentIndexInLyrics);
            lastLyricIndex = currentIndexInLyrics;
        }
    }
};

const endSeek = (event) => {
    if (!isSeeking) return;

    const clientX = event.type.includes('touch') ? event.changedTouches[0].clientX : event.clientX;
    const rect = progressBar.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    player.seek(percent);

    window.removeEventListener('mousemove', onSeek);
    window.removeEventListener('mouseup', endSeek);
    window.removeEventListener('touchmove', onSeek);
    window.removeEventListener('touchend', endSeek);

    isSeeking = false;
    progressSlider.classList.remove('active');
    document.body.style.cursor = '';

    setTimeout(() => {
        if (player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
            const sound = player.playlist[player.index].howl;
            const pos = sound.seek();
            const lyrics = preloadedLyrics[player.index] || currentLyrics;
            const currentIndex = getCurrentLyricIndex(pos, lyrics);
            updateLyricDisplay(lyrics, currentIndex);
            lastLyricIndex = currentIndex;
            requestAnimationFrame(player.step.bind(player));
        }
    }, 50);
};

progressSlider.addEventListener('mousedown', startSeek);
progressSlider.addEventListener('touchstart', startSeek, { passive: false });

progressBar.addEventListener('click', (e) => {
    if (!isSeeking) {
        const rect = progressBar.getBoundingClientRect();
        const clientX = e.clientX;
        const percent = (clientX - rect.left) / rect.width;
        player.seek(Math.max(0, Math.min(1, percent)));
    }
});

playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', (e) => {
    if (e.target === playlist) {
        player.togglePlaylist();
    }
});
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
modeBtn.addEventListener('click', () => player.toggleMode());

volumeBtn.addEventListener('mouseenter', showVolumePopup);
volumeBtn.addEventListener('mouseleave', hideVolumePopup);
volumePopup.addEventListener('mouseenter', showVolumePopup);
volumePopup.addEventListener('mouseleave', hideVolumePopup);

volumeBarTrack.addEventListener('click', (e) => {
    if (!isVolumeDragging) {
        const volume = calculateVolumeFromPosition(e.clientY);
        setVolume(volume);
    }
});

const startVolumeDrag = (e) => {
    isVolumeDragging = true;
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onVolumeDrag);
    window.addEventListener('mouseup', endVolumeDrag);
    window.addEventListener('touchmove', onVolumeDrag, { passive: false });
    window.addEventListener('touchend', endVolumeDrag);
    e.preventDefault();
    onVolumeDrag(e);
};

const onVolumeDrag = (e) => {
    if (!isVolumeDragging) return;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const volume = calculateVolumeFromPosition(clientY);
    setVolume(volume);
};

const endVolumeDrag = () => {
    if (!isVolumeDragging) return;
    isVolumeDragging = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onVolumeDrag);
    window.removeEventListener('mouseup', endVolumeDrag);
    window.removeEventListener('touchmove', onVolumeDrag);
    window.removeEventListener('touchend', endVolumeDrag);
};

volumeBarTrack.addEventListener('mousedown', startVolumeDrag);
volumeBarTrack.addEventListener('touchstart', startVolumeDrag, { passive: false });

lyricBtn.addEventListener('click', () => {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

document.addEventListener('keyup', e => {
    if (!player) return;
    if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); }
    else if (e.key === "MediaTrackNext") { player.skip('next'); }
    else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }
    else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); }
    else if (e.key === "p" || e.key === "P") { player.togglePost(); }
    else if (e.key === "w" || e.key === "W") { player.toggleWave(); }
    else if (e.key === "v" || e.key === "V") { showVolumePopup(); }
});

window.addEventListener('beforeunload', () => {
   if (player && player.drawId) {
       cancelAnimationFrame(player.drawId);
   }
   if (backgroundInterval) clearInterval(backgroundInterval);
});

window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('Unchecked runtime.lastError')) {
        return;
    }
    console.error('An error occurred:', e.error);
});

console.log("\n %c Gmemp v3.6.4 (Visualization Tuned) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
