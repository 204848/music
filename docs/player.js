// 恢复您指定的 media URL
let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 (保持不变) ==
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// 扩展 elms 列表以包含所有新旧元素
let elms = [
    'track', 'artist', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 
    'postBtn', 'waveBtn', 'volumeBtn', 'waveCanvas', 'loading', 'list', 'modeBtn', 'lyricBtn',
    // --- 新增元素 ---
    'lyric-wrapper', 'lyric-prev', 'lyric-current', 'lyric-next',
    'new-progress-bar', 'progress-played', 'progress-thumb',
    'new-timer', 'new-duration',
    'playlist-panel',
    'volume-control-wrapper', 'volume-slider-container', 'volume-percentage', 
    'volume-bar', 'volume-level', 'volume-thumb'
];
elms.forEach(function (elm) {
    // 将 a-b 形式的id转为 aB 的驼峰形式变量名
    let varName = elm.replace(/-(\w)/g, (match, p1) => p1.toUpperCase());
    window[varName] = document.getElementById(elm);
});

// 重命名一下 title 元素避免与 document.title 冲突
const trackTitle = document.getElementById('title');

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');
// 保留对旧timer/duration的引用，以更新新UI
const oldTimer = document.getElementById('timer');
const oldDuration = document.getElementById('duration');


let player;
let playNum = 0;
let requestJson = "memp.json";
let jsonData; // 声明在外面，方便访问

// --- 新的/修改过的全局变量 ---
let currentLyrics = [];
let lyricInterval = null;
let lastLyricIndex = -1; // 用于歌词更新防抖
let isSeeking = false; // 进度条拖动状态
let isAdjustingVolume = false; // 音量调节状态

let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];


const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM480 352c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H480z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 224c0-17.7 14.3-32 32-32s32 14.3 32 32V256c0 44.2 35.8 80 80 80H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H144C64.5 400 0 335.5 0 256V224zM288 96H368c44.2 0 80 35.8 80 80v32c0 17.7 14.3 32 32 32s32-14.3 32-32V176c0-79.5-64.5-144-144-144H288c-17.7 0-32 14.3-32 32s14.3 32 32 32zM208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z'/%3E%3Cpath fill='%23fff' transform='translate(120, 25) scale(0.4)' d='M432,128.2,336,32.2V96h-24A120,120,0,0,0,92.5,215.5a120,120,0,0,0,219,81l48,48A184.2,184.2,0,0,1,311.5,416C191,416,96,321,96,200.5S191,85,311.5,85H336v64Z'/%3E%3Ctext x='240' y='325' font-size='200' font-weight='bold' fill='%23fff' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
};
const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

// --- 初始化请求 (保持不变) ---
let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    jsonData = JSON.parse(request.response);
    
    // 初始化播放序号 (保持不变)
    if (window.location.hash != '') {
        try {
            playNum = parseInt(window.location.hash.slice(1));
            if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = 0;
        } catch {
            playNum = 0;
        }
    } else {
        playNum = jsonData.length > 0 ? 0 : -1; // 默认第一首
    }

    if (playNum !== -1) player = new Player(jsonData);
};

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// --- 歌词解析和显示逻辑 (全新) ---
function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    const regex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    for (const line of lines) {
        let content = line.replace(regex, '').trim();
        if (content) {
            regex.lastIndex = 0; 
            let match;
            while ((match = regex.exec(line)) !== null) {
                const min = parseInt(match[1]), sec = parseInt(match[2]), ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                result.push({ time: min * 60 + sec + ms / 1000, text: content });
            }
        }
    }
    return result.sort((a, b) => a.time - b.time);
}
function parseSRT(srtText) {
    if (!srtText) return [];
    const blocks = srtText.trim().replace(/\r\n/g, '\n').split('\n\n');
    const result = [];
    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 2) continue;
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
            const parseTime = (h,m,s,ms) => parseInt(h)*3600 + parseInt(m)*60 + parseInt(s) + parseInt(ms)/1000;
            const time = parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
            const text = lines.slice(2).join('<br>');
            result.push({ time, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

function updateLyricDisplay(time) {
    if (!currentLyrics || currentLyrics.length === 0) {
        lyricPrev.innerHTML = '';
        lyricCurrent.innerHTML = '♪';
        lyricNext.innerHTML = '';
        return;
    }

    let currentIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (time >= currentLyrics[i].time) {
            currentIndex = i;
        } else {
            break;
        }
    }

    if (currentIndex !== lastLyricIndex) {
        lyricPrev.innerHTML = (currentIndex > 0) ? currentLyrics[currentIndex - 1].text : '';
        lyricCurrent.innerHTML = (currentIndex !== -1) ? currentLyrics[currentIndex].text : '...';
        lyricNext.innerHTML = (currentIndex < currentLyrics.length - 1) ? currentLyrics[currentIndex + 1].text : '';
        lastLyricIndex = currentIndex;
    }
}

// --- 播放器主体 (基于原始结构修改) ---
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.playbackMode = 'list';

    // 初始化显示
    trackTitle.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);
    
    // (全新) 生成新格式的播放列表
    list.innerHTML = '';
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = `
            <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
            <div class="song-details">
                <span class="song-title">${song.title}</span>
                <span class="song-artist">${song.artist}</span>
            </div>
        `;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    this.updatePlaylistUI();
    this.updateModeButton();
    this.volume(1); // 默认100%音量
};

Player.prototype = {
    play: function (index) {
        const self = this;
        const isNewTrack = (typeof index === 'number' && index !== self.index);
        index = typeof index === 'number' ? index : self.index;
        let data = self.playlist[index];
        let sound;

        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricIndex = -1;

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    newDuration.innerHTML = oldDuration.innerHTML = self.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(self.step.bind(self));
                    pauseBtn.style.display = 'block';
                    playBtn.style.display = 'none';
                    loading.style.display = 'none';
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => updateLyricDisplay(sound.seek()), 150);
                },
                onload: () => { loading.style.display = 'none'; },
                onend: () => { self.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval);},
                onseek: () => { updateLyricDisplay(sound.seek()); requestAnimationFrame(self.step.bind(self)); }
            });
        }
        sound.play();

        if (isNewTrack) {
            trackTitle.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
            self.setBackground(data.pic, true);
            window.location.hash = "#" + index;
            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            self.loadLyric(data.lyric || null);
            self.updatePlaylistUI();

            if (Howler.ctx && !self.analyser) {
                self.analyser = Howler.ctx.createAnalyser();
                self.analyser.fftSize = 2048;
                self.bufferLength = self.analyser.frequencyBinCount;
                self.dataArray = new Uint8Array(self.bufferLength);
                Howler.masterGain.connect(self.analyser);
                draw();
            }
        }
        
        loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none';
        self.index = index;
    },
    
    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        if (backgroundInterval) clearInterval(backgroundInterval);
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function (direction) {
        let index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                do { index = Math.floor(Math.random() * this.playlist.length); } while (index === this.index);
            } else { index = 0; }
        } else {
            index = ( direction === 'next' ? (this.index + 1) % this.playlist.length : (this.index - 1 + this.playlist.length) % this.playlist.length );
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        progressPlayed.style.width = '0%'; // 重置进度条
        this.play(index);
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') this.skipTo(this.index);
        else this.skip('next');
    },
    
    setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        if (forceReset) currentImageCache = [];
        if (Array.isArray(picData) && picData.length > 1) {
            bgLayer1.style.backgroundImage = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1;
            if (forceReset) picData.forEach(picName => { const img = new Image(); img.src = media + encodeURI(picName); currentImageCache.push(img); });
            this.startBackgroundSlideshow(picData, forceReset);
        } else {
            const singlePic = Array.isArray(picData) ? picData[0] : picData;
            bgLayer1.style.backgroundImage = `url('${media}${encodeURI(singlePic)}')`;
            bgLayer1.style.opacity = 1; bgLayer2.style.opacity = 0; activeBgLayer = 1;
        }
    },
    
    startBackgroundSlideshow: function(images, resetIndex = true) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        if (resetIndex) currentBgIndex = 0;
        const changeImage = () => {
            currentBgIndex = (currentBgIndex + 1) % images.length;
            const nextImage = currentImageCache[currentBgIndex];
            if (nextImage) {
                let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
                let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0; nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
        };
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    volume: function (val) {
        Howler.volume(val);
        const percent = Math.round(val * 100);
        volumePercentage.textContent = `${percent}%`;
        volumeLevel.style.height = `${percent}%`;
        volumeThumb.style.bottom = `${percent}%`;
    },

    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) sound.seek(sound.duration() * per);
    },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seekVal = sound.seek() || 0;
        newTimer.innerHTML = oldTimer.innerHTML = this.formatTime(Math.round(seekVal));
        if (!isSeeking) {
            let percent = ((seekVal / sound.duration()) * 100) || 0;
            progressPlayed.style.width = `${percent}%`;
            progressThumb.style.left = `${percent}%`;
        }
        if (sound.playing()) requestAnimationFrame(this.step.bind(this));
    },

    loadLyric: function (filename) {
        if (!filename) { currentLyrics = []; updateLyricDisplay(0); return; }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
            currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
            lastLyricIndex = -1;
            updateLyricDisplay(0);
        }).catch(() => { currentLyrics = []; updateLyricDisplay(0); });
    },

    updatePlaylistUI: function() {
        const currentPlayingEl = document.querySelector('.list-song.playing');
        if (currentPlayingEl) currentPlayingEl.classList.remove('playing');
        
        const newPlayingEl = document.getElementById('list-song-' + this.index);
        if (newPlayingEl) {
            newPlayingEl.classList.add('playing');
            if (playlistPanel.classList.contains('open')) {
                newPlayingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },
    
    togglePlaylist: function() { playlistPanel.classList.toggle('open'); if (playlistPanel.classList.contains('open')) this.updatePlaylistUI(); },
    toggleMode: function() { this.playbackMode = this.playbackMode === 'list' ? 'shuffle' : this.playbackMode === 'shuffle' ? 'single' : 'list'; this.updateModeButton(); },
    updateModeButton: function() { if (modeBtn) { modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`; modeBtn.title = modeTitles[this.playbackMode]; } },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
    formatTime: function (secs) { let min = Math.floor(secs / 60) || 0; let sec = (secs - min * 60) || 0; return `${min}:${(sec < 10 ? '0' : '')}${sec}`; }
};

// --- 新的事件监听 ---
// 按钮
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
lyricBtn.addEventListener('click', () => { lyricWrapper.style.opacity = lyricWrapper.style.opacity === '0' ? '1' : '0'; });
modeBtn.addEventListener('click', () => player.toggleMode());

// 进度条拖动
function seekFromEvent(e) {
    const rect = newProgressBar.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    player.seek(Math.min(1, Math.max(0, x / rect.width)));
}
newProgressBar.addEventListener('click', seekFromEvent);
progressThumb.addEventListener('mousedown', () => isSeeking = true);
document.addEventListener('mousemove', e => {
    if(!isSeeking) return;
    const rect = newProgressBar.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * 100;
    progressPlayed.style.width = `${percent}%`;
    progressThumb.style.left = `${percent}%`;
});
document.addEventListener('mouseup', e => { if(isSeeking) { isSeeking = false; seekFromEvent(e); } });

// 音量调节
function volumeFromEvent(e) {
    const rect = volumeBar.getBoundingClientRect();
    const y = rect.bottom - (e.clientY || e.touches[0].clientY);
    player.volume(Math.min(1, Math.max(0, y / rect.height)));
}
volumeBtn.addEventListener('click', e => { e.stopPropagation(); volumeSliderContainer.style.display = volumeSliderContainer.style.display === 'flex' ? 'none' : 'flex'; });
document.addEventListener('click', e => { if (volumeSliderContainer.style.display === 'flex' && !volumeControlWrapper.contains(e.target)) volumeSliderContainer.style.display = 'none'; });
volumeBar.addEventListener('click', volumeFromEvent);
volumeThumb.addEventListener('mousedown', () => isAdjustingVolume = true);
document.addEventListener('mousemove', e => { if(isAdjustingVolume) volumeFromEvent(e); });
document.addEventListener('mouseup', () => isAdjustingVolume = false);


function draw() {
    if (!player || !player.analyser || waveCanvas.style.display === 'none') {
        requestAnimationFrame(draw);
        return;
    }
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
    let canvasCtx = waveCanvas.getContext("2d");
    canvasCtx.clearRect(0, 0, W, H);
    player.analyser.getByteFrequencyData(player.dataArray);
    canvasCtx.fillStyle = 'rgba(255,255,255,0.2)';
    const barW = (W / player.bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < player.bufferLength; i++) {
        let barH = player.dataArray[i] * 1.5;
        canvasCtx.fillRect(x, H - barH, barW, barH);
        x += barW + 1;
    }
    requestAnimationFrame(draw);
}

// 原始键盘事件 (保持不变)
document.addEventListener('keyup', e => {
    if (!player) return;
    if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); }
    else if (e.key === "MediaTrackNext") { player.skip('next'); }
    else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }
});

console.log("Gmemp Modified & Fixed. Based on original code.");
