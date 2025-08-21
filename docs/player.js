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

// Cache references to ALL DOM elements, including the new ones
let elms = [
    'track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 
    'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 
    // ***注意：移除了旧的 #progress 和 #progressBar ***
    'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 
    'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn',
    // ***新增：新进度条相关的元素 ***
    'progressContainer', 'progressBar', 'progressFilled', 'progressSlider', 
    'progressCurrentTime', 'progressDuration'
];
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

    if (window.location.hash !== '') {
        try {
            playNum = parseInt(window.location.hash.slice(1), 10);
            if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = jsonData.length - 1;
        } catch {
            playNum = jsonData.length - 1;
        }
    } else {
        playNum = jsonData.length - 1;
    }

    player = new Player(jsonData);
    
    // ***新增：在 player 初始化后，设置新进度条的事件监听器 ***
    setupNewProgressBarEvents();
};

// --- 新增：新进度条事件处理函数 ---
function setupNewProgressBarEvents() {
    if (!progressBar || !progressSlider) {
        console.error("新进度条元素未找到，无法绑定事件");
        return;
    }

    let isScrubbing = false;
    let initialX = 0;
    let initialLeft = 0;

    const startScrub = (e) => {
        isScrubbing = true;
        // 获取点击/触摸开始时的位置和滑块当前位置
        initialX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        initialLeft = parseFloat(progressSlider.style.left) || 0;
        // 防止拖动时选中文本或触发其他默认行为
        e.preventDefault();
        // 确保在拖动时也能捕获事件
        document.addEventListener('mousemove', onScrub);
        document.addEventListener('touchmove', onScrub, { passive: false });
        document.addEventListener('mouseup', stopScrub);
        document.addEventListener('touchend', stopScrub);
    };

    const onScrub = (e) => {
        if (!isScrubbing) return;
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;
        
        // 计算鼠标/触摸移动的距离
        const deltaX = clientX - initialX;
        // 计算新的滑块位置 (百分比)
        const progressBarRect = progressBar.getBoundingClientRect();
        const progressBarWidth = progressBarRect.width;
        let newLeftPercent = ((initialLeft / 100) * progressBarWidth + deltaX) / progressBarWidth * 100;
        newLeftPercent = Math.max(0, Math.min(100, newLeftPercent)); // 限制在 0-100%
        
        // 更新UI
        progressSlider.style.left = `${newLeftPercent}%`;
        progressFilled.style.width = `${newLeftPercent}%`;
        
        // 如果正在播放，则实时跳转 (可选，但用户体验更好)
        if (player && player.playlist[player.index] && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
            const sound = player.playlist[player.index].howl;
            const duration = sound.duration();
            if (duration) {
                const newTime = (newLeftPercent / 100) * duration;
                sound.seek(newTime);
                // 更新时间显示
                progressCurrentTime.textContent = player.formatTime(Math.round(newTime));
                timer.textContent = player.formatTime(Math.round(newTime)); // 也更新顶部时间
            }
        }
    };

    const stopScrub = () => {
        if (isScrubbing) {
            isScrubbing = false;
            document.removeEventListener('mousemove', onScrub);
            document.removeEventListener('touchmove', onScrub);
            document.removeEventListener('mouseup', stopScrub);
            document.removeEventListener('touchend', stopScrub);
            
            // 拖动结束后进行最终的跳转
            if (player && player.playlist[player.index] && player.playlist[player.index].howl) {
                const sound = player.playlist[player.index].howl;
                const duration = sound.duration();
                if (duration) {
                    const finalPercent = parseFloat(progressSlider.style.left) / 100;
                    const finalTime = finalPercent * duration;
                    sound.seek(finalTime);
                }
            }
        }
    };

    // 点击轨道跳转
    const jumpToPosition = (e) => {
        if (!player || !player.playlist[player.index] || !player.playlist[player.index].howl) return;
        const sound = player.playlist[player.index].howl;
        const progressBarRect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - progressBarRect.left) / progressBarRect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        if (sound.duration()) {
            sound.seek(sound.duration() * clampedPos);
        }
    };

    // 绑定事件
    progressSlider.addEventListener('mousedown', startScrub);
    progressSlider.addEventListener('touchstart', startScrub, { passive: false });
    progressBar.addEventListener('click', jumpToPosition);
}


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
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    // ***新增：更新新进度条的总时长 ***
                    if (progressDuration) {
                        progressDuration.textContent = this.formatTime(Math.round(sound.duration()));
                    }
                    requestAnimationFrame(this.step.bind(this));
                    progressBar.style.display = 'block'; // 这个可能是旧的全屏进度条，保留以防万一
                    pauseBtn.style.display = 'block';
                    playBtn.style.display = 'none';
                    loading.style.display = 'none';
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            lyricContainer.innerHTML = getCurrentLyric(pos, isSRT); lastLyricTime = pos;
                        }
                    }, 100);

                    this.setupVisualization(sound);
                },
                onload: () => { 
                    loading.style.display = 'none'; 
                    progressBar.style.display = 'block'; // 保留旧的
                    // ***新增：确保新进度条总时长也加载 ***
                    if (progressDuration && sound.duration()) {
                        progressDuration.textContent = this.formatTime(Math.round(sound.duration()));
                    }
                },
                onend: () => { this.playNextTrack(); },
                onpause: () => { 
                    if (lyricInterval) clearInterval(lyricInterval); 
                    if (backgroundInterval) clearInterval(backgroundInterval); 
                    progressBar.style.display = 'none'; // 保留旧的
                },
                onstop: () => { 
                    if (lyricInterval) clearInterval(lyricInterval); 
                    if (backgroundInterval) clearInterval(backgroundInterval); 
                    progressBar.style.display = 'none'; // 保留旧的
                },
                onseek: () => { 
                    const pos = sound.seek();
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric); 
                    lyricContainer.innerHTML = getCurrentLyric(pos, isSRT); 
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
            if(document.querySelector('#list-song-' + playNum)) { document.querySelector('#list-song-' + playNum).style.backgroundColor = ''; }
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;
            this.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) this.updateMediaSession(data);
            this.setupVisualization(sound); 
        }

        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`; // 保留旧的
        if (sound.state() === 'loaded') { 
            loading.style.display = 'none'; 
        } else { 
            loading.style.display = 'block'; 
            playBtn.style.display = 'none'; 
            pauseBtn.style.display = 'none'; 
        }
        this.index = index;
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
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            } else { 
                index = (this.index + 1) % this.playlist.length;
            }
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        // ***新增：跳转时重置新进度条 ***
        if (progressFilled) progressFilled.style.width = '0%';
        if (progressSlider) progressSlider.style.left = '0%';
        if (progressCurrentTime) progressCurrentTime.textContent = '0:00';
        progress.style.width = '0%'; // 重置旧的
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
        if (sound && sound.playing()) {
            sound.seek(sound.duration() * per);
        }
    },

    // ***修改：step 函数现在也负责更新新的进度条 ***
    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        const formattedSeek = this.formatTime(Math.round(seek));
        
        // 更新顶部时间
        timer.innerHTML = formattedSeek;
        // ***新增：更新新进度条的时间和位置 ***
        if (progressCurrentTime) {
            progressCurrentTime.textContent = formattedSeek;
        }
        if (progressBar && progressFilled && progressSlider && durationVal > 0) {
            const percent = (seek / durationVal) * 100;
            progressFilled.style.width = `${percent}%`;
            progressSlider.style.left = `${percent}%`;
        }
        // 保留旧的进度条更新（如果仍被引用）
        progress.style.width = `${((seek / durationVal) * 100) || 0}%`;
        
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

    togglePlaylist: function () { 
        let display = (playlist.style.display === 'block') ? 'none' : 'block'; 
        setTimeout(() => { 
            playlist.style.display = display; 
            if (display === 'block') { 
                list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; 
            } 
        }, (display === 'block') ? 0 : 500); 
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; 
    },
    togglePost: function () { post.style.display = (post.style.display === "none") ? "block" : "none"; },
    toggleWave: function () {
        waveCanvas.style.display = (waveCanvas.style.display === "none") ? "block" : "none";
        if (waveCanvas.style.display === "none" && player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
             cancelAnimationFrame(player.drawId); player.drawId = null;
        } else if (waveCanvas.style.display === "block" && player && player.playlist[player.index].howl && player.playlist[player.index].howl.playing()) {
            if (!player.drawId) player.drawId = requestAnimationFrame(player.draw.bind(player));
        }
    },
    toggleVolume: function () { 
        let display = (volume.style.display === 'block') ? 'none' : 'block'; 
        setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); 
        volume.className = (display === 'block') ? 'fadein' : 'fadeout'; 
    },
    formatTime: function (secs) { 
        let minutes = Math.floor(secs / 60) || 0; 
        let seconds = (secs - minutes * 60) || 0; 
        return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`; 
    }
};

// --- Event Listeners for Buttons (保持不变，确保所有按钮正常工作) ---
playBtn.addEventListener('click', function () { if(player) player.play(); });
pauseBtn.addEventListener('click', function () { if(player) player.pause(); });
prevBtn.addEventListener('click', function () { if(player) player.skip('prev'); });
nextBtn.addEventListener('click', function () { if(player) player.skip('next'); });
// ***注意：移除了旧的全屏进度条点击事件监听器 ***
// progressBar.addEventListener('click', function (event) { player.seek(event.clientX / window.innerWidth); });

playlistBtn.addEventListener('click', function () { if(player) player.togglePlaylist(); });
playlist.addEventListener('click', function () { if(player) player.togglePlaylist(); });
postBtn.addEventListener('click', function () { if(player) player.togglePost(); });
waveBtn.addEventListener('click', function () { if(player) player.toggleWave(); });
volumeBtn.addEventListener('click', function () { if(player) player.toggleVolume(); });
volume.addEventListener('click', function () { if(player) player.toggleVolume(); });

modeBtn.addEventListener('click', function () { if(player) player.toggleMode(); });

// --- 旧的音量控制逻辑 (保持不变) ---
barEmpty.addEventListener('click', function (event) { 
    if(!player) return;
    let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", "")); 
    player.volume(per); 
});
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const moveVolume = (event) => {
    if (window.sliderDown && player) {
        let x = event.clientX || event.touches[0].clientX;
        let per = Math.min(1, Math.max(0, (x - barEmpty.getBoundingClientRect().left) / barEmpty.clientWidth));
        player.volume(per);
    }
};
volume.addEventListener('mousemove', moveVolume);
volume.addEventListener('touchmove', moveVolume, { passive: true });

// --- 键盘控制 (保持不变) ---
document.addEventListener('keyup', e => {
    if (!player) return;
    if (e.key === ' ' || e.key === "MediaPlayPause") { 
        pauseBtn.style.display === 'block' ? player.pause() : player.play(); 
    }
    else if (e.key === "MediaTrackNext") { player.skip('next'); }
    else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }
    else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); }
    else if (e.key === "p" || e.key === "P") { player.togglePost(); }
    else if (e.key === "w" || e.key === "W") { player.toggleWave(); }
    else if (e.key === "v" || e.key === "V") { player.toggleVolume(); }
});

// --- 歌词开关 (保持不变) ---
lyricBtn.addEventListener('click', function () {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

// --- 页面卸载清理 (保持不变) ---
window.addEventListener('beforeunload', () => {
   if (player && player.drawId) {
       cancelAnimationFrame(player.drawId);
   }
});

console.log("\n %c Gmemp v3.7.0 (New Progress Bar) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
