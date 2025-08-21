let media = "https://music.1357924680liu.dpdns.org/media/";

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
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn'];
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

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricInterval = null;
let lastLyricTime = -1;
let isSeeking = false;
let pendingSeekPercent = null; // 用于存储等待播放时的seek位置
let preloadedDurations = {}; // 缓存预加载的时长

// 背景轮询与缓存相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// SVG 图标 Data URIs
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 224c0-17.7 14.3-32 32-32s32 14.3 32 32V256c0 44.2 35.8 80 80 80H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H144C64.5 400 0 335.5 0 256V224zM288 96H368c44.2 0 80 35.8 80 80v32c0 17.7 14.3 32 32 32s32-14.3 32-32V176c0-79.5-64.5-144-144-144H288c-17.7 0-32 14.3-32 32s14.3 32 32 32zM208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z'/%3E%3Cpath fill='%23fff' transform='translate(120, 25) scale(0.4)' d='M432,128.2,336,32.2V96h-24A120,120,0,0,0,92.5,215.5a120,120,0,0,0,219,81l48,48A184.2,184.2,0,0,1,311.5,416C191,416,96,321,96,200.5S191,85,311.5,85H336v64Z'/%3E%3Ctext x='240' y='325' font-size='200' font-weight='bold' fill='%23fff' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
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
        if (text) result.push({ start, end, text });
    }
    return result;
}

function getCurrentLyric(time, isSRT = false) {
    if (isSRT) {
        const active = currentLyrics.find(l => time >= l.start && time < l.end);
        return active ? active.text : '';
    } else {
        const active = currentLyrics.find(l => time >= l.time && time < l.end);
        return active ? active.text : '';
    }
}

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

    // 预加载所有歌曲时长
    this.preloadAllDurations();

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
        lastLyricTime = -1;

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    this.updateDurationDisplays(sound.duration());
                    requestAnimationFrame(this.step.bind(this));
                    pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            lyricContainer.innerHTML = getCurrentLyric(pos, isSRT); lastLyricTime = pos;
                        }
                    }, 100);

                    this.setupVisualization(sound);
                    
                    // 处理等待的seek操作
                    if (pendingSeekPercent !== null) {
                        sound.seek(sound.duration() * pendingSeekPercent);
                        this.setPositionUI(sound.duration() * pendingSeekPercent, sound.duration());
                        pendingSeekPercent = null;
                    }
                },
                onload: () => { 
                    loading.style.display = 'none'; 
                    this.updateDurationDisplays(sound.duration());
                    // 缓存时长
                    preloadedDurations[index] = sound.duration();
                },
                onend: () => { this.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); if (backgroundInterval) clearInterval(backgroundInterval); },
                onseek: () => { const pos = sound.seek(); const isSRT = data.lyric && /\.srt$/i.test(data.lyric); lyricContainer.innerHTML = getCurrentLyric(pos, isSRT); lastLyricTime = pos; requestAnimationFrame(this.step.bind(this)); }
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
            this.setupVisualization(sound); 
        }

        if (sound.state() === 'loaded') { 
            loading.style.display = 'none'; 
            this.updateDurationDisplays(sound.duration());
            preloadedDurations[index] = sound.duration();
        } else { 
            loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none'; 
        }
        this.index = index;
    },

    preloadAllDurations: function() {
        // 预加载当前歌曲时长
        this.preloadDuration(this.playlist[this.index], this.index);
        
        // 预加载前几首歌曲时长
        for (let i = 0; i < Math.min(5, this.playlist.length); i++) {
            if (i !== this.index) {
                this.preloadDuration(this.playlist[i], i);
            }
        }
    },

    preloadDuration: function(data, index) {
        if (preloadedDurations[index]) {
            // 已经缓存了时长，直接更新显示
            this.updateDurationDisplays(preloadedDurations[index]);
            return;
        }

        if (data.howl && data.howl.state() === 'loaded') {
            // 如果已经创建过sound对象且已加载，直接使用
            setTimeout(() => {
                if (data.howl.duration()) {
                    const duration = data.howl.duration();
                    preloadedDurations[index] = duration;
                    this.updateDurationDisplays(duration);
                }
            }, 100);
        } else if (!data.howl) {
            // 创建临时sound对象来获取时长
            const tempSound = new Howl({
                src: [media + data.mp3],
                html5: isMobile(),
                onload: () => {
                    const duration = tempSound.duration();
                    preloadedDurations[index] = duration;
                    this.updateDurationDisplays(duration);
                    tempSound.unload(); // 卸载临时对象
                },
                onloaderror: () => {
                    console.log("预加载时长失败: " + data.title);
                }
            });
        } else {
            // 已有sound对象但未加载，等待加载完成
            const checkDuration = () => {
                if (data.howl.state() === 'loaded' && data.howl.duration()) {
                    const duration = data.howl.duration();
                    preloadedDurations[index] = duration;
                    this.updateDurationDisplays(duration);
                } else {
                    setTimeout(checkDuration, 100);
                }
            };
            checkDuration();
        }
    },

    updateDurationDisplays: function(duration) {
        if (duration && !isNaN(duration) && isFinite(duration)) {
            const formattedDuration = this.formatTime(Math.round(duration));
            if (duration.innerHTML !== formattedDuration) {
                duration.innerHTML = formattedDuration;
            }
            if (durationDisplay.innerHTML !== formattedDuration) {
                durationDisplay.innerHTML = formattedDuration;
            }
        }
    },

    setupVisualization: function(sound) {
        if (this.analyser) {
            try {
                this.analyser.disconnect(0);
            } catch (e) {  }
        }
        this.analyser = Howler.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        Howler.masterGain.connect(this.analyser);
        
        if (!this.drawId) {
            this.drawId = requestAnimationFrame(this.draw.bind(this));
        }
    },
    
    draw: function() {
        if (!this.analyser) {
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
        currentImageCache = [];
        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = firstImageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;
            picData.forEach(picName => {
                const img = new Image();
                img.src = media + encodeURI(picName);
                currentImageCache.push(img);
            });
            this.startBackgroundSlideshow(picData, forceReset);
        } else {
            this.isSlideshowRunning = false;
            const singlePic = Array.isArray(picData) ? picData[0] : picData;
            const imageUrl = `url('${media}${encodeURI(singlePic)}')`;
            bgLayer1.style.backgroundImage = imageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;
        }
    },
    
    startBackgroundSlideshow: function(images, resetIndex = true) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        if (resetIndex) currentBgIndex = 0;
        const initialImage = currentImageCache[currentBgIndex];
        if(initialImage) {
            const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`;
            currentActiveLayer.style.opacity = 1;
        }
        const changeImage = () => {
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
        if (sound) sound.pause();
        if (backgroundInterval) clearInterval(backgroundInterval);
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
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
        if (sound) sound.stop();
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

    volume: function (val) {
        Howler.volume(val);
        let barWidth = (val * 90) / 100;
        barFull.style.width = `${barWidth * 100}%`;
        sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`;
    },

    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        const currentIndex = this.index;
        const cachedDuration = preloadedDurations[currentIndex];
        
        if (sound) {
            if (sound.playing()) {
                const duration = sound.duration();
                sound.seek(duration * per);
                // 立即更新UI
                const seek = duration * per;
                this.setPositionUI(seek, duration);
            } else {
                // 如果没有播放，保存seek位置等待播放时使用
                pendingSeekPercent = per;
                // 立即更新UI显示
                const duration = sound.duration() || cachedDuration;
                if (duration && !isNaN(duration) && isFinite(duration)) {
                    const seek = duration * per;
                    this.setPositionUI(seek, duration);
                }
            }
        } else {
            // 如果还没有创建sound对象，保存seek位置
            pendingSeekPercent = per;
            // 更新UI显示（使用缓存的时长信息）
            if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                const seek = cachedDuration * per;
                this.setPositionUI(seek, cachedDuration);
            }
        }
    },

    setPositionUI: function(seek, duration) {
        const formattedSeek = this.formatTime(Math.floor(seek));
        const formattedDuration = duration && isFinite(duration) ? this.formatTime(Math.floor(duration)) : '0:00';
        
        // 更新左侧当前时间
        if (timer.innerHTML !== formattedSeek) {
            timer.innerHTML = formattedSeek;
        }
        if (currentTimeDisplay.innerHTML !== formattedSeek) {
            currentTimeDisplay.innerHTML = formattedSeek;
        }
        
        // 更新右侧总时间
        if (duration && isFinite(duration)) {
            const formattedTotal = this.formatTime(Math.floor(duration));
            if (duration.innerHTML !== formattedTotal) {
                duration.innerHTML = formattedTotal;
            }
            if (durationDisplay.innerHTML !== formattedTotal) {
                durationDisplay.innerHTML = formattedTotal;
            }
        }
        
        // 更新进度条
        if (duration && isFinite(duration) && duration > 0) {
            const percent = (seek / duration) * 100;
            progressFilled.style.width = percent + '%';
            progressSlider.style.left = percent + '%';
        }
    },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        // 只有在非拖动状态下才自动更新进度条
        if (!isSeeking) {
            this.setPositionUI(seek, durationVal);
        }
        if (sound.playing()) {
            requestAnimationFrame(this.step.bind(this));
        }
    },

    loadLyric: function (filename) {
        if (!filename) {
            currentLyrics = []; lyricContainer.innerHTML = ''; return;
        }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename)).then(r => r.text()).then(text => {
            currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
            const sound = this.playlist[this.index].howl;
            const pos = sound ? sound.seek() : 0;
            lyricContainer.innerHTML = getCurrentLyric(pos, ext === 'srt');
            lastLyricTime = pos;
        }).catch(() => {
            currentLyrics = []; lyricContainer.innerHTML = '';
        });
    },

    togglePlaylist: function () { let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { playlist.style.display = display; if (display === 'block') { list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () {
        waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none";
        if (waveCanvas.style.display == "none" && player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
             cancelAnimationFrame(player.drawId); player.drawId = null;
        } else if (waveCanvas.style.display == "block" && player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
            if (!player.drawId) player.drawId = requestAnimationFrame(player.draw.bind(player));
        }
    },
    toggleVolume: function () { let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; }
};

// Event Listeners
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));

// 新的进度条事件处理
const startSeek = (e) => {
    isSeeking = true;
    progressSlider.classList.add('active');
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onSeek);
    window.addEventListener('mouseup', endSeek);
    window.addEventListener('touchmove', onSeek, { passive: false });
    window.addEventListener('touchend', endSeek);
    e.preventDefault();
    onSeek(e); // 立即更新位置
};

const onSeek = (e) => {
    if (!isSeeking) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const rect = progressBar.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    
    // 实时更新UI
    progressFilled.style.width = (percent * 100) + '%';
    progressSlider.style.left = (percent * 100) + '%';
    
    // 实时更新时间显示（无论是否播放）
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
        const seek = duration * percent;
        const formattedSeek = player.formatTime(Math.floor(seek));
        if (timer.innerHTML !== formattedSeek) {
            timer.innerHTML = formattedSeek;
        }
        if (currentTimeDisplay.innerHTML !== formattedSeek) {
            currentTimeDisplay.innerHTML = formattedSeek;
        }
    }
};

const endSeek = () => {
    if (!isSeeking) return;
    isSeeking = false;
    progressSlider.classList.remove('active');
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onSeek);
    window.removeEventListener('mouseup', endSeek);
    window.removeEventListener('touchmove', onSeek);
    window.removeEventListener('touchend', endSeek);
    
    // 执行实际的seek操作
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    player.seek(Math.max(0, Math.min(1, percent)));
};

progressSlider.addEventListener('mousedown', startSeek);
progressSlider.addEventListener('touchstart', startSeek, { passive: false });

progressBar.addEventListener('click', (e) => {
    if (!isSeeking) {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.seek(Math.max(0, Math.min(1, percent)));
    }
});

playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', () => player.toggleVolume());
modeBtn.addEventListener('click', () => player.toggleMode());

barEmpty.addEventListener('click', (event) => {
    let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", ""));
    player.volume(per);
});
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const move = (event) => {
    if (window.sliderDown) {
        let x = event.clientX || event.touches[0].clientX;
        let per = Math.min(1, Math.max(0, (x - barEmpty.getBoundingClientRect().left) / barEmpty.clientWidth));
        player.volume(per);
    }
};
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true });

document.addEventListener('keyup', e => {
    if (!player) return;
    if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); }
    else if (e.key === "MediaTrackNext") { player.skip('next'); }
    else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }
    else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); }
    else if (e.key === "p" || e.key === "P") { player.togglePost(); }
    else if (e.key === "w" || e.key === "W") { player.toggleWave(); }
    else if (e.key === "v" || e.key === "V") { player.toggleVolume(); }
});

lyricBtn.addEventListener('click', () => {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

window.addEventListener('beforeunload', () => {
   if (player && player.drawId) {
       cancelAnimationFrame(player.drawId);
   }
});

// 处理控制台错误信息
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('Unchecked runtime.lastError')) {
        // 忽略Chrome扩展相关的错误
        return;
    }
    console.error('An error occurred:', e.error);
});

console.log("\n %c Gmemp v3.6.4 (Visualization Tuned) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
