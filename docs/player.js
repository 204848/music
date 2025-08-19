let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements.
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer'];
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

// 背景轮询相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;

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

// ... (LRC 和 SRT 解析函数保持不变)
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

/**
 * Player class
 * @param {Array} playlist
 */
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false; // 跟踪当前歌曲是否正在轮播

    // Initial display
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true); // 初始加载，强制重置
    post.innerHTML = '<p><b>' + playlist[this.index].date + '</b></p>' + playlist[this.index].article;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = playlist[this.index].title + " - Gmemp";
    this.loadLyric(playlist[this.index].lyric || null);
    
    // Setup playlist
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = song.title + ' - ' + song.artist;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
};

Player.prototype = {
    play: function (index) {
        let self = this;
        // 判断是新歌还是继续播放
        const isNewTrack = (typeof index === 'number' && index !== self.index);
        
        // 如果是继续播放，则使用当前索引
        index = typeof index === 'number' ? index : self.index;
        
        let data = self.playlist[index];
        let sound;

        // 如果是继续播放且背景轮播已暂停，则恢复轮播
        if (!isNewTrack && self.isSlideshowRunning) {
            self.startBackgroundSlideshow(data.pic, false); // false表示不重置
        }

        // ... (其余播放逻辑)
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
                    self.skip('next');
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
                    lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                    lastLyricTime = pos;
                    requestAnimationFrame(self.step.bind(self));
                }
            });
        }
        sound.play();

        // 仅在新歌播放时更新UI和背景
        if (isNewTrack) {
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = data.title + " - Gmemp";
            post.innerHTML = '<p><b>' + data.date + '</b></p>' + data.article;
            this.setBackground(data.pic, true); // 强制重置背景
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
            
            // 更新 mediaSession
            if ('mediaSession' in navigator) this.updateMediaSession(data);

            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw();
        }

        progressBar.style.margin = -(window.innerHeight * 0.3 / 2) + 'px auto';
        
        if (sound.state() === 'loaded') {
            loading.style.display = 'none';
        } else {
            loading.style.display = 'block';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
        }
        self.index = index;
    },

    updateMediaSession: function(data) {
        if (!('mediaSession' in navigator)) return;

        const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic;
        if (!coverPic) { // 如果没有图片信息，直接设置元数据
            navigator.mediaSession.metadata = new MediaMetadata({ title: data.title, artist: data.artist });
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
            const artwork = [{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }];
            navigator.mediaSession.metadata = new MediaMetadata({ title: data.title, artist: data.artist, artwork });
        };
        img.onerror = () => { // 即使图片加载失败，也设置元数据（不带封面）
            console.warn("封面图片加载失败 for mediaSession: " + img.src);
            navigator.mediaSession.metadata = new MediaMetadata({ title: data.title, artist: data.artist });
        };
        img.src = media + encodeURI(coverPic);

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev'));
        navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next'));
    },
    
    setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval);

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
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

        const initialImage = `url('${media}${encodeURI(images[currentBgIndex])}')`;
        const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
        currentActiveLayer.style.backgroundImage = initialImage;
        currentActiveLayer.style.opacity = 1;

        const changeImage = () => {
            currentBgIndex = (currentBgIndex + 1) % images.length;
            let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
            let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            
            const img = new Image();
            img.src = media + encodeURI(images[currentBgIndex]);
            img.onload = () => {
                nextLayer.style.backgroundImage = `url('${img.src}')`;
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            };
        };
        
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    pause: function () {
        let sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        
        // **已增强：暂停时清除轮播定时器**
        if (backgroundInterval) {
            clearInterval(backgroundInterval);
        }

        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function (direction) {
        let index = this.index;
        if (direction === 'next') {
            index = (index - 1 + this.playlist.length) % this.playlist.length;
        } else {
            index = (index + 1) % this.playlist.length;
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        let sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        
        progress.style.width = '0%';
        this.play(index);
    },

    // ... (volume, seek, step, loadLyric, toggles 和 formatTime 方法保持不变)
    volume: function (val) {
        Howler.volume(val);
        let barWidth = (val * 90) / 100;
        barFull.style.width = (barWidth * 100) + '%';
        sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
    },

    seek: function (per) {
        let sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) {
            const pos = sound.duration() * per;
            sound.seek(pos);
        }
    },

    step: function () {
        let sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        timer.innerHTML = this.formatTime(Math.round(seek));
        progress.style.width = (((seek / durationVal) * 100) || 0) + '%';
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
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
    toggleVolume: function () { let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(() => { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; }
};

// ... (事件监听器和 draw 函数保持不变)
playBtn.addEventListener('click', function () { player.play(); });
pauseBtn.addEventListener('click', function () { player.pause(); });
prevBtn.addEventListener('click', function () { player.skip('next'); });
nextBtn.addEventListener('click', function () { player.skip('prev'); });
progressBar.addEventListener('click', function (event) { player.seek(event.clientX / window.innerWidth); });
playlistBtn.addEventListener('click', function () { player.togglePlaylist(); });
playlist.addEventListener('click', function () { player.togglePlaylist(); });
postBtn.addEventListener('click', function () { player.togglePost(); });
waveBtn.addEventListener('click', function () { player.toggleWave(); });
volumeBtn.addEventListener('click', function () { player.toggleVolume(); });
volume.addEventListener('click', function () { player.toggleVolume(); });

barEmpty.addEventListener('click', function (event) { let per = event.layerX / parseFloat(getComputedStyle(barEmpty, null).width.replace("px", "")); player.volume(per); });
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

let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    if (!player || !player.analyser) return;
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; waveCanvas.height = H;
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
    requestAnimationFrame(draw);
}

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

lyricBtn.addEventListener('click', function () {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

console.log("\n %c Gmemp v3.4.9 (Enhanced) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
