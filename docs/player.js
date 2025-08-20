let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricInterval = null;
let lastLyricTime = -1;

// 背景轮询与缓存相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// === 播放模式图标 (已修复单曲循环图标) ===
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M393.4 86.6c-9.4-9.4-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L427.3 120.5c9.4-9.4 9.4-24.6 0-33.9zM256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z'/%3E%3C/svg%3E"
};
const modeTitles = {
    list: '顺序播放',
    shuffle: '随机播放',
    single: '单曲循环'
};

let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    console.log(jsonData);

    if (window.location.hash !== '') {
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

// 歌词解析函数...
function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    for (const line of lines) {
        let trimmedLine = line.trim();
        if (!trimmedLine) continue;
        const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3})|\:(\d{2}))?\]/g;
        let match;
        let lastIndex = 0;
        let times = [];
        while ((match = regex.exec(trimmedLine)) !== null) {
            let min = parseInt(match[1]);
            let sec = parseInt(match[2]);
            let ms = 0;
            if (match[3]) ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
            else if (match[4]) ms = parseInt(match[4]) * 10;
            times.push(min * 60 + sec + ms / 1000);
            lastIndex = match.index + match[0].length;
        }
        const text = trimmedLine.substring(lastIndex).trim();
        if (text && times.length > 0) {
            for (const time of times) {
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
        if (text) result.push({ start, end, text });
    }
    return result;
}

/**
 * Player class constructor
 * @param {Array} playlist The playlist object
 */
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list';

    // Initial setup
    track.innerHTML = this.playlist[this.index].title;
    artist.innerHTML = this.playlist[this.index].artist;
    this.setBackground(this.playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${this.playlist[this.index].date}</b></p>${this.playlist[this.index].article}`;
    
    const initialPic = Array.isArray(this.playlist[this.index].pic) ? this.playlist[this.index].pic[0] : this.playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', this.playlist[this.index].title);
    document.title = `${this.playlist[this.index].title} - Gmemp`;

    this.loadLyric(this.playlist[this.index].lyric || null);
    
    // Build playlist UI
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = `list-song-${index}`;
        div.innerHTML = `<span>${song.title}</span><small>${song.artist}</small>`;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    document.querySelector(`#list-song-${playNum}`).classList.add('playing');

    // Initialize mode button
    this.updateModeButton();
};

Player.prototype = {
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = (typeof index === 'number') ? index : this.index;

        let data = this.playlist[index];
        let sound;

        if (!isNewTrack && this.isSlideshowRunning) {
            this.startBackgroundSlideshow(data.pic, false);
        }

        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricTime = -1;

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(this.step.bind(this));
                    [progressBar, pauseBtn].forEach(el => el.style.display = 'block');
                    [playBtn, loading].forEach(el => el.style.display = 'none');

                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            this.updateLyricDisplay(pos, isSRT);
                            lastLyricTime = pos;
                        }
                    }, 100);
                },
                onload: () => { loading.style.display = 'none'; progressBar.style.display = 'block'; },
                onend: () => { this.playNextTrack(); },
                onpause: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval);
                    progressBar.style.display = 'none';
                },
                onstop: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval);
                    progressBar.style.display = 'none';
                },
                onseek: () => {
                    const pos = sound.seek();
                    this.updateLyricDisplay(pos, data.lyric && /\.srt$/i.test(data.lyric));
                    lastLyricTime = pos;
                    requestAnimationFrame(this.step.bind(this));
                }
            });
        }
        sound.play();

        if (isNewTrack) {
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
            this.setBackground(data.pic, true);
            window.location.hash = "#" + index;

            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            
            document.querySelector('.playing')?.classList.remove('playing');
            document.querySelector(`#list-song-${index}`)?.classList.add('playing');
            playNum = index;

            this.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) this.updateMediaSession(data);

            // **节奏条逻辑修复**
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw(); // 启动绘制循环
        }

        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`;
        if (sound.state() !== 'loaded') {
            loading.style.display = 'block';
            [playBtn, pauseBtn].forEach(el => el.style.display = 'none');
        }
        this.index = index;
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index);
        } else {
            this.skip('next');
        }
    },
    
    updateLyricDisplay: function(currentTime, isSRT) {
        if (!currentLyrics.length || !lyricContainer) return;

        let activeIndex = -1;
        for (let i = 0; i < currentLyrics.length; i++) {
            const lyric = currentLyrics[i];
            const startTime = isSRT ? lyric.start : lyric.time;
            const endTime = lyric.end;
            if (currentTime >= startTime && currentTime < endTime) {
                activeIndex = i;
                break;
            }
        }

        if (activeIndex === -1 && lyricContainer.querySelector('.active')) return; // 优化：如果找不到且已有高亮，则不重绘
        
        const linesToShow = 5;
        const halfLines = Math.floor(linesToShow / 2);
        
        let startIndex = Math.max(0, activeIndex - halfLines);
        let endIndex = startIndex + linesToShow -1;
        if (endIndex >= currentLyrics.length) {
            endIndex = currentLyrics.length-1;
            startIndex = Math.max(0, endIndex - linesToShow + 1);
        }

        let html = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const lyric = currentLyrics[i];
            const activeClass = (i === activeIndex) ? 'active' : '';
            html += `<div class="lyric-line ${activeClass}">${lyric.text}</div>`;
        }
        lyricContainer.innerHTML = html;
    },

    updateMediaSession: function(data) { /* ... 此函数无变化，保持完整性 ... */ },
    setBackground: function(picData, forceReset = false) { /* ... 此函数无变化，保持完整性 ... */ },
    startBackgroundSlideshow: function(images, resetIndex = true) { /* ... 此函数无变化，保持完整性 ... */ },
    
    pause: function () {
        this.playlist[this.index].howl?.pause();
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function (direction) {
        let index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                do { index = Math.floor(Math.random() * this.playlist.length); } while (index === this.index);
            } else {
                index = 0;
            }
        } else {
            if (direction === 'next') {
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            } else {
                index = (this.index + 1) % this.playlist.length;
            }
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        this.playlist[this.index].howl?.stop();
        progress.style.width = '0%';
        this.play(index);
    },
    
    toggleMode: function() {
        const modes = ['list', 'shuffle', 'single'];
        const currentModeIndex = modes.indexOf(this.playbackMode);
        this.playbackMode = modes[(currentModeIndex + 1) % modes.length];
        this.updateModeButton();
    },
    
    updateModeButton: function() {
        if (modeBtn) {
            modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
            modeBtn.title = modeTitles[this.playbackMode];
            document.body.dataset.mode = this.playbackMode;
        }
    },

    volume: function(val) { /* ... 此函数无变化，保持完整性 ... */ },
    seek: function(per) { /* ... 此函数无变化，保持完整性 ... */ },
    step: function() { /* ... 此函数无变化，保持完整性 ... */ },
    loadLyric: function(filename) { /* ... 此函数无变化，保持完整性 ... */ },
    togglePlaylist: function() { /* ... 此函数无变化，保持完整性 ... */ },
    togglePost: function() { /* ... 此函数无变化，保持完整性 ... */ },
    toggleWave: function() { /* ... 此函数无变化，保持完整性 ... */ },
    toggleVolume: function() { /* ... 此函数无变化，保持完整性 ... */ },
    formatTime: function(secs) { /* ... 此函数无变化，保持完整性 ... */ }
};
// === 以下为未修改但保持完整的函数体 ===
Player.prototype.updateMediaSession = function(data) {if (!('mediaSession' in navigator)) return; const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; const metadata = { title: data.title, artist: data.artist }; const setMetadata = (artwork = []) => { navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork }); }; navigator.mediaSession.setActionHandler('play', () => this.play()); navigator.mediaSession.setActionHandler('pause', () => this.pause()); navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next')); if (!coverPic) { setMetadata(); return; } const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const size = 512; canvas.width = size; canvas.height = size; const srcSize = Math.min(img.width, img.height); const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2; ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size); setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]); }; img.onerror = () => { console.warn("封面图片加载失败 for mediaSession: " + img.src); setMetadata(); }; img.src = media + encodeURI(coverPic);};
Player.prototype.setBackground = function(picData, forceReset = false) { if (backgroundInterval) clearInterval(backgroundInterval); currentImageCache = []; if (Array.isArray(picData) && picData.length > 1) { this.isSlideshowRunning = true; const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`; bgLayer1.style.backgroundImage = firstImageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); }); this.startBackgroundSlideshow(picData, forceReset); } else { this.isSlideshowRunning = false; const singlePic = Array.isArray(picData) ? picData[0] : picData; const imageUrl = `url('${media}${encodeURI(singlePic)}')`; bgLayer1.style.backgroundImage = imageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; }};
Player.prototype.startBackgroundSlideshow = function(images, resetIndex = true) { if (backgroundInterval) clearInterval(backgroundInterval); if (resetIndex) currentBgIndex = 0; const initialImage = currentImageCache[currentBgIndex]; if(initialImage && initialImage.complete) { const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`; currentActiveLayer.style.opacity = 1; } const changeImage = () => { currentBgIndex = (currentBgIndex + 1) % images.length; const nextImage = currentImageCache[currentBgIndex]; if(nextImage && nextImage.complete) { let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1; let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; nextLayer.style.backgroundImage = `url('${nextImage.src}')`; currentLayer.style.opacity = 0; nextLayer.style.opacity = 1; activeBgLayer = (activeBgLayer === 1) ? 2 : 1; } }; backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);};
Player.prototype.volume = function (val) { Howler.volume(val); let barWidth = (val * 90) / 100; barFull.style.width = `${barWidth * 100}%`; sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`; };
Player.prototype.seek = function (per) { const sound = this.playlist[this.index].howl; if (sound?.playing()) { const seekTime = sound.duration() * per; sound.seek(seekTime); this.updateLyricDisplay(seekTime, this.playlist[this.index].lyric && /\.srt$/i.test(this.playlist[this.index].lyric)); lastLyricTime = seekTime; } };
Player.prototype.step = function () { const sound = this.playlist[this.index].howl; if (!sound) return; let seek = sound.seek() || 0; let durationVal = sound.duration(); timer.innerHTML = this.formatTime(Math.round(seek)); progress.style.width = `${((seek / durationVal) * 100) || 0}%`; if (sound.playing()) { requestAnimationFrame(this.step.bind(this)); } };
Player.prototype.loadLyric = function (filename) { currentLyrics = []; if (lyricContainer) lyricContainer.innerHTML = ''; if (!filename) return; const ext = filename.toLowerCase().split('.').pop(); fetch(media + encodeURI(filename)).then(r => r.ok ? r.text() : Promise.reject(r.statusText)).then(text => { currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : []; if (currentLyrics.length > 0) { const sound = this.playlist[this.index].howl; const pos = sound ? sound.seek() : 0; this.updateLyricDisplay(pos, ext === 'srt'); lastLyricTime = pos; } }).catch(e => console.error('加载歌词失败:', e)); };
Player.prototype.togglePlaylist = function () { let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { playlist.style.display = display; if (display === 'block') { document.querySelector(`#list-song-${playNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; };
Player.prototype.togglePost = function () { post.style.display = (post.style.display === 'none') ? 'block' : 'none'; };
Player.prototype.toggleWave = function () { waveCanvas.style.display = (waveCanvas.style.display === 'none') ? 'block' : 'none'; };
Player.prototype.toggleVolume = function () { let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; };
Player.prototype.formatTime = function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; };

// === Event Listeners ===
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
progressBar.addEventListener('click', (event) => player.seek(event.clientX / window.innerWidth));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', (e) => { if(e.target.id === 'playlist') player.togglePlaylist(); });
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', (e) => { if(e.target.id === 'volume') player.toggleVolume(); });
modeBtn.addEventListener('click', () => player.toggleMode());
lyricBtn.addEventListener('click', () => lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none');

const handleVolumeDrag = (event) => { if (window.sliderDown) { event.preventDefault(); let clientX = event.clientX ?? event.touches?.[0].clientX; if (clientX !== undefined) { let barRect = barEmpty.getBoundingClientRect(); let per = (clientX - barRect.left) / barRect.width; player.volume(Math.min(1, Math.max(0, per))); } } };
barEmpty.addEventListener('click', (event) => { let per = event.layerX / barEmpty.offsetWidth; player.volume(per); });
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
document.addEventListener('mouseup', () => window.sliderDown = false);
document.addEventListener('touchend', () => window.sliderDown = false);
document.addEventListener('mousemove', handleVolumeDrag);
document.addEventListener('touchmove', handleVolumeDrag, { passive: false });

// **节奏条绘制逻辑**
let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    if (!player || !player.analyser) return requestAnimationFrame(draw);
    player.analyser.getByteFrequencyData(player.dataArray);
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
    canvasCtx.clearRect(0, 0, W, H);
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
    const barW = W / player.bufferLength;
    let x = 0;
    for (let i = 0; i < player.bufferLength; i++) {
        let barH = player.dataArray[i] / 2;
        canvasCtx.fillRect(x, H - barH, barW, barH);
        x += barW + 1;
    }
    requestAnimationFrame(draw);
}

// Keyboard shortcuts
document.addEventListener('keyup', e => { if (!player) return; const keyMap = { ' ': () => pauseBtn.style.display === 'block' ? player.pause() : player.play(), 'MediaPlayPause': () => pauseBtn.style.display === 'block' ? player.pause() : player.play(), 'MediaTrackNext': () => player.skip('next'), 'MediaTrackPrevious': () => player.skip('prev'), 'l': () => player.togglePlaylist(), 'p': () => player.togglePost(), 'w': () => player.toggleWave(), 'v': () => player.toggleVolume() }; (keyMap[e.key] || keyMap[e.key.toLowerCase()])?.(); });

console.log("\n %c Gmemp v3.8.0 (UI & Core Fixed) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
