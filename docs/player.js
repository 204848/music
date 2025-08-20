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

// Cache references to DOM elements (更新了列表)
let elms = [
  'track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 
  'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 
  'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 
  'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn',
  // 新增进度条相关元素
  'progressContainer', 'progressCurrent', 'progressScrubber', 'progressTotal', 'progressBuffered'
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
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// SVG 图标和播放模式 (保持不变)
const modeIcons = { /* ... */ };
const modeTitles = { /* ... */ };

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
        } catch { playNum = jsonData.length - 1; }
    } else { playNum = jsonData.length - 1; }
    player = new Player(jsonData);
};

function isMobile() { /* ... */ }
function parseLRC(lrcText) { /* ... */ }
function parseSRT(srtText) { /* ... */ }
function getCurrentLyric(time, isSRT = false) { /* ... */ }

let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list'; 

    // UI 初始化 (保持不变，除了移除了旧进度条相关设置)
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);

    playlist.forEach((song, index) => { /* ... */ });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.updateModeButton(); 

    // 初始化新的进度条事件监听器
    this.initProgressBar();
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
                },
                onload: () => { 
                    loading.style.display = 'none'; 
                    // 可选：在这里更新缓冲进度
                    // this.updateBuffer(); 
                },
                onend: () => { this.playNextTrack(); },
                onpause: () => { 
                    if (lyricInterval) clearInterval(lyricInterval); 
                    if (backgroundInterval) clearInterval(backgroundInterval); 
                },
                onstop: () => { 
                    if (lyricInterval) clearInterval(lyricInterval); 
                    if (backgroundInterval) clearInterval(backgroundInterval); 
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
            // UI 更新 (保持不变)
            track.innerHTML = data.title; artist.innerHTML = data.artist;
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

        if (sound.state() === 'loaded') { loading.style.display = 'none'; } else { loading.style.display = 'block'; playBtn.style.display = 'none'; pauseBtn.style.display = 'none'; }
        this.index = index;
    },

    setupVisualization: function(sound) { /* ... */ },
    draw: function() { /* ... */ },
    playNextTrack: function() { /* ... */ },
    updateMediaSession: function(data) { /* ... */ },
    setBackground: function(picData, forceReset = false) { /* ... */ },
    startBackgroundSlideshow: function(images, resetIndex = true) { /* ... */ },

    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        if (backgroundInterval) clearInterval(backgroundInterval);
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function (direction) { /* ... */ },
    skipTo: function (index) { /* ... */ },
    toggleMode: function() { /* ... */ },
    updateModeButton: function() { /* ... */ },
    volume: function (val) { /* ... */ },

    // *新增/修改: seek 方法*
    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        if (sound) {
            const durationVal = sound.duration();
            if (!isNaN(durationVal) && durationVal > 0) {
                const seekTime = durationVal * per;
                sound.seek(seekTime);

                // 立即更新UI和歌词，无需等待 step 动画帧
                timer.innerHTML = this.formatTime(Math.round(seekTime));
                progressCurrent.style.width = (per * 100) + '%';
                progressScrubber.style.left = (per * 100) + '%';
                
                const isSRT = this.playlist[this.index].lyric && /\.srt$/i.test(this.playlist[this.index].lyric);
                lyricContainer.innerHTML = getCurrentLyric(seekTime, isSRT);
                lastLyricTime = seekTime;
            }
        }
    },

    // *核心修改: step 方法，更新新的进度条*
    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        
        const seek = sound.seek() || 0;
        const durationVal = sound.duration();
        const progressPercent = (durationVal > 0) ? (seek / durationVal) : 0;

        timer.innerHTML = this.formatTime(Math.round(seek));
        // 更新新的进度条
        progressCurrent.style.width = (progressPercent * 100) + '%';
        progressScrubber.style.left = (progressPercent * 100) + '%';
        
        if (sound.playing()) {
            requestAnimationFrame(this.step.bind(this));
        }
    },

    loadLyric: function (filename) { /* ... */ },

    // *新增: 初始化新的进度条事件监听器*
    initProgressBar: function() {
        if (!progressContainer) return;

        const self = this;
        let isDragging = false;

        const updateProgress = (clientX) => {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (clientX - rect.left) / rect.width;
            const clampedPos = Math.min(1, Math.max(0, pos));
            self.seek(clampedPos);
        };

        // 点击进度条跳转
        progressContainer.addEventListener('click', (e) => {
            if (!isDragging) { // 确保点击事件不与拖动结束冲突
                updateProgress(e.clientX);
            }
        });

        // 拖动 Scrubber
        const startDrag = (e) => {
            isDragging = true;
            // 立即更新一次位置
            updateProgress(e.clientX || e.touches[0].clientX);
            e.preventDefault(); // 防止默认的拖拽行为
        };

        const onDrag = (e) => {
            if (isDragging) {
                updateProgress(e.clientX || e.touches[0].clientX);
            }
        };

        const stopDrag = () => {
            isDragging = false;
        };

        progressScrubber.addEventListener('mousedown', startDrag);
        progressScrubber.addEventListener('touchstart', startDrag, { passive: false });

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });

        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        // 可选：在窗口大小改变时更新 scrubber 位置
        window.addEventListener('resize', () => {
             const sound = self.playlist[self.index].howl;
             if (sound) {
                 const seek = sound.seek() || 0;
                 const durationVal = sound.duration();
                 const progressPercent = (durationVal > 0) ? (seek / durationVal) : 0;
                 progressCurrent.style.width = (progressPercent * 100) + '%';
                 progressScrubber.style.left = (progressPercent * 100) + '%';
             }
        });
    },

    togglePlaylist: function () { /* ... */ },
    togglePost: function () { /* ... */ },
    toggleWave: function () { /* ... */ },
    toggleVolume: function () { /* ... */ },
    formatTime: function (secs) { /* ... */ }
};

// Event Listeners (保持不变，除了移除了旧的 progressBar 点击事件)
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', () => player.toggleVolume());
modeBtn.addEventListener('click', () => player.toggleMode());

barEmpty.addEventListener('click', (event) => { /* ... */ });
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const move = (event) => { /* ... */ };
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true });

document.addEventListener('keyup', e => { /* ... */ });
lyricBtn.addEventListener('click', () => { /* ... */ });

window.addEventListener('beforeunload', () => { /* ... */ });

console.log("\n %c Gmemp v3.7.0 (New Progress Bar) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
