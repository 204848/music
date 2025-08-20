let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn', 'lyricWrapper', 'prevLyric', 'currentLyric', 'nextLyric'];
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
let currentLyricIndex = -1; // **新增：跟踪当前歌词行**

// 背景轮询与缓存相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// **修复并美化 SVG 图标**
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='white' d='M16 128a16 16 0 0 1 16-16h448a16 16 0 0 1 0 32H32a16 16 0 0 1-16-16zm0 128a16 16 0 0 1 16-16h448a16 16 0 0 1 0 32H32a16 16 0 0 1-16-16zm0 128a16 16 0 0 1 16-16h448a16 16 0 0 1 0 32H32a16 16 0 0 1-16-16z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='white' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cg transform='scale(1.1) translate(-25 -25)'%3E%3Cpath fill='white' d='M320 128A128 128 0 1 0 320 384h128V320c0-17.7 14.3-32 32-32s32 14.3 32 32V384 416c0 35.3-28.7 64-64 64H320c-88.4 0-160-71.6-160-160s71.6-160 160-160zm64 32c0-8.8 7.2-16 16-16s16 7.2 16 16v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V160zM48 256a16 16 0 0 1 16-16h96a16 16 0 0 1 0 32H64a16 16 0 0 1-16-16z'/%3E%3Cpath fill='white' d='M108.8 96.2c-15.1 2.2-27 15.3-28.8 30.6-2.1 18.2 10.2 34.6 28.3 36.7 5.4 .6 96.6 .6 102 0 18.2-2.1 30.4-18.4 28.3-36.7-1.8-15.3-13.7-28.4-28.8-30.6-5.4-.6-96.6-.6-102 0z' transform='translate(-120, 100) scale(0.7)'/%3E%3Ctext x='112' y='215' font-size='150' font-weight='bold' fill='white' font-family='Arial'%3E1%3C/text%3E%3C/g%3E%3C/svg%3E"
};

const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    player = new Player(jsonData);
};


function parseLRC(lrcText) { /* ... (此函数无变化) ... */ }
function parseSRT(srtText) { /* ... (此函数无变化) ... */ }

// **重构歌词更新逻辑**
function updateLyrics(time, isSRT = false) {
    if (!currentLyrics.length) {
        // 如果没有歌词，清空所有行
        prevLyric.innerHTML = '';
        currentLyric.innerHTML = '';
        nextLyric.innerHTML = '';
        return;
    }

    let newIndex;
    if (isSRT) {
        newIndex = currentLyrics.findIndex(l => time >= l.start && time < l.end);
    } else {
        newIndex = currentLyrics.findIndex(l => time >= l.time && time < l.end);
    }

    if (newIndex === -1 && time > 0 && currentLyrics.length) {
        // 处理歌曲末尾无歌词的情况
        const lastLyric = currentLyrics[currentLyrics.length - 1];
        const lastTime = isSRT ? lastLyric.end : lastLyric.time;
        if (time > lastTime) {
            newIndex = currentLyrics.length - 1;
        }
    }
    
    // 只有在歌词行发生变化时才更新DOM
    if (newIndex !== currentLyricIndex) {
        currentLyricIndex = newIndex;
        
        let prevText = (newIndex > 0) ? currentLyrics[newIndex - 1].text : '';
        let currentText = (newIndex !== -1) ? currentLyrics[newIndex].text : (time > 0 ? '' : '...'); // 歌曲开始前显示...
        let nextText = (newIndex !== -1 && newIndex < currentLyrics.length - 1) ? currentLyrics[newIndex + 1].text : '';

        prevLyric.innerHTML = prevText;
        currentLyric.innerHTML = currentText;
        nextLyric.innerHTML = nextText;

        // 计算滚动位置
        if (currentLyric.offsetHeight > 0) {
            const scrollOffset = prevLyric.offsetHeight + prevLyric.style.paddingTop + prevLyric.style.paddingBottom;
            lyricWrapper.style.transform = `translateY(-${scrollOffset}px)`;
        }
    }
}


let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list';

    // ... (初始化UI部分)
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.title = `${playlist[this.index].title} - Gmemp`;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    this.loadLyric(playlist[this.index].lyric || null);
    
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
};

Player.prototype = {
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = typeof index === 'number' ? index : this.index;
        let data = this.playlist[index];
        let sound;

        if (!isNewTrack && this.isSlideshowRunning) {
            this.startBackgroundSlideshow(data.pic, false);
        }

        if (lyricInterval) clearInterval(lyricInterval);
        
        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(this.step.bind(this));
                    progressBar.style.display = 'block'; pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    // 立即更新一次歌词
                    updateLyrics(sound.seek(), isSRT);
                    lyricInterval = setInterval(() => {
                        updateLyrics(sound.seek(), isSRT);
                    }, 200); // 歌词更新频率200ms即可
                },
                onload: () => { loading.style.display = 'none'; progressBar.style.display = 'block'; },
                onend: () => { this.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); progressBar.style.display = 'none'; },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); progressBar.style.display = 'none'; currentLyricIndex = -1; },
                onseek: () => {
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    updateLyrics(sound.seek(), isSRT);
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
            if(document.querySelector('#list-song-' + playNum)) { document.querySelector('#list-song-' + playNum).style.backgroundColor = ''; }
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;
            this.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) this.updateMediaSession(data);
             // ... 创建分析器 (此处省略，保持不变)
        }

        if (sound.state() === 'loaded') { loading.style.display = 'none'; } else { loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none'; }
        this.index = index;
    },
    
    playNextTrack: function() { /* ... 此函数无变化 ... */ },
    
    updateMediaSession: function(data) { /* ... 此函数无变化 ... */ },
    
    setBackground: function(picData, forceReset = false) { /* ... 此函数无变化 ... */ },
    
    startBackgroundSlideshow: function(images, resetIndex = true) { /* ... 此函数无变化 ... */ },

    pause: function () { /* ... 此函数无变化 ... */ },

    skip: function (direction) { /* ... 此函数无变化 ... */ },

    skipTo: function (index) { /* ... 此函数无变化 ... */ },
    
    toggleMode: function() { /* ... 此函数无变化 ... */ },
    
    updateModeButton: function() { /* ... 此函数无变化 ... */ },

    volume: function (val) { /* ... 此函数无变化 ... */ },

    seek: function (per) { /* ... 此函数无变化 ... */ },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        timer.innerHTML = this.formatTime(Math.round(seek));
        progress.style.width = `${((seek / sound.duration()) * 100) || 0}%`;
        if (sound.playing()) {
            requestAnimationFrame(this.step.bind(this));
        }
    },

    loadLyric: function (filename) {
        currentLyricIndex = -1; // 重置歌词索引
        lyricWrapper.style.transform = `translateY(0px)`; // 重置滚动
        updateLyrics(0, false); // 清空并显示初始状态
        if (!filename) { currentLyrics = []; return; }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
            currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
        }).catch(() => {
            currentLyrics = [];
        });
    },

    // ... (所有toggle函数和formatTime函数都保持不变)
};

// --- 以下为完整函数体，保持不变但便于复制 ---
Player.prototype.playNextTrack = function () { if (this.playbackMode === 'single') { this.skipTo(this.index); } else { this.skip('next'); } };
Player.prototype.updateMediaSession = function(data) {if (!('mediaSession' in navigator)) return; const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; const metadata = { title: data.title, artist: data.artist }; const setMetadata = (artwork = []) => { navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork }); }; navigator.mediaSession.setActionHandler('play', () => this.play()); navigator.mediaSession.setActionHandler('pause', () => this.pause()); navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next')); if (!coverPic) { setMetadata(); return; } const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const size = 512; canvas.width = size; canvas.height = size; const srcSize = Math.min(img.width, img.height); const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2; ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size); setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]); }; img.onerror = () => { console.warn("封面图片加载失败 for mediaSession: " + img.src); setMetadata(); }; img.src = media + encodeURI(coverPic);};
Player.prototype.setBackground = function(picData, forceReset = false) { if (backgroundInterval) clearInterval(backgroundInterval); currentImageCache = []; if (Array.isArray(picData) && picData.length > 1) { this.isSlideshowRunning = true; const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`; bgLayer1.style.backgroundImage = firstImageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); }); this.startBackgroundSlideshow(picData, forceReset); } else { this.isSlideshowRunning = false; const singlePic = Array.isArray(picData) ? picData[0] : picData; const imageUrl = `url('${media}${encodeURI(singlePic)}')`; bgLayer1.style.backgroundImage = imageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; }};
Player.prototype.startBackgroundSlideshow = function(images, resetIndex = true) { if (backgroundInterval) clearInterval(backgroundInterval); if (resetIndex) currentBgIndex = 0; const initialImage = currentImageCache[currentBgIndex]; if(initialImage) { const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`; currentActiveLayer.style.opacity = 1; } const changeImage = () => { currentBgIndex = (currentBgIndex + 1) % images.length; const nextImage = currentImageCache[currentBgIndex]; if(nextImage) { let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1; let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; nextLayer.style.backgroundImage = `url('${nextImage.src}')`; currentLayer.style.opacity = 0; nextLayer.style.opacity = 1; activeBgLayer = (activeBgLayer === 1) ? 2 : 1; } }; backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);};
Player.prototype.pause = function () { const sound = this.playlist[this.index].howl; if (sound) sound.pause(); if (backgroundInterval) clearInterval(backgroundInterval); playBtn.style.display = 'block'; pauseBtn.style.display = 'none'; };
Player.prototype.skip = function (direction) { let index = this.index; if (this.playbackMode === 'shuffle') { if (this.playlist.length > 1) { let newIndex; do { newIndex = Math.floor(Math.random() * this.playlist.length); } while (newIndex === this.index); index = newIndex; } } else { if (direction === 'next') { index = (this.index - 1 + this.playlist.length) % this.playlist.length; } else { index = (this.index + 1) % this.playlist.length; } } this.skipTo(index); };
Player.prototype.skipTo = function (index) { const sound = this.playlist[this.index].howl; if (sound) sound.stop(); progress.style.width = '0%'; this.play(index); };
Player.prototype.toggleMode = function() { if (this.playbackMode === 'list') this.playbackMode = 'shuffle'; else if (this.playbackMode === 'shuffle') this.playbackMode = 'single'; else this.playbackMode = 'list'; this.updateModeButton(); };
Player.prototype.updateModeButton = function() { if (modeBtn) { modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`; modeBtn.title = modeTitles[this.playbackMode]; } };
Player.prototype.volume = function (val) { Howler.volume(val); let barWidth = (val * 90) / 100; barFull.style.width = `${barWidth * 100}%`; sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`; };
Player.prototype.seek = function (per) { const sound = this.playlist[this.index].howl; if (sound && sound.playing()) { sound.seek(sound.duration() * per); } };
Player.prototype.togglePlaylist = function () { let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { playlist.style.display = display; if (display === 'block') { list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; };
Player.prototype.togglePost = function () { post.style.display = (post.style.display == "none") ? "block" : "none"; };
Player.prototype.toggleWave = function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; };
Player.prototype.toggleVolume = function () { let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; };
Player.prototype.formatTime = function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; };

// Event Listeners (无变化)
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
progressBar.addEventListener('click', (event) => player.seek(event.clientX / window.innerWidth));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', () => player.toggleVolume());
modeBtn.addEventListener('click', () => player.toggleMode());
lyricBtn.addEventListener('click', () => { lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none'; });

// Volume slider logic (无变化)
barEmpty.addEventListener('click', (event) => { let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", "")); player.volume(per); });
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const move = (event) => { if (window.sliderDown) { let x = event.clientX || event.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - barEmpty.getBoundingClientRect().left) / barEmpty.clientWidth)); player.volume(per); } };
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true });

// Visualization (无变化)
let canvasCtx = waveCanvas.getContext("2d");
function draw() { if (!player || !player.analyser) return; let W = window.innerWidth, H = window.innerHeight; waveCanvas.width = W; waveCanvas.height = H; canvasCtx.clearRect(0, 0, W, H); player.analyser.getByteFrequencyData(player.dataArray); canvasCtx.fillStyle = 'rgba(255,255,255,0.5)'; const barW = W / player.bufferLength; let x = 0; for (let i = 0; i < player.bufferLength; i++) { let barH = player.dataArray[i] / 2; canvasCtx.fillRect(x, H - barH, barW, barH); x += barW + 1; } requestAnimationFrame(draw); }

// Keyboard shortcuts (无变化)
document.addEventListener('keyup', e => { if (!player) return; if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); } else if (e.key === "MediaTrackNext") { player.skip('next'); } else if (e.key === "MediaTrackPrevious") { player.skip('prev'); } else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); } else if (e.key === "p" || e.key === "P") { player.togglePost(); } else if (e.key === "w" || e.key === "W") { player.toggleWave(); } else if (e.key === "v" || e.key === "V") { player.toggleVolume(); } });

console.log("\n %c Gmemp v3.7.0 (Lyric & UI Update) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
