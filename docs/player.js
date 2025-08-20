let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// --- Element Caching ---
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'loading', 'playlist', 'list', 'lyricBtn', 'modeBtn', 'post-overlay',
'lyric-view', 'lyric-prev', 'lyric-current', 'lyric-next',
'progress-bar-wrapper', 'progress-bar-fg', 'progress-handle',
'volume-control', 'volume-popup', 'volume-percentage', 'volume-slider-wrapper', 'volume-slider-fg', 'volume-handle'
];
elms.forEach(elm => window[elm] = document.getElementById(elm));

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');
const waveCanvas = document.getElementById('waveCanvas');

// --- State Variables ---
let player;
let playNum = 0;
let jsonData = [];
let currentLyrics = [];
let lyricInterval = null;
let lastLyricTime = -1;
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];
let isSeeking = false;
let isAdjustingVolume = false;

// --- SVG Icons ---
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M32 96l320 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 32C14.3 32 0 46.3 0 64s14.3 32 32 32zM32 192h320c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32zM448 320L448 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-32 0zM32 288h160c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23fff' d='M208 48a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM128 400a48 48 0 1 0 0 96 48 48 0 1 0 0-96zm288-16a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM352 144a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM416 32c-53 0-96 43-96 96v16c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64V288v16c0 53 43 96 96 96s96-43 96-96V288c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64V128c0-53-43-96-96-96zm48 160v32c0 8.8-7.2 16-16 16H352c-8.8 0-16-7.2-16-16V192c0-8.8 7.2-16 16-16h96c8.8 0 16 7.2 16 16zM164.3 227.6c-3-3.9-7.9-6.2-12.9-6.2H128V176c0-8.8-7.2-16-16-16s-16 7.2-16 16v48 16c0 17.7 14.3 32 32 32h28.3c14.2 0 21.3 17.3 11.3 27.3l-80 80c-9.4 9.4-24.6 9.4-33.9 0l-31.2-31.2c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L96 352.7l62.1-62.1c11.1-11.1 5-29-10.9-29H48c-17.7 0-32-14.3-32-32V176c0-17.7 14.3-32 32-32h52.4c29.2 0 55.4 12.6 74 33.9l0 0 18.2 20.9c9.3-12.4 23.3-20.9 39-20.9H320c17.7 0 32 14.3 32 32s-14.3 32-32 32h-1.7c-13.6 0-20.5 16.5-11.1 26.6l23.5 24.8c11.4 12 30.5 12.5 42.6 1.1l80-72c11.9-10.7 12.1-29.2 1-40.2s-28.9-12.1-40.2-1l-80 72c-4.1 3.7-9.4 5.4-14.7 5.4H272c-8.8 0-16-7.2-16-16s7.2-16 16-16h5.8c28.3 0 52.2-20.2 57.5-48.4c5.6-29.9-12.6-59.6-40.2-70.3z'/%3E%3Ctext x='80' y='180' font-size='150' font-weight='bold' fill='%23fff' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
};

const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

// ... (request loading logic remains the same)
let request = new XMLHttpRequest(); request.open("GET", "memp.json");
request.responseType = 'text'; request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    if (window.location.hash != '') { try { playNum = parseInt(window.location.hash.slice(1)); if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = jsonData.length - 1; } catch { playNum = jsonData.length - 1; } } else { playNum = jsonData.length - 1; }
    player = new Player(jsonData);
};

// ... (helper functions isMobile, parseLRC, etc. remain the same)
function isMobile() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }
function parseLRC(t) { if (!t) return []; const e = t.split(/\r?\n/), s = []; for (let i of e) { i = i.trim(); if (!i) continue; const r = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3})|\:(\d{2}))?\]/g; let n, l = 0, a = []; for (; (n = r.exec(i)) !== null;) { let c = parseInt(n[1]), o = parseInt(n[2]), h = 0; n[3] ? h = parseInt(n[3].length === 2 ? n[3] + "0" : n[3]) : n[4] && (h = parseInt(n[4]) * 10), a.push(c * 60 + o + h / 1e3), l = n.index + n[0].length } const d = i.substring(l).trim(); if (d && a.length > 0) for (let p of a) s.push({ time: p, text: d }) } s.sort((t, e) => t.time - e.time); for (let m = 0; m < s.length - 1; m++) s[m].end = s[m + 1].time; return s.length > 0 && (s[s.length - 1].end = 1 / 0), s }
function parseSRT(t) { if (!t) return []; const e = t.split(/\r?\n/), s = []; let i = 0; for (; i < e.length;) { if (!/^\d+$/.test(e[i].trim())) { i++; continue } i++; if (i >= e.length) break; const r = e[i].trim(), n = r.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/); if (!n) { i++; continue } const l = 3600 * parseInt(n[1]) + 60 * parseInt(n[2]) + parseInt(n[3]) + parseInt(n[4]) / 1e3, a = 3600 * parseInt(n[5]) + 60 * parseInt(n[6]) + parseInt(n[7]) + parseInt(n[8]) / 1e3; i++; let c = ""; for (; i < e.length && "" !== e[i].trim();) c && (c += "<br>"), c += e[i].trim(), i++; c && s.push({ start: l, end: a, text: c }) } return s }

// **UPDATED Lyric Logic**
function getLyricsAtTime(time) {
    if (!currentLyrics || currentLyrics.length === 0) {
        return { prev: '', current: '', next: '' };
    }
    const isSRT = currentLyrics[0].hasOwnProperty('start');
    const timeProp = isSRT ? 'start' : 'time';
    const endProp = 'end';

    let currentIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (time >= currentLyrics[i][timeProp] && time < currentLyrics[i][endProp]) {
            currentIndex = i;
            break;
        }
    }

    return {
        prev: currentIndex > 0 ? currentLyrics[currentIndex - 1].text : '',
        current: currentIndex !== -1 ? currentLyrics[currentIndex].text : '',
        next: currentIndex !== -1 && currentIndex < currentLyrics.length - 1 ? currentLyrics[currentIndex + 1].text : ''
    };
}


let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list'; // 'list', 'shuffle', 'single'

    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);
    
    // **UPDATED Playlist Generation**
    list.innerHTML = ''; // Clear previous list
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = `
            <span class="song-num">${index + 1}</span>
            <span class="song-title">${song.title}</span>
            <span class="song-artist">${song.artist}</span>
        `;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    
    this.updatePlayingClass();
    this.updateModeButton();
    this.volume(1); // Set initial volume
};

Player.prototype = {
    play: function (index) {
        // ... (The rest of the Player prototype methods will be implemented here)
        // This is a big block, I'll provide the complete, correct implementation below.
    }
};

// ... PASTE THE COMPLETE Player.prototype block and subsequent code HERE ...
// --- REPLACED Player.prototype with the full, correct version below ---
Player.prototype = {
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = typeof index === 'number' ? index : this.index;
        let data = this.playlist[index];
        let sound;

        if (!isNewTrack && this.isSlideshowRunning) this.startBackgroundSlideshow(data.pic, false);
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
                    pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            const lyrics = getLyricsAtTime(pos);
                            lyric_prev.innerHTML = lyrics.prev;
                            lyric_current.innerHTML = lyrics.current;
                            lyric_next.innerHTML = lyrics.next;
                            lastLyricTime = pos;
                        }
                    }, 100);
                },
                onload: () => { loading.style.display = 'none'; },
                onend: () => { this.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
                onseek: () => { const pos = sound.seek(); const lyrics = getLyricsAtTime(pos); lyric_prev.innerHTML = lyrics.prev; lyric_current.innerHTML = lyrics.current; lyric_next.innerHTML = lyrics.next; lastLyricTime = pos; requestAnimationFrame(this.step.bind(this)); }
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
            this.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) this.updateMediaSession(data);
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw();
        }

        this.index = index;
        this.updatePlayingClass();
        if (sound.state() === 'loaded') { loading.style.display = 'none'; } else { loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none'; }
    },

    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        if (backgroundInterval) clearInterval(backgroundInterval);
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },
    
    playNextTrack: function() {
        if (this.playbackMode === 'single') this.skipTo(this.index);
        else this.skip('next');
    },

    skip: function (direction) {
        let index = this.index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                let newIndex;
                do { newIndex = Math.floor(Math.random() * this.playlist.length); } while (newIndex === this.index);
                index = newIndex;
            }
        } else { // 'list' & 'single' use list order for prev/next buttons
            if (direction === 'next') index = (this.index + 1) % this.playlist.length;
            else index = (this.index - 1 + this.playlist.length) % this.playlist.length;
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        this.play(index);
    },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        if (!isSeeking) {
            timer.innerHTML = this.formatTime(Math.round(seek));
            const percent = ((seek / sound.duration()) * 100) || 0;
            progress_bar_fg.style.width = `${percent}%`;
            progress_handle.style.left = `${percent}%`;
        }
        if (sound.playing()) requestAnimationFrame(this.step.bind(this));
    },

    seek: function (percent) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.seek(sound.duration() * percent);
    },
    
    volume: function (percent) {
        Howler.volume(percent);
        volume_percentage.innerHTML = `${Math.round(percent * 100)}%`;
        volume_slider_fg.style.height = `${percent * 100}%`;
        volume_handle.style.bottom = `${percent * 100}%`;
    },

    toggleMode: function() {
        if (this.playbackMode === 'list') this.playbackMode = 'shuffle';
        else if (this.playbackMode === 'shuffle') this.playbackMode = 'single';
        else this.playbackMode = 'list';
        this.updateModeButton();
    },
    
    updateModeButton: function() {
        modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
        modeBtn.title = modeTitles[this.playbackMode];
    },

    updatePlayingClass: function() {
        document.querySelectorAll('.list-song.playing').forEach(el => el.classList.remove('playing'));
        const currentSongEl = document.getElementById(`list-song-${this.index}`);
        if(currentSongEl) {
            currentSongEl.classList.add('playing');
            if(playlist.classList.contains('visible')){
                currentSongEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },
    
    loadLyric: function (filename) {
        lyric_prev.innerHTML = ''; lyric_current.innerHTML = ''; lyric_next.innerHTML = '';
        if (!filename) { currentLyrics = []; return; }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
            currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
        }).catch(() => { currentLyrics = []; });
    },
    
    // UI Toggles
    togglePlaylist: () => playlist.classList.toggle('visible'),
    togglePost: () => post_overlay.style.display = (post_overlay.style.display === 'flex' ? 'none' : 'flex'),
    toggleWave: () => waveCanvas.style.display = (waveCanvas.style.display === 'none' ? 'block' : 'none'),
    toggleVolume: () => volume_popup.style.display = (volume_popup.style.display === 'flex' ? 'none' : 'flex'),
    toggleLyrics: () => lyric_view.style.display = (lyric_view.style.display === 'none' ? 'block' : 'none'),

    // --- Unchanged methods ---
    setBackground: function(picData, forceReset = false) { if (backgroundInterval) clearInterval(backgroundInterval); currentImageCache = []; if (Array.isArray(picData) && picData.length > 1) { this.isSlideshowRunning = true; const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`; bgLayer1.style.backgroundImage = firstImageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); }); this.startBackgroundSlideshow(picData, forceReset); } else { this.isSlideshowRunning = false; const singlePic = Array.isArray(picData) ? picData[0] : picData; const imageUrl = `url('${media}${encodeURI(singlePic)}')`; bgLayer1.style.backgroundImage = imageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; }},
    startBackgroundSlideshow: function(images, resetIndex = true) { if (backgroundInterval) clearInterval(backgroundInterval); if (resetIndex) currentBgIndex = 0; const initialImage = currentImageCache[currentBgIndex]; if(initialImage) { const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`; currentActiveLayer.style.opacity = 1; } const changeImage = () => { currentBgIndex = (currentBgIndex + 1) % images.length; const nextImage = currentImageCache[currentBgIndex]; if(nextImage) { let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1; let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; nextLayer.style.backgroundImage = `url('${nextImage.src}')`; currentLayer.style.opacity = 0; nextLayer.style.opacity = 1; activeBgLayer = (activeBgLayer === 1) ? 2 : 1; } }; backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);},
    updateMediaSession: function(data) {if (!('mediaSession' in navigator)) return; const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; const metadata = { title: data.title, artist: data.artist }; const setMetadata = (artwork = []) => { navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork }); }; navigator.mediaSession.setActionHandler('play', () => this.play()); navigator.mediaSession.setActionHandler('pause', () => this.pause()); navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next')); if (!coverPic) { setMetadata(); return; } const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const size = 512; canvas.width = size; canvas.height = size; const srcSize = Math.min(img.width, img.height); const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2; ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size); setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]); }; img.onerror = () => { console.warn("封面图片加载失败 for mediaSession: " + img.src); setMetadata(); }; img.src = media + encodeURI(coverPic);},
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; }
};

// --- Global Event Listeners ---
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
lyricBtn.addEventListener('click', () => player.toggleLyrics());
modeBtn.addEventListener('click', () => player.toggleMode());
volumeBtn.addEventListener('click', (e) => { e.stopPropagation(); player.toggleVolume(); });
post_overlay.addEventListener('click', () => player.togglePost());
document.addEventListener('click', (e) => { if (!volume_control.contains(e.target)) volume_popup.style.display = 'none'; });

// Progress Bar Drag Logic
const handleProgressUpdate = (e) => {
    const rect = progress_bar_wrapper.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    let percent = Math.min(1, Math.max(0, x / rect.width));
    progress_bar_fg.style.width = `${percent * 100}%`;
    progress_handle.style.left = `${percent * 100}%`;
    const sound = player.playlist[player.index].howl;
    if(sound) timer.innerHTML = player.formatTime(Math.round(sound.duration() * percent));
};
const startSeek = (e) => { isSeeking = true; handleProgressUpdate(e); };
const endSeek = (e) => { if(!isSeeking) return; isSeeking = false; const rect = progress_bar_wrapper.getBoundingClientRect(); const x = (e.clientX || e.changedTouches[0].clientX) - rect.left; let percent = Math.min(1, Math.max(0, x / rect.width)); player.seek(percent); };
progress_bar_wrapper.addEventListener('mousedown', startSeek);
document.addEventListener('mousemove', (e) => { if(isSeeking) handleProgressUpdate(e); });
document.addEventListener('mouseup', endSeek);
progress_bar_wrapper.addEventListener('touchstart', startSeek, { passive: true });
document.addEventListener('touchmove', (e) => { if (isSeeking) handleProgressUpdate(e); }, { passive: true });
document.addEventListener('touchend', endSeek);

// Volume Slider Drag Logic
const handleVolumeUpdate = (e) => {
    const rect = volume_slider_wrapper.getBoundingClientRect();
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    let percent = Math.min(1, Math.max(0, 1 - (y / rect.height)));
    player.volume(percent);
};
const startVolumeAdjust = (e) => { e.stopPropagation(); isAdjustingVolume = true; handleVolumeUpdate(e); };
const endVolumeAdjust = () => { isAdjustingVolume = false; };
volume_slider_wrapper.addEventListener('mousedown', startVolumeAdjust);
document.addEventListener('mousemove', (e) => { if (isAdjustingVolume) handleVolumeUpdate(e); });
document.addEventListener('mouseup', endVolumeAdjust);
volume_slider_wrapper.addEventListener('touchstart', startVolumeAdjust, { passive: true });
document.addEventListener('touchmove', (e) => { if (isAdjustingVolume) handleVolumeUpdate(e); }, { passive: true });
document.addEventListener('touchend', endVolumeAdjust);

// Keyboard & other listeners
document.addEventListener('keyup', e => { if (!player) return; if (e.key === ' ') { pauseBtn.style.display === 'block' ? player.play() : player.pause(); } else if (e.key === "ArrowRight") { player.skip('next'); } else if (e.key === "ArrowLeft") { player.skip('prev'); } });
let canvasCtx = waveCanvas.getContext("2d");
function draw() { if (!player || !player.analyser) return; let W = window.innerWidth, H = window.innerHeight; waveCanvas.width = W; waveCanvas.height = H; canvasCtx.clearRect(0,0,W,H); player.analyser.getByteFrequencyData(player.dataArray); canvasCtx.fillStyle='rgba(255,255,255,0.5)'; const barW = W/player.bufferLength; let x=0; for(let i=0;i<player.bufferLength;i++){let barH=player.dataArray[i]/2; canvasCtx.fillRect(x,H-barH,barW,barH); x+=barW+1;} requestAnimationFrame(draw); }

console.log("\n %c Gmemp v4.0.0 (UI Overhaul) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
