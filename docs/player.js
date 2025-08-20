let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// 缓存DOM元素
let elms = [
    'track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn',
    'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn',
    'waveCanvas', 'loading', 'playlist', 'list', 'lyricBtn', 'modeBtn',
    'lyric-container', 'lyric-prev', 'lyric-current', 'lyric-next',
    'progress-container', 'bar-bg', 'bar-progress', 'progress-thumb',
    'volume-control', 'volume-bar-container', 'volume-bar-progress', 'volume-thumb', 'volume-percent'
];
elms.forEach(elm => window[elm] = document.getElementById(elm));

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');

let player, playNum = 0, requestJson = "memp.json";
let currentLyrics = [], lyricInterval = null, lastLyricIndex = -1;

// 背景相关变量
let backgroundInterval = null, currentBgIndex = 0, activeBgLayer = 1, currentImageCache = [];

// 新版图标
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M16 128a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm32 0a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm416 0a16 16 0 1 1 0-32 16 16 0 1 1 0 32zM48 208a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm0 128a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm-32-64a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm32 0a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm416 0a16 16 0 1 1 0-32 16 16 0 1 1 0 32zM16 336a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm448-128a16 16 0 1 1 0-32 16 16 0 1 1 0 32zm-32 0a16 16 0 1 1 0-32 16 16 0 1 1 0 32zM128 96H496c17.7 0 32 14.3 32 32s-14.3 32-32 32H128c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 128H496c17.7 0 32 14.3 32 32s-14.3 32-32 32H128c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 128H496c17.7 0 32 14.3 32 32s-14.3 32-32 32H128c-17.7 0-32-14.3-32-32s14.3-32 32-32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23fff' d='M208 64c0-17.7-14.3-32-32-32s-32 14.3-32 32V80c0 4.4 3.6 8 8 8h32c4.4 0 8-3.6 8-8V64zM144 88c-4.4 0-8 3.6-8 8V112c0 17.7 14.3 32 32 32s32-14.3 32-32V96c0-4.4-3.6-8-8-8H144zM432 448c0 17.7 14.3 32 32 32s32-14.3 32-32V432c0-4.4-3.6-8-8-8H440c-4.4 0-8 3.6-8 8v16zm64-24c4.4 0 8-3.6 8-8V400c0-17.7-14.3-32-32-32s-32 14.3-32 32v16c0 4.4 3.6 8 8 8H496zM48 224C11.8 224-15.5 264.8 9.1 294.9l56.4 67.7c3.5 4.2 8.5 6.4 13.8 6.4H224V224H48zm480 0H352V368H492.7c5.3 0 10.3-2.2 13.8-6.4l56.4-67.7C591.5 264.8 564.2 224 528 224z'/%3E%3C/svg%3E"
};
const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    if (window.location.hash) {
        try {
            playNum = parseInt(window.location.hash.slice(1));
            if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = jsonData.length - 1;
        } catch { playNum = jsonData.length - 1; }
    } else {
        playNum = jsonData.length - 1;
    }
    player = new Player(jsonData);
};

// ... (isMobile, parseLRC, parseSRT, getCurrentLyric - all unchanged)
function isMobile() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }
function parseLRC(lrcText) { if (!lrcText) return []; const lines = lrcText.split(/\r?\n/); const result = []; for (let line of lines) { line = line.trim(); if (!line) continue; const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3})|\:(\d{2}))?\]/g; let match; let lastIndex = 0; let times = []; while ((match = regex.exec(line)) !== null) { let min = parseInt(match[1]); let sec = parseInt(match[2]); let ms = 0; if (match[3]) ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]); else if (match[4]) ms = parseInt(match[4]) * 10; times.push(min * 60 + sec + ms / 1000); lastIndex = match.index + match[0].length; } const text = line.substring(lastIndex).trim(); if (text && times.length > 0) { for (let time of times) { result.push({ time, text }); } } } result.sort((a, b) => a.time - b.time); for (let i = 0; i < result.length - 1; i++) { result[i].end = result[i + 1].time; } if (result.length > 0) { result[result.length - 1].end = Infinity; } return result; }
function parseSRT(srtText) { if (!srtText) return []; const lines = srtText.split(/\r?\n/); const result = []; let i = 0; while (i < lines.length) { const indexLine = lines[i].trim(); if (!/^\d+$/.test(indexLine)) { i++; continue; } i++; if (i >= lines.length) break; const timeLine = lines[i].trim(); const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/); if (!timeMatch) { i++; continue; } const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000; const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000; i++; let text = ''; while (i < lines.length && lines[i].trim() !== '') { if (text) text += '<br>'; text += lines[i].trim(); i++; } if (text) result.push({ start, end, text }); } return result; }
function getCurrentLyric(time) { let index = -1; for (let i = 0; i < currentLyrics.length; i++) { if (time >= currentLyrics[i].time && time < currentLyrics[i].end) { index = i; break; } } return index; }


let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list';
    this.isSeeking = false;
    this.isAdjustingVolume = false;
    
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);
    
    // 初始化播放列表
    list.innerHTML = '';
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = `song-${index}`;
        div.innerHTML = `<span class="song-num">${song.num}</span><span class="song-title">${song.title}</span><span class="song-artist">${song.artist}</span>`;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    
    this.updateActiveSongInList();
    this.updateModeButton();
};

Player.prototype = {
    play: function (index) { /* ... (Logic from previous stable version) ... */ },
    playNextTrack: function() { /* ... (Logic from previous stable version) ... */ },
    pause: function () { /* ... (Logic from previous stable version) ... */ },
    skip: function (direction) { /* ... (Logic from previous stable version) ... */ },
    skipTo: function (index) { /* ... (Logic from previous stable version) ... */ },
    toggleMode: function() { /* ... (Logic from previous stable version) ... */ },
    updateModeButton: function() { /* ... (Logic from previous stable version) ... */ },
    setBackground: function(picData, forceReset = false) { /* ... (Logic from previous stable version) ... */ },
    startBackgroundSlideshow: function(images, resetIndex = true) { /* ... (Logic from previous stable version) ... */ },
    updateMediaSession: function(data) { /* ... (Logic from previous stable version) ... */ },
    volume: function (val) { /* ... (Logic from previous stable version) ... */ },
    seek: function (per) { /* ... (Logic from previous stable version) ... */ }, 
    step: function () { /* ... (This is the critical part - see below) ... */ },
    loadLyric: function (filename) { /* ... (Logic from previous stable version) ... */ },
    updateLyrics: function (time) { /* ... (New dedicated function - see below) ... */ },
    togglePlaylist: function() { playlist.classList.toggle('show'); },
    togglePost: function() { post.classList.toggle('show'); },
    toggleWave: function() { waveCanvas.style.display = (waveCanvas.style.display === 'none') ? 'block' : 'none'; },
    toggleLyricDisplay: function() { lyric_container.style.opacity = (lyric_container.style.opacity == 0) ? 1 : 0; },
    formatTime: function (secs) { /* ... (Logic from previous stable version) ... */ },
    updateActiveSongInList: function() { /* ... (New dedicated function - see below) ... */ }
};

// --- Re-implementing the full prototype methods to ensure completeness ---

Player.prototype.play = function (index) {
    const isNewTrack = (typeof index === 'number' && index !== this.index);
    index = typeof index === 'number' ? index : this.index;
    let data = this.playlist[index];
    let sound;

    if (!isNewTrack && this.isSlideshowRunning) {
        this.startBackgroundSlideshow(data.pic, false);
    }

    if (lyricInterval) clearInterval(lyricInterval);
    lastLyricIndex = -1;

    if (data.howl) {
        sound = data.howl;
    } else {
        sound = data.howl = new Howl({
            src: [media + data.mp3], html5: isMobile(),
            onplay: () => {
                duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                requestAnimationFrame(this.step.bind(this));
                pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                lyricInterval = setInterval(() => { this.updateLyrics(sound.seek()); }, 150);
            },
            onload: () => { loading.style.display = 'none'; },
            onend: () => { this.playNextTrack(); },
            onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
            onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
            onseek: () => { requestAnimationFrame(this.step.bind(this)); }
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
        
        playNum = index;
        this.updateActiveSongInList();

        this.loadLyric(data.lyric || null);
        if ('mediaSession' in navigator) this.updateMediaSession(data);
        this.analyser = Howler.ctx.createAnalyser();
        this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        Howler.masterGain.connect(this.analyser);
        draw();
    }
    
    if (sound.state() !== 'loaded') { loading.style.display = 'block'; pauseBtn.style.display = 'none'; playBtn.style.display = 'none'; }
    this.index = index;
};

Player.prototype.playNextTrack = function() {
    if (this.playbackMode === 'single') {
        this.skipTo(this.index);
    } else {
        this.skip('next');
    }
};

Player.prototype.pause = function () {
    const sound = this.playlist[this.index].howl;
    if (sound) sound.pause();
    if (backgroundInterval) clearInterval(backgroundInterval);
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
};

Player.prototype.skip = function (direction) {
    let index;
    if (this.playbackMode === 'shuffle') {
        if (this.playlist.length > 1) {
            do { index = Math.floor(Math.random() * this.playlist.length); } while (index === this.index);
        } else { index = 0; }
    } else { // 'list' or 'single'
        if (direction === 'next') { index = (this.index + 1) % this.playlist.length; } 
        else { index = (this.index - 1 + this.playlist.length) % this.playlist.length; } // Corrected 'prev' logic
    }
    this.skipTo(index);
};

Player.prototype.skipTo = function (index) {
    const sound = this.playlist[this.index].howl;
    if (sound) sound.stop();
    bar_progress.style.width = '0%';
    progress_thumb.style.left = '0%';
    this.play(index);
};

Player.prototype.toggleMode = function() {
    if (this.playbackMode === 'list') this.playbackMode = 'shuffle';
    else if (this.playbackMode === 'shuffle') this.playbackMode = 'single';
    else this.playbackMode = 'list';
    this.updateModeButton();
};

Player.prototype.updateModeButton = function() {
    if (modeBtn) {
        modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
        modeBtn.title = modeTitles[this.playbackMode];
    }
};

Player.prototype.setBackground = function(picData, forceReset = false) { if (backgroundInterval) clearInterval(backgroundInterval); currentImageCache = []; if (Array.isArray(picData) && picData.length > 1) { this.isSlideshowRunning = true; const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`; bgLayer1.style.backgroundImage = firstImageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); }); this.startBackgroundSlideshow(picData, forceReset); } else { this.isSlideshowRunning = false; const singlePic = Array.isArray(picData) ? picData[0] : picData; const imageUrl = `url('${media}${encodeURI(singlePic)}')`; bgLayer1.style.backgroundImage = imageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; }};
Player.prototype.startBackgroundSlideshow = function(images, resetIndex = true) { if (backgroundInterval) clearInterval(backgroundInterval); if (resetIndex) currentBgIndex = 0; const initialImage = currentImageCache[currentBgIndex]; if (initialImage) { const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`; currentActiveLayer.style.opacity = 1; } const changeImage = () => { currentBgIndex = (currentBgIndex + 1) % images.length; const nextImage = currentImageCache[currentBgIndex]; if (nextImage) { let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1; let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; nextLayer.style.backgroundImage = `url('${nextImage.src}')`; currentLayer.style.opacity = 0; nextLayer.style.opacity = 1; activeBgLayer = (activeBgLayer === 1) ? 2 : 1; } }; backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);};
Player.prototype.updateMediaSession = function(data) {if (!('mediaSession' in navigator)) return; const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; const metadata = { title: data.title, artist: data.artist }; const setMetadata = (artwork = []) => { navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork }); }; navigator.mediaSession.setActionHandler('play', () => this.play()); navigator.mediaSession.setActionHandler('pause', () => this.pause()); navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next')); if (!coverPic) { setMetadata(); return; } const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const size = 512; canvas.width = size; canvas.height = size; const srcSize = Math.min(img.width, img.height); const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2; ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size); setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]); }; img.onerror = () => { console.warn("封面图片加载失败 for mediaSession: " + img.src); setMetadata(); }; img.src = media + encodeURI(coverPic);};
Player.prototype.volume = function(val) {
    Howler.volume(val);
    const percent = Math.round(val * 100);
    volume_percent.textContent = `${percent}%`;
    volume_bar_progress.style.height = `${percent}%`;
    volume_thumb.style.bottom = `${percent}%`;
};
Player.prototype.seek = function(per) {
    const sound = this.playlist[this.index].howl;
    if (sound) {
        sound.seek(sound.duration() * per);
    }
};
Player.prototype.step = function() {
    const sound = this.playlist[this.index].howl;
    if (!sound) return;
    const seek = sound.seek() || 0;
    const durationVal = sound.duration();
    timer.innerHTML = this.formatTime(Math.round(seek));
    
    if (!this.isSeeking) {
        const percent = ((seek / durationVal) * 100) || 0;
        bar_progress.style.width = `${percent}%`;
        progress_thumb.style.left = `${percent}%`;
    }
    
    if (sound.playing()) {
        requestAnimationFrame(this.step.bind(this));
    }
};
Player.prototype.loadLyric = function (filename) {
    if (!filename) {
        currentLyrics = []; this.updateLyrics(-1); return;
    }
    const ext = filename.toLowerCase().split('.').pop();
    fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
        currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
        this.updateLyrics(0);
    }).catch(() => {
        currentLyrics = []; this.updateLyrics(-1);
    });
};
Player.prototype.updateLyrics = function(time) {
    const currentIndex = getCurrentLyric(time);
    if (currentIndex !== lastLyricIndex) {
        const prevText = (currentIndex > 0) ? currentLyrics[currentIndex - 1].text : '';
        const currentText = (currentIndex !== -1) ? currentLyrics[currentIndex].text : '...';
        const nextText = (currentIndex !== -1 && currentIndex < currentLyrics.length - 1) ? currentLyrics[currentIndex + 1].text : '';
        
        lyric_prev.innerHTML = prevText;
        lyric_current.innerHTML = currentText;
        lyric_next.innerHTML = nextText;
        
        lastLyricIndex = currentIndex;
    }
};
Player.prototype.updateActiveSongInList = function() {
    document.querySelectorAll('.list-song').forEach(el => el.classList.remove('active'));
    const activeSongEl = document.getElementById(`song-${this.index}`);
    if (activeSongEl) {
        activeSongEl.classList.add('active');
        if (playlist.classList.contains('show')) {
            activeSongEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};
Player.prototype.formatTime = function(secs) { const minutes = Math.floor(secs / 60) || 0; const seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; };

// --- Event Listeners ---
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
lyricBtn.addEventListener('click', () => player.toggleLyricDisplay());
modeBtn.addEventListener('click', () => player.toggleMode());

// Progress bar seeking
const seekHandler = (event) => {
    const bounds = progress_container.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - bounds.left;
    const percent = Math.min(1, Math.max(0, x / bounds.width));
    bar_progress.style.width = `${percent * 100}%`;
    progress_thumb.style.left = `${percent * 100}%`;
    const sound = player.playlist[player.index].howl;
    if (sound) timer.innerHTML = player.formatTime(Math.round(sound.duration() * percent));
};
progress_container.addEventListener('mousedown', (e) => { player.isSeeking = true; seekHandler(e); });
document.addEventListener('mousemove', (e) => { if (player.isSeeking) seekHandler(e); });
document.addEventListener('mouseup', (e) => { if (player.isSeeking) { player.isSeeking = false; const bounds = progress_container.getBoundingClientRect();const x = e.clientX - bounds.left; player.seek(Math.min(1, Math.max(0, x / bounds.width))); } });

// Volume control seeking
const volumeHandler = (event) => {
    const bounds = volume_bar_container.getBoundingClientRect();
    const y = (event.clientY || event.touches[0].clientY) - bounds.top;
    const percent = Math.min(1, Math.max(0, 1 - y / bounds.height));
    player.volume(percent);
};
volume_bar_container.addEventListener('mousedown', (e) => { player.isAdjustingVolume = true; volumeHandler(e); });
document.addEventListener('mousemove', (e) => { if (player.isAdjustingVolume) volumeHandler(e); });
document.addEventListener('mouseup', () => { player.isAdjustingVolume = false; });

// Keyboard shortcuts (unchanged)
document.addEventListener('keyup', e => { if (!player) return; if (e.key === ' ') { pauseBtn.style.display === 'block' ? player.play() : player.pause(); } else if (e.key === "MediaTrackNext") { player.skip('next'); } else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }});

// Initial volume setup
player.volume(1);

// ... (draw function unchanged) ...
let canvasCtx = waveCanvas.getContext("2d"); function draw() { if (!player || !player.analyser) return; let W = window.innerWidth, H = window.innerHeight; waveCanvas.width = W; waveCanvas.height = H; canvasCtx.clearRect(0, 0, W, H); player.analyser.getByteFrequencyData(player.dataArray); canvasCtx.fillStyle = 'rgba(255,255,255,0.5)'; const barW = W / player.bufferLength; let x = 0; for (let i = 0; i < player.bufferLength; i++) { let barH = player.dataArray[i] / 2; canvasCtx.fillRect(x, H - barH, barW, barH); x += barW + 1; } requestAnimationFrame(draw); }

console.log("\n %c Gmemp v4.0.0 (UI & UX Revamp) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
