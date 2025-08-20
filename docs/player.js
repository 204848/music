let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements.
// 注意：这里添加了 'modeBtn' 和背景层
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn', 'bg-layer1', 'bg-layer2'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

// 获取背景层元素
const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricInterval = null;
let lastLyricTime = -1; // 用于优化歌词更新频率

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

// 解析 LRC 格式 [mm:ss.xx]或[mm:ss.xxx]
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
    // 排序并补充结束时间
    result.sort((a, b) => a.time - b.time);
    for (let i = 0; i < result.length - 1; i++) {
        result[i].end = result[i + 1].time;
    }
    if (result.length > 0) {
        result[result.length - 1].end = Infinity;
    }
    return result;
}

// 解析 SRT 格式
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

// 获取当前时间对应的歌词
function getCurrentLyric(time, isSRT = false) {
    if (isSRT) {
        const active = currentLyrics.find(l => time >= l.start && time < l.end);
        return active ? active.text : '';
    } else {
        const active = currentLyrics.find(l => time >= l.time && time < l.end);
        return active ? active.text : '';
    }
}

/**
 * Player class
 * @param {Array} playlist
 */
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.playbackMode = 'list'; // 添加播放模式属性

    // Initial display
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true); // 使用新方法设置背景
    post.innerHTML = '<p><b>' + playlist[this.index].date + '</b></p>' + playlist[this.index].article;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = playlist[this.index].title + " - Gmemp";

    this.loadLyric(playlist[this.index].lyric || null);
    this.updateModeButton(); // 初始化按钮

    // Setup playlist
    playlist.forEach((song, index) => { // 使用 index 作为参数
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index; // 使用正确的 index 设置 ID
        div.innerHTML = song.title + ' - ' + song.artist;
        div.onclick = () => { // 使用箭头函数，this 指向 Player 实例
            player.skipTo(index);
        };
        list.appendChild(div);
    });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
};

Player.prototype = {
    play: function (index) {
        let self = this;
        let sound;

        const isNewTrack = (typeof index === 'number' && index !== self.index);
        index = typeof index === 'number' ? index : self.index;
        let data = self.playlist[index];

        // 清除旧的歌词定时器
        if (lyricInterval) {
            clearInterval(lyricInterval);
            lyricInterval = null;
        }
        lastLyricTime = -1; // 重置歌词时间标记

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3],
                html5: isMobile(),
                onplay: function () {
                    duration.innerHTML = self.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(self.step.bind(self));
                    progressBar.style.display = 'block';
                    pauseBtn.style.display = 'block';
                    playBtn.style.display = 'none';
                    loading.style.display = 'none';

                    // 启动歌词定时更新
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(function () {
                        const pos = sound.seek();
                        // 优化：只有时间变化超过0.1秒才更新歌词
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                            lastLyricTime = pos;
                        }
                    }, 100); // 降低更新频率到100ms
                },
                onload: function () {
                    loading.style.display = 'none';
                    progressBar.style.display = 'block';
                },
                onend: function () {
                    self.playNextTrack(); // 修改为调用 playNextTrack
                },
                onpause: function () {
                    if (lyricInterval) {
                        clearInterval(lyricInterval);
                        lyricInterval = null;
                    }
                    progressBar.style.display = 'none';
                },
                onstop: function () {
                    if (lyricInterval) {
                        clearInterval(lyricInterval);
                        lyricInterval = null;
                    }
                    progressBar.style.display = 'none';
                },
                onseek: function () {
                    // 跳转时立即更新歌词
                    const pos = sound.seek();
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                    lastLyricTime = pos; // 更新时间标记
                    requestAnimationFrame(self.step.bind(self));
                }
            });
        }

        sound.play();

        // 手机系统控制...
        if ('mediaSession' in navigator) {
            const applyMediaSession = (artwork) => {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: data.title, artist: data.artist, artwork: artwork ? [artwork] : []
                });
                navigator.mediaSession.setActionHandler('play', () => { const s = self.playlist[self.index].howl; s.play(); });
                navigator.mediaSession.setActionHandler('pause', () => { const s = self.playlist[self.index].howl; s.pause(); });
                navigator.mediaSession.setActionHandler('previoustrack', () => self.skip('prev'));
                navigator.mediaSession.setActionHandler('nexttrack', () => self.skip('next'));
            };
            applyMediaSession(null);
            const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic; // 修复 mediaSession 图片问题
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 512;
                canvas.width = size; canvas.height = size;
                const srcSize = Math.min(img.width, img.height);
                const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2;
                ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
                const cropped = canvas.toDataURL('image/jpeg', 0.9);
                applyMediaSession({ src: cropped, sizes: '512x512', type: 'image/jpeg' });
            };
            img.onerror = () => { console.warn("图片加载失败"); };
            img.crossOrigin = 'Anonymous';
            img.src = media + encodeURI(coverPic); // 修复 mediaSession 图片问题
        }

        // 更新 UI
        if (isNewTrack) {
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = data.title + " - Gmemp";
            post.innerHTML = '<p><b>' + data.date + '</b></p>' + data.article;
            this.setBackground(data.pic, true); // 使用新方法设置背景
            window.location.hash = "#" + (index);
            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            progressBar.style.margin = -(window.innerHeight * 0.3 / 2) + 'px auto';
            document.querySelector('#list-song-' + playNum).style.backgroundColor = '';
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;

            // Web Audio
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw();

            // 加载新歌词文件
            self.loadLyric(data.lyric || null);
        }

        if (sound.state() === 'loaded') {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            loading.style.display = 'none';
        } else {
            loading.style.display = 'block';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
        }

        self.index = index;
    },

    // 新增：处理播放结束或用户点击下一首
    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index); // 单曲循环，重新播放当前歌曲
        } else {
            this.skip('next'); // 否则按模式跳转下一首
        }
    },

    pause: function () {
        let self = this;
        if (self.playlist[self.index].howl) {
            self.playlist[self.index].howl.pause();
        }
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function (direction) {
        let self = this;
        let index = 0;
        if (self.playbackMode === 'shuffle') {
            // 随机播放逻辑
            if (self.playlist.length > 1) {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * self.playlist.length);
                } while (newIndex === self.index && self.playlist.length > 1); // 确保不重复播放同一首（如果列表大于1）
                index = newIndex;
            } else {
                index = self.index; // 如果只有一首歌，就保持当前索引
            }
        } else {
            // 顺序或单曲模式（但 'next' 按钮被点击时）
            if (direction === 'next') {
                index = self.index - 1;
                if (index < 0) index = self.playlist.length - 1;
            } else {
                index = self.index + 1;
                if (index >= self.playlist.length) index = 0;
            }
        }
        self.skipTo(index);
    },

    skipTo: function (index) {
        let self = this;
        if (self.playlist[self.index].howl) {
            self.playlist[self.index].howl.stop();
        }
        progress.style.width = '0%';
        self.play(index);
    },

    volume: function (val) {
        let self = this;
        Howler.volume(val);
        let barWidth = (val * 90) / 100;
        barFull.style.width = (barWidth * 100) + '%';
        sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
    },

    seek: function (per) {
        let self = this;
        let sound = self.playlist[self.index].howl;
        if (sound.playing()) {
            const pos = sound.duration() * per;
            sound.seek(pos);
            // 手动跳转时立即更新歌词
            const isSRT = self.playlist[self.index].lyric && /\.srt$/i.test(self.playlist[self.index].lyric);
            lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
            lastLyricTime = pos; // 更新时间标记
        }
    },

    step: function () {
        let self = this;
        let sound = self.playlist[self.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        timer.innerHTML = self.formatTime(Math.round(seek));
        progress.style.width = (((seek / durationVal) * 100) || 0) + '%';
        if (sound.playing()) {
            requestAnimationFrame(self.step.bind(self));
        }
    },

    loadLyric: function (filename) {
        if (!filename) {
            currentLyrics = [];
            lyricContainer.innerHTML = '';
            return;
        }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename))
            .then(r => r.text())
            .then(text => {
                if (ext === 'srt') {
                    currentLyrics = parseSRT(text);
                } else if (ext === 'lrc') {
                    currentLyrics = parseLRC(text);
                } else {
                    currentLyrics = [];
                }
                // 初始显示
                if (currentLyrics.length > 0) {
                    const sound = this.playlist[this.index].howl;
                    const pos = sound ? sound.seek() : 0;
                    const isSRT = ext === 'srt';
                    lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                    lastLyricTime = pos; // 初始化时间标记
                } else {
                    lyricContainer.innerHTML = '';
                }
            })
            .catch(() => {
                currentLyrics = [];
                lyricContainer.innerHTML = '';
            });
    },

    togglePlaylist: function () { let self = this; let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(function () { playlist.style.display = display; if (playlist.style.display == 'block') { list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
    toggleVolume: function () { let self = this; let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(function () { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; },
    
    // --- 新增：播放模式相关方法 ---
    toggleMode: function() {
        if (this.playbackMode === 'list') {
            this.playbackMode = 'shuffle';
        } else if (this.playbackMode === 'shuffle') {
            this.playbackMode = 'single';
        } else {
            this.playbackMode = 'list';
        }
        this.updateModeButton();
    },
    
    updateModeButton: function() {
        if (modeBtn) {
            modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
            modeBtn.title = modeTitles[this.playbackMode];
        }
    },
    
    // --- 新增：背景设置与轮播方法 ---
    setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        currentImageCache = []; // 清空旧缓存

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            // 立即显示第一张图
            const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = firstImageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;

            // 后台预加载所有图片
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
            // 对于单张图片，我们只设置一个层并确保它可见
            if (activeBgLayer === 1) {
                bgLayer1.style.backgroundImage = imageUrl;
                bgLayer1.style.opacity = 1;
                bgLayer2.style.opacity = 0;
            } else {
                bgLayer2.style.backgroundImage = imageUrl;
                bgLayer2.style.opacity = 1;
                bgLayer1.style.opacity = 0;
            }
        }
    },

    startBackgroundSlideshow: function(images, resetIndex = true) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        
        if (resetIndex) currentBgIndex = 0;
        
        // 设置初始图片 (其实已经在 setBackground 中设置了，这里为了安全可以再设置一次)
        const initialImage = currentImageCache[currentBgIndex];
        if(initialImage) {
            const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`;
            currentActiveLayer.style.opacity = 1;
        }

        const changeImage = () => {
            currentBgIndex = (currentBgIndex + 1) % images.length;
            
            let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
            let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;

            const nextImage = currentImageCache[currentBgIndex];
            if (nextImage) {
                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
        };

        // 每5秒切换一次图片
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    }
    // --- 新增结束 ---
};

// Controls
playBtn.addEventListener('click', function () { player.play(); });
pauseBtn.addEventListener('click', function () { player.pause(); });
prevBtn.addEventListener('click', function () { player.skip('prev'); }); // 修复 prevBtn 的方向
nextBtn.addEventListener('click', function () { player.skip('next'); });
progressBar.addEventListener('click', function (event) { player.seek(event.clientX / window.innerWidth); });
playlistBtn.addEventListener('click', function () { player.togglePlaylist(); });
playlist.addEventListener('click', function () { player.togglePlaylist(); });
postBtn.addEventListener('click', function () { player.togglePost(); });
waveBtn.addEventListener('click', function () { player.toggleWave(); });
volumeBtn.addEventListener('click', function () { player.toggleVolume(); });
volume.addEventListener('click', function () { player.toggleVolume(); });
// 新增：模式切换按钮事件
modeBtn.addEventListener('click', function () { player.toggleMode(); });

// Volume
barEmpty.addEventListener('click', function (event) { let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", "")); player.volume(per); });
['mousedown', 'touchstart'].forEach(e => sliderBtn.addEventListener(e, () => window.sliderDown = true));
['mouseup', 'touchend'].forEach(e => volume.addEventListener(e, () => window.sliderDown = false));
volume.addEventListener('mousemove', e => { if (window.sliderDown) { let x = e.clientX || e.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - window.innerWidth * 0.05) / (window.innerWidth * 0.9))); player.volume(per); } });
volume.addEventListener('touchmove', e => { if (window.sliderDown) { let x = e.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - window.innerWidth * 0.05) / (window.innerWidth * 0.9))); player.volume(per); } });

// Audio visualization
// 这部分代码与您提供的相同，用于恢复原来的可视化效果
let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    if (!player.analyser) return;
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
    canvasCtx.clearRect(0, 0, W, H);
    player.analyser.getByteFrequencyData(player.dataArray);
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
    const barW = W / player.bufferLength;
    let x = 0;
    for (let i = 0; i < player.bufferLength; i++) {
        let barH = player.dataArray[i] / 2; // 与您原始代码一致的计算方式
        canvasCtx.fillRect(x, H - barH, barW, barH);
        x += barW + 1;
    }
    requestAnimationFrame(draw);
}

// Keyboard
document.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === "MediaPlayPause") { pauseBtn.style.display === 'block' ? player.pause() : player.play(); }
    else if (e.key === "MediaTrackNext") { player.skip('next'); }
    else if (e.key === "MediaTrackPrevious") { player.skip('prev'); }
    else if (e.key === "l" || e.key === "L") { player.togglePlaylist(); }
    else if (e.key === "p" || e.key === "P") { player.togglePost(); }
    else if (e.key === "w" || e.key === "W") { player.toggleWave(); }
    else if (e.key === "v" || e.key === "V") { player.toggleVolume(); }
    // 新增：键盘快捷键切换模式 (例如 m)
    else if (e.key === "m" || e.key === "M") { player.toggleMode(); }
});

// 歌词开关
lyricBtn.addEventListener('click', function () {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

console.log("\n %c Gmemp v3.6.3 (Modes + Original Visualization) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
