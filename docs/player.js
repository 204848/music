let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements.
// 确保 modeBtn 和 lyricContainer 在 elms 数组中
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

// 获取背景图层元素
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

// === 播放模式 ===
// SVG 图标 Data URIs - 确保图标格式正确且清晰
const modeIcons = {
    // 顺序播放 (列表) - 三条水平线
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z'/%3E%3C/svg%3E",
    // 随机播放 - 交叉箭头
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    // 单曲循环 - 箭头循环 + 中心数字1
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M464 32c0-12.2-7.1-22.7-17.5-27.4s-22.4-2.7-30.6 5.5L325.5 100.5c-13.9 13.9-13.9 36.5 0 50.4c13.9 13.9 36.5 13.9 50.4 0L448 78.6V224c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32zM0 384c0 17.7 14.3 32 32 32s32-14.3 32-32V238.6l72.1 72.1c13.9 13.9 36.5 13.9 50.4 0s13.9-36.5 0-50.4L93.1 169.9c-13.9-13.9-36.5-13.9-50.4 0s-13.9 36.5 0 50.4L114.8 292.4V384zm384-32c17.7 0 32-14.3 32-32V174.6l72.1 72.1c13.9 13.9 36.5 13.9 50.4 0s13.9-36.5 0-50.4L445.1 103.9c-13.9-13.9-36.5-13.9-50.4 0s-13.9 36.5 0 50.4L466.8 226.4V320c0 17.7 14.3 32 32 32z'/%3E%3Ccircle cx='256' cy='256' r='40' fill='%23fff'/%3E%3Ctext x='256' y='261' font-size='30' font-weight='bold' fill='%23000' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
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
    let jsonData = JSON.parse(request.response);
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

// === 歌词解析函数 ===
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

// === Player类定义 ===
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list'; // 'list', 'shuffle', 'single'

    // Initial display
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);
    
    // Setup playlist
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = `${song.title} - ${song.artist}`;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    
    // Initialize mode button
    this.updateModeButton();
};

Player.prototype = {
    play: function (index) {
        let self = this;
        let sound;

        const isNewTrack = (typeof index === 'number' && index !== self.index);
        index = typeof index === 'number' ? index : self.index;
        let data = self.playlist[index];

        // Handle background slideshow for continued play
        if (!isNewTrack && self.isSlideshowRunning) {
            self.startBackgroundSlideshow(data.pic, false);
        }

        // Clear old lyric interval
        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricTime = -1;

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

                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(function () {
                        const pos = sound.seek();
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            // self.updateLyricDisplay(pos, isSRT); // 使用新方法
                            lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                            lastLyricTime = pos;
                        }
                    }, 100);
                },
                onload: function () {
                    loading.style.display = 'none';
                    progressBar.style.display = 'block';
                },
                onend: function () {
                    self.playNextTrack();
                },
                onpause: function () {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval);
                    progressBar.style.display = 'none';
                },
                onstop: function () {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval);
                    progressBar.style.display = 'none';
                },
                onseek: function () {
                    const pos = sound.seek();
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    // self.updateLyricDisplay(pos, isSRT);
                    lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                    lastLyricTime = pos;
                    requestAnimationFrame(self.step.bind(self));
                }
            });
        }

        sound.play();

        if (isNewTrack) {
            // Update UI for new track
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
            self.setBackground(data.pic, true);
            window.location.hash = "#" + index;
            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            
            if(document.querySelector('#list-song-' + playNum)) {
                 document.querySelector('#list-song-' + playNum).style.backgroundColor = '';
            }
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;

            self.loadLyric(data.lyric || null);
            if ('mediaSession' in navigator) self.updateMediaSession(data);

            // Audio visualization setup
            self.analyser = Howler.ctx.createAnalyser();
            self.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            self.bufferLength = self.analyser.frequencyBinCount;
            self.dataArray = new Uint8Array(self.bufferLength);
            Howler.masterGain.connect(self.analyser);
            draw(); // 确保调用 draw 函数开始绘制
        }

        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`;
        
        if (sound.state() === 'loaded') {
            loading.style.display = 'none';
        } else {
            loading.style.display = 'block';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
        }

        self.index = index;
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
        currentImageCache = []; // Clear old cache

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            // Show first image immediately
            const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = firstImageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;

            // Preload all images in the background
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
        if(initialImage && initialImage.complete) { // Check if image is loaded
            const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`;
            currentActiveLayer.style.opacity = 1;
        }

        const changeImage = () => {
            currentBgIndex = (currentBgIndex + 1) % images.length;
            const nextImage = currentImageCache[currentBgIndex];

            if(nextImage && nextImage.complete) { // Check if next image is loaded
                let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
                let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;

                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
            // If image not loaded, skip this cycle and try next time
        };
        
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        // Background slideshow pause is handled in onpause callback
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
            } else {
                index = 0;
            }
        } else {
            if (direction === 'next') {
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            } else { // 'prev'
                index = (this.index + 1) % this.playlist.length;
            }
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        progress.style.width = '0%';
        this.play(index);
    },
    
    toggleMode: function() {
        if (this.playbackMode === 'list') {
            this.playbackMode = 'shuffle';
        } else if (this.playbackMode === 'shuffle') {
            this.playbackMode = 'single';
        } else { // 'single'
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

    volume: function (val) {
        Howler.volume(val);
        let barWidth = (val * 90) / 100;
        barFull.style.width = `${barWidth * 100}%`;
        sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`;
    },

    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) {
            const seekTime = sound.duration() * per;
            sound.seek(seekTime);
            // Update lyric on seek
            const isSRT = this.playlist[this.index].lyric && /\.srt$/i.test(this.playlist[this.index].lyric);
            // this.updateLyricDisplay(seekTime, isSRT);
            lyricContainer.innerHTML = getCurrentLyric(seekTime, isSRT);
            lastLyricTime = seekTime;
        }
    },

    step: function () {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        timer.innerHTML = this.formatTime(Math.round(seek));
        progress.style.width = `${((seek / durationVal) * 100) || 0}%`;
        if (sound.playing()) {
            requestAnimationFrame(this.step.bind(this));
        }
    },

    loadLyric: function (filename) {
        currentLyrics = [];
        // Clear container immediately
        if (lyricContainer) lyricContainer.innerHTML = '';

        if (!filename) return;

        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename))
            .then(r => {
                if (!r.ok) {
                     throw new Error(`Network response was not ok (${r.status})`);
                }
                return r.text();
            })
            .then(text => {
                if (ext === 'srt') {
                    currentLyrics = parseSRT(text);
                } else if (ext === 'lrc') {
                    currentLyrics = parseLRC(text);
                } else {
                    currentLyrics = [];
                }
                
                // Initial lyric display
                if (currentLyrics.length > 0) {
                    const sound = this.playlist[this.index].howl;
                    const pos = sound ? sound.seek() : 0;
                    // this.updateLyricDisplay(pos, ext === 'srt');
                    lyricContainer.innerHTML = getCurrentLyric(pos, ext === 'srt');
                    lastLyricTime = pos;
                } else {
                    if (lyricContainer) lyricContainer.innerHTML = '';
                }
            })
            .catch(error => {
                console.error('加载歌词文件时出错:', error);
                currentLyrics = [];
                if (lyricContainer) lyricContainer.innerHTML = '';
            });
    },
    /*
    // 新增：优化的歌词显示方法 (保留以供未来参考)
    updateLyricDisplay: function(currentTime, isSRT) {
        if (!currentLyrics.length || !lyricContainer) return;

        const container = lyricContainer;
        container.innerHTML = ''; // Clear previous content

        let activeIndex = -1;
        const linesToShow = 5; // Show up to 5 lines
        const halfLines = Math.floor(linesToShow / 2);

        // Find active lyric index
        for (let i = 0; i < currentLyrics.length; i++) {
            const lyric = currentLyrics[i];
            if (currentTime >= lyric.time && (isSRT ? currentTime < lyric.end : currentTime < lyric.end)) {
                activeIndex = i;
                break;
            }
        }

        if (activeIndex === -1) return; // No active lyric found

        // Calculate display range to show linesToShow lines
        let startIndex = Math.max(0, activeIndex - halfLines);
        let endIndex = Math.min(currentLyrics.length - 1, activeIndex + halfLines);

        // Adjust range if needed to ensure we show exactly linesToShow lines (if available)
        if (endIndex - startIndex + 1 < linesToShow) {
            if (startIndex > 0) {
                // Try to shift start back
                startIndex = Math.max(0, endIndex - linesToShow + 1);
            } else if (endIndex < currentLyrics.length - 1) {
                // Try to shift end forward
                endIndex = Math.min(currentLyrics.length - 1, startIndex + linesToShow - 1);
            }
        }

        // Create and display lyric lines
        for (let i = startIndex; i <= endIndex; i++) {
            const lyric = currentLyrics[i];
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyric-line';
            if (i === activeIndex) {
                lineDiv.classList.add('active');
            }
            lineDiv.textContent = lyric.text;
            container.appendChild(lineDiv);
        }
    },
    */

    togglePlaylist: function () {
        let display = (playlist.style.display === 'block') ? 'none' : 'block';
        setTimeout(function () {
            playlist.style.display = display;
            if (playlist.style.display == 'block') {
                list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2;
            }
        }, (display === 'block') ? 0 : 500);
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    togglePost: function () {
        post.style.display = (post.style.display == "none") ? "block" : "none";
    },

    toggleWave: function () {
        waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none";
    },

    toggleVolume: function () {
        let display = (volume.style.display === 'block') ? 'none' : 'block';
        setTimeout(function () {
            volume.style.display = display;
        }, (display === 'block') ? 0 : 500);
        volume.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    formatTime: function (secs) {
        let minutes = Math.floor(secs / 60) || 0;
        let seconds = (secs - minutes * 60) || 0;
        return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
    }
};

// === 事件监听器 ===
// Controls
playBtn.addEventListener('click', function () { player.play(); });
pauseBtn.addEventListener('click', function () { player.pause(); });
prevBtn.addEventListener('click', function () { player.skip('prev'); });
nextBtn.addEventListener('click', function () { player.skip('next'); });
progressBar.addEventListener('click', function (event) { player.seek(event.clientX / window.innerWidth); });
playlistBtn.addEventListener('click', function () { player.togglePlaylist(); });
playlist.addEventListener('click', function () { player.togglePlaylist(); });
postBtn.addEventListener('click', function () { player.togglePost(); });
waveBtn.addEventListener('click', function () { player.toggleWave(); });
volumeBtn.addEventListener('click', function () { player.toggleVolume(); });
volume.addEventListener('click', function () { player.toggleVolume(); });
modeBtn.addEventListener('click', function () { player.toggleMode(); }); // 新增模式切换监听

// Volume
barEmpty.addEventListener('click', function (event) {
    let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", ""));
    player.volume(per);
});
['mousedown', 'touchstart'].forEach(e => sliderBtn.addEventListener(e, () => window.sliderDown = true));
['mouseup', 'touchend'].forEach(e => volume.addEventListener(e, () => window.sliderDown = false));

const move = (event) => {
    if (window.sliderDown) {
        let x = event.clientX || event.touches[0].clientX;
        let per = Math.min(1, Math.max(0, (x - barEmpty.getBoundingClientRect().left) / barEmpty.clientWidth));
        player.volume(per);
    }
};
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true });


// Audio visualization
let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    if (!player || !player.analyser) return; // 如果 player 未初始化或 analyser 不存在，直接返回
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W;
    waveCanvas.height = H;
    canvasCtx.clearRect(0, 0, W, H);
    player.analyser.getByteFrequencyData(player.dataArray);
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
    const barW = W / player.bufferLength;
    let x = 0;
    for (let i = 0; i < player.bufferLength; i++) {
        let barH = player.dataArray[i] / 2;
        canvasCtx.fillRect(x, H - barH, barW, barH);
        x += barW + 1;
    }
    requestAnimationFrame(draw); // 持续请求下一帧
}

// Make sure draw is called at least once to start the animation loop if needed elsewhere
// draw(); // 已在 player.play 中调用

// Keyboard
document.addEventListener('keyup', e => {
    if (!player) return; // 确保 player 已初始化
    if (e.key === ' ' || e.key === "MediaPlayPause") {
        pauseBtn.style.display === 'block' ? player.pause() : player.play();
    } else if (e.key === "MediaTrackNext") {
        player.skip('next');
    } else if (e.key === "MediaTrackPrevious") {
        player.skip('prev');
    } else if (e.key === "l" || e.key === "L") {
        player.togglePlaylist();
    } else if (e.key === "p" || e.key === "P") {
        player.togglePost();
    } else if (e.key === "w" || e.key === "W") {
        player.toggleWave();
    } else if (e.key === "v" || e.key === "V") {
        player.toggleVolume();
    }
});

// 歌词开关
lyricBtn.addEventListener('click', function () {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

console.log("\n %c Gmemp v3.8.0 (Stable & Improved) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
