let media = "https://music.1357924680liu.dpdns.org/media/";

// Cache references to DOM elements.
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricInterval = null;

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

    // Initial display
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    document.querySelector("body").style.backgroundImage = "url('" + media + encodeURI(playlist[this.index].pic) + "')";
    post.innerHTML = '<p><b>' + playlist[this.index].date + '</b></p>' + playlist[this.index].article;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(playlist[this.index].pic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = playlist[this.index].title + " - Gmemp";

    // 加载初始歌词 (0)
    this.loadLyric(playlist[this.index].lyric || null);

    // Setup playlist
    playlist.forEach(function (song) {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + playlist.indexOf(song);
        div.innerHTML = song.title + ' - ' + song.artist;
        div.onclick = function () {
            player.skipTo(playlist.indexOf(song));
        };
        list.appendChild(div);
    });
    document.querySelector('#list-song-' + playNum).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
};

Player.prototype = {
    play: function (index) {
        let self = this;
        let sound;

        index = typeof index === 'number' ? index : self.index;
        let data = self.playlist[index];

        // 清除旧的歌词定时器
        if (lyricInterval) {
            clearInterval(lyricInterval);
            lyricInterval = null;
        }

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
                        lyricContainer.innerHTML = getCurrentLyric(pos, isSRT);
                    }, 250);
                },
                onload: function () {
                    loading.style.display = 'none';
                    progressBar.style.display = 'block';
                },
                onend: function () {
                    self.skip('next');
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
                    lyricContainer.innerHTML = getCurrentLyric(pos, data.lyric && /\.srt$/i.test(data.lyric));
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
            img.src = media + encodeURI(data.pic);
        }

        // 更新 UI
        track.innerHTML = data.title;
        artist.innerHTML = data.artist;
        document.title = data.title + " - Gmemp";
        post.innerHTML = '<p><b>' + data.date + '</b></p>' + data.article;
        document.querySelector("body").style.backgroundImage = "url('" + media + encodeURI(data.pic) + "')";
        window.location.hash = "#" + (index);
        document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
        document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(data.pic));
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
        if (direction === 'next') {
            index = self.index - 1;
            if (index < 0) index = self.playlist.length - 1;
        } else {
            index = self.index + 1;
            if (index >= self.playlist.length) index = 0;
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
                } else {
                    lyricContainer.innerHTML = '';
                }
            })
            .catch(() => {
                currentLyrics = [];
                lyricContainer.innerHTML = '';
            });
    },

    // 保持原有方法不变...
    togglePlaylist: function () { let self = this; let display = (playlist.style.display === 'block') ? 'none' : 'block'; setTimeout(function () { playlist.style.display = display; if (playlist.style.display == 'block') { list.scrollTop = document.querySelector('#list-song-' + playNum).offsetTop - list.offsetHeight / 2; } }, (display === 'block') ? 0 : 500); playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
    toggleVolume: function () { let self = this; let display = (volume.style.display === 'block') ? 'none' : 'block'; setTimeout(function () { volume.style.display = display; }, (display === 'block') ? 0 : 500); volume.className = (display === 'block') ? 'fadein' : 'fadeout'; },
    formatTime: function (secs) { let minutes = Math.floor(secs / 60) || 0; let seconds = (secs - minutes * 60) || 0; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; }
};

// Controls
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

// Volume
barEmpty.addEventListener('click', function (event) { let per = event.layerX / barEmpty.scrollWidth; player.volume(per); });
['mousedown', 'touchstart'].forEach(e => sliderBtn.addEventListener(e, () => window.sliderDown = true));
['mouseup', 'touchend'].forEach(e => volume.addEventListener(e, () => window.sliderDown = false));
volume.addEventListener('mousemove', e => { if (window.sliderDown) { let x = e.clientX || e.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - window.innerWidth * 0.05) / (window.innerWidth * 0.9))); player.volume(per); } });
volume.addEventListener('touchmove', e => { if (window.sliderDown) { let x = e.touches[0].clientX; let per = Math.min(1, Math.max(0, (x - window.innerWidth * 0.05) / (window.innerWidth * 0.9))); player.volume(per); } });

// Audio visualization
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
        let barH = player.dataArray[i] / 2;
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
});

// 歌词开关
lyricBtn.addEventListener('click', function () {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

console.log("\n %c Gmemp v3.4.8 %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
