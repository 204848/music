let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn', 'lyricWrapper', 'lyricPrev', 'lyricCurrent', 'lyricNext'];
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
let lastLyricIndex = -1; // 用于跟踪当前歌词行

// **已修复 & 优化 SVG 图标**
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='white' d='M40 128c-13.3 0-24-10.7-24-24s10.7-24 24-24h432c13.3 0 24 10.7 24 24s-10.7 24-24 24H40zm0 128c-13.3 0-24-10.7-24-24s10.7-24 24-24h432c13.3 0 24 10.7 24 24s-10.7 24-24 24H40zm0 128c-13.3 0-24-10.7-24-24s10.7-24 24-24h432c13.3 0 24 10.7 24 24s-10.7 24-24 24H40z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='white' d='M344.2 46.2c-12.4-7.2-27.6-7.2-40 0L192 128l-8.2 4.8-13.5-9.3-32-22.1c-12.4-8.6-28.3-9.5-41.5-2.5S78 121.2 78 136v96c0 14.8 8.8 28 21.9 33.7l32 13.9 13.5 5.9-13.5 9.3L100.1 319C87 325 78.2 338.2 78.2 353v95c0 14.8 8.8 28 21.9 33.7l112.2 48.9c13.2 5.8 28.3 4.9 40.5-2.2l111.8-66.2-11.2-19.5-128 72v-84.3l8.2-4.8 13.5 9.3 32 22.1c12.4 8.6 28.3 9.5 41.5 2.5s18.8-21.2 18.8-35.9v-96c0-14.8-8.8-28-21.9-33.7l-32-13.9-13.5-5.9 13.5-9.3 32-22.1c12.4-8.6 28.3-9.5 41.5-2.5s18.8-21.2 18.8-35.9v-95c0-14.8-8.8-28.1-21.9-33.7L344.2 46.2z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='white' d='M256 96c-13.3 0-24 10.7-24 24v42.1c0 12.3 8.9 22.7 20.9 24.5C266.3 189 272 196.3 272 205.2V224H227.3c-15.8 0-30.8 7.3-40.4 19.4L118.1 320H64c-13.3 0-24 10.7-24 24s10.7 24 24 24h64c6.2 0 12.1-2.4 16.5-6.6l76.2-70.3c3-2.8 3.5-7.2 1.3-10.7s-6.3-5.5-10-5.5H248V205.2c0-21.2-14.1-39.7-34.3-43.9-2.3-.5-4.5-1.1-6.6-2.1l-1.4-.7c-2.4-1.3-4-3.8-4-6.6V120c0-13.3 10.7-24 24-24s24 10.7 24 24v8.5c1.4.1 2.8.2 4.2.4 46.5 5.5 83.8 44.8 83.8 92.2V224h44.7c15.8 0 30.8-7.3 40.4-19.4L494.6 128H448c-13.3 0-24-10.7-24-24s10.7-24 24-24h64c-6.2 0-12.1 2.4-16.5 6.6l-76.2 70.3c-3 2.8-3.5 7.2-1.3 10.7s6.3 5.5 10 5.5H464v18.8c0 21.2 14.1 39.7 34.3 43.9 2.3.5 4.5 1.1 6.6 2.1l1.4.7c2.4 1.3 4 3.8 4 6.6V392c0 13.3-10.7 24-24 24s-24-10.7-24-24v-42.1c0-12.3-8.9-22.7-20.9-24.5-13.4-2.1-25.2-9.4-31.5-20.7L325.3 224H272v18.8c0 47.4-37.3 86.7-83.8 92.2-1.4.2-2.8.3-4.2.4v8.5c0 13.3-10.7 24-24 24z'/%3E%3C/svg%3E"
};

const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    console.log(jsonData);
    if (window.location.hash != '') {
        try { playNum = parseInt(window.location.hash.slice(1)); if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = jsonData.length - 1; } catch { playNum = jsonData.length - 1; }
    } else { playNum = jsonData.length - 1; }
    player = new Player(jsonData);
};

/* ... (isMobile, parseLRC, parseSRT 保持不变，为了篇幅省略) ... */
function isMobile() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }
function parseLRC(lrcText) { if (!lrcText) return []; const lines = lrcText.split(/\r?\n/); const result = []; for (let line of lines) { line = line.trim(); if (!line) continue; const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3})|\:(\d{2}))?\]/g; let match, lastIndex = 0, times = []; while ((match = regex.exec(line)) !== null) { let min = parseInt(match[1]), sec = parseInt(match[2]), ms = 0; if (match[3]) ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]); else if (match[4]) ms = parseInt(match[4]) * 10; times.push(min * 60 + sec + ms / 1000); lastIndex = match.index + match[0].length; } const text = line.substring(lastIndex).trim(); if (text && times.length > 0) { for (let time of times) { result.push({ time, text }); } } } result.sort((a, b) => a.time - b.time); for (let i = 0; i < result.length - 1; i++) { result[i].end = result[i+1].time; } if (result.length > 0) { result[result.length-1].end = Infinity; } return result; }
function parseSRT(srtText) { if (!srtText) return []; const lines = srtText.split(/\r?\n/); const result = []; let i = 0; while (i < lines.length) { const indexLine = lines[i].trim(); if (!/^\d+$/.test(indexLine)) { i++; continue; } i++; if (i >= lines.length) break; const timeLine = lines[i].trim(); const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/); if (!timeMatch) { i++; continue; } const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000; const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000; i++; let text = ''; while (i < lines.length && lines[i].trim() !== '') { if (text) text += '<br>'; text += lines[i].trim(); i++; } if (text) result.push({ start, end, text }); } return result; }


let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list';

    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
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
        lastLyricIndex = -1; // **重置歌词索引**

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(this.step.bind(this));
                    progressBar.style.display = 'block'; pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                    // **歌词更新逻辑修改**
                    lyricInterval = setInterval(() => this.updateLyrics(sound), 100);
                },
                onload: () => { loading.style.display = 'none'; progressBar.style.display = 'block'; },
                onend: () => { this.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); progressBar.style.display = 'none'; },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); progressBar.style.display = 'none'; },
                onseek: () => { this.updateLyrics(sound, true); requestAnimationFrame(this.step.bind(this)); } // a同步更新歌词
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
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw();
        }

        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`;
        if (sound.state() === 'loaded') { loading.style.display = 'none'; } else { loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none'; }
        this.index = index;
    },
    
    // **新增/重构：高级歌词更新函数**
    updateLyrics: function(sound, forceUpdate = false) {
        const time = sound.seek();
        
        let currentIndex = -1;
        if (currentLyrics[0]?.time !== undefined) { // LRC format
            currentIndex = currentLyrics.findIndex(l => time >= l.time && time < l.end);
        } else { // SRT format
            currentIndex = currentLyrics.findIndex(l => time >= l.start && time < l.end);
        }

        if (currentIndex === lastLyricIndex && !forceUpdate) {
            return; // 歌词行未改变，无需更新
        }
        
        lastLyricIndex = currentIndex;

        if (currentIndex === -1) {
            lyricPrev.innerHTML = '';
            lyricCurrent.innerHTML = '♪';
            lyricNext.innerHTML = '';
        } else {
            lyricPrev.innerHTML = currentLyrics[currentIndex - 1]?.text || '';
            lyricCurrent.innerHTML = currentLyrics[currentIndex]?.text || '';
            lyricNext.innerHTML = currentLyrics[currentIndex + 1]?.text || '';
        }
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index);
        } else {
            this.skip('next');
        }
    },
    
    skip: function (direction) {
        let index = this.index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                let newIndex;
                do { newIndex = Math.floor(Math.random() * this.playlist.length); } while (newIndex === this.index);
                index = newIndex;
            }
        } else {
            if (direction === 'next') { // 播放结束或点击下一首
                index = (this.index + 1) % this.playlist.length;
            } else { // 点击上一首
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            }
        }
        this.skipTo(index);
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
    
    // ... (以下所有函数都已恢复到最完整版本) ...
    updateMediaSession: function(data) {if (!('mediaSession' in navigator)) return; const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; const metadata = { title: data.title, artist: data.artist }; const setMetadata = (artwork = []) => { navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork }); }; navigator.mediaSession.setActionHandler('play', () => this.play()); navigator.mediaSession.setActionHandler('pause', () => this.pause()); navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev')); navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next')); if (!coverPic) { setMetadata(); return; } const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const size = 512; canvas.width = size; canvas.height = size; const srcSize = Math.min(img.width, img.height); const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2; ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size); setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]); }; img.onerror = () => { console.warn("封面图片加载失败 for mediaSession: " + img.src); setMetadata(); }; img.src = media + encodeURI(coverPic);},
    setBackground: function(picData, forceReset = false) { if (backgroundInterval) clearInterval(backgroundInterval); currentImageCache = []; if (Array.isArray(picData) && picData.length > 1) { this.isSlideshowRunning = true; const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`; bgLayer1.style.backgroundImage = firstImageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); }); this.startBackgroundSlideshow(picData, forceReset); } else { this.isSlideshowRunning = false; const singlePic = Array.isArray(picData) ? picData[0] : picData; const imageUrl = `url('${media}${encodeURI(singlePic)}')`; bgLayer1.style.backgroundImage = imageUrl; bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1; }},
    startBackgroundSlideshow: function(images, resetIndex = true) { if (backgroundInterval) clearInterval(backgroundInterval); if (resetIndex) currentBgIndex = 0; const initialImage = currentImageCache[currentBgIndex]; if(initialImage) { const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`; currentActiveLayer.style.opacity = 1; } const changeImage = () => { currentBgIndex = (currentBgIndex + 1) % images.length; const nextImage = currentImageCache[currentBgIndex]; if(nextImage) { let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1; let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2; nextLayer.style.backgroundImage = `url('${nextImage.src}')`; currentLayer.style.opacity = 0; nextLayer.style.opacity = 1; activeBgLayer = (activeBgLayer === 1) ? 2 : 1; } }; backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);},
    pause: function () { const sound = this.playlist[this.index].howl; if (sound) sound.pause(); if (backgroundInterval) clearInterval(backgroundInterval); playBtn.style.display = 'block'; pauseBtn.style.display = 'none'; },
    skipTo: function (index) { const sound = this.playlist[this.index].howl; if (sound) sound.stop(); progress.style.width = '0%'; this.play(index); },
    volume: function (val) { Howler.volume(val); let barWidth = (val * 90) / 100; barFull.style.width = `${barWidth * 100}%`; sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`; },
    seek: function (per) { const sound = this.playlist[this.index].howl; if (sound && sound.playing()) { sound.seek(sound.duration() * per); } },
    step: function () { const sound = this.playlist[this.index].howl; if (!sound) return; let seek = sound.seek() || 0; let durationVal = sound.duration(); timer.innerHTML = this.formatTime(Math.round(seek)); progress.style.width = `${((seek / durationVal) * 100) || 0}%`; if (sound.playing()) { requestAnimationFrame(this.step.bind(this)); } },
    loadLyric: function (filename) { if (!filename) { currentLyrics = []; lastLyricIndex = -1; this.updateLyrics({ seek:()=>0 }); return; } const ext = filename.toLowerCase().split('.').pop(); fetch(media + encodeURI(filename)).then(r => r.text()).then(text => { if (ext === 'srt') currentLyrics = parseSRT(text); else if (ext === 'lrc') currentLyrics = parseLRC(text); else currentLyrics = []; lastLyricIndex = -1; this.updateLyrics({ seek:()=>0 }, true); }).catch(() => { currentLyrics = []; lastLyricIndex = -1; this.updateLyrics({ seek:()=>0 }); }); },
    togglePlaylist: function () { let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { playlist.style.display = display; if (display === 'block') { list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
    toggleVolume: function () { let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; }
};

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

barEmpty.addEventListener('click', (event) => { let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", "")); player.volume(per); });
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const move = (event) => { if (window.sliderDown) { let x = event.clientX || event.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - barEmpty.getBoundingClientRect().left) / barEmpty.clientWidth)); player.volume(per); } };
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true });

let canvasCtx = waveCanvas.getContext("2d");
function draw() { if (!player || !player.analyser) return; let W = window.innerWidth, H = window.innerHeight; waveCanvas.width = W; waveCanvas.height = H; canvasCtx.clearRect(0, 0, W, H); player.analyser.getByteFrequencyData(player.dataArray); canvasCtx.fillStyle = 'rgba(255,255,255,0.5)'; const barW = W / player.bufferLength; let x = 0; for (let i = 0; i < player.bufferLength; i++) { let barH = player.dataArray[i] / 2; canvasCtx.fillRect(x, H - barH, barW, barH); x += barW + 1; } requestAnimationFrame(draw); }

document.addEventListener('keyup', e => { if (!player) return; if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); } else if (e.key === "MediaTrackNext") { player.skip('next'); } else if (e.key === "MediaTrackPrevious") { player.skip('prev'); } else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); } else if (e.key === "p" || e.key === "P") { player.togglePost(); } else if (e.key === "w" || e.key === "W") { player.toggleWave(); } else if (e.key === "v" || e.key === "V") { player.toggleVolume(); } });

lyricBtn.addEventListener('click', () => { lyricWrapper.style.display = (lyricWrapper.style.display === 'none' || !lyricWrapper.style.display) ? 'flex' : 'none'; });

console.log("\n %c Gmemp v3.7.0 (Advanced Lyrics & UI Fix) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
