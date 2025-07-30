let media = "https://music.1357924680liu.dpdns.org/media/";

// Cache references to DOM elements.
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

let player;
let playNum = 0;
let requestJson = "memp.json";

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

// 解析 SRT 字幕
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
        i++;
    }
    return result;
}

let currentLyrics = [];
let lyricInterval = null;

/**
 * Player class
 * @param {Array} playlist
 */
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;

    // Display initial track info
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;

    // 背景和文章
    document.querySelector("body").style.backgroundImage = "url('" + media + encodeURI(playlist[this.index].pic) + "')";
    post.innerHTML = '<p><b>' + playlist[this.index].date + '</b></p>' + playlist[this.index].article;

    // OG信息
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(playlist[this.index].pic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', playlist[this.index].article);
    document.querySelector('meta[property="og:url"]').setAttribute('content', window.location.href);

    // 加载当前歌曲歌词
    this.loadLyric(playlist[this.index].lyric || null);

    // Setup playlist display
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

    // 当前播放高亮
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

                    // 歌词更新定时器
                    if (currentLyrics.length > 0) {
                        lyricInterval = setInterval(function () {
                            const pos = sound.seek();
                            const active = currentLyrics.filter(l => pos >= l.start && pos < l.end);
                            lyricContainer.innerHTML = active.length > 0 ? active[0].text : '';
                        }, 250);
                    } else {
                        lyricContainer.innerHTML = '';
                    }
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
                    requestAnimationFrame(self.step.bind(self));
                }
            });
        }

        sound.play();

        // 手机系统控制
        if ('mediaSession' in navigator) {
            const artworkUrl = media + encodeURI(data.pic);
            const img = new Image();
            const applyMediaSession = (artwork) => {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: data.title, artist: data.artist, artwork: artwork ? [artwork] : []
                });
            };
            applyMediaSession(null);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 512;
                canvas.width = size; canvas.height = size;
                const srcSize = Math.min(img.width, img.height);
                const sx = (img.width - srcSize) / 2;
                const sy = (img.height - srcSize) / 2;
                ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
                const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
                applyMediaSession({ src: croppedUrl, sizes: '512x512', type: 'image/jpeg' });
            };
            img.onerror = (err) => console.warn("图片加载失败", err);
            img.crossOrigin = 'Anonymous';
            img.src = artworkUrl;
        }

        // 更新显示
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

        // Web Audio 分析器
        this.analyser = Howler.ctx.createAnalyser();
        this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        Howler.masterGain.connect(this.analyser);
        draw();

        // 加载新歌词
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
            sound.seek(sound.duration() * per);
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
        fetch(media + encodeURI(filename))
            .then(r => r.text())
            .then(text => {
                currentLyrics = parseSRT(text);
                // 首次加载时显示第一句（或清空）
                if (currentLyrics.length > 0) {
                    const sound = this.playlist[this.index].howl;
                    const pos = sound ? sound.seek() : 0;
                    const first = currentLyrics.find(l => pos >= l.start && pos < l.end);
                    lyricContainer.innerHTML = first ? first.text : '';
                } else {
                    lyricContainer.innerHTML = '';
                }
            })
            .catch(err => {
                console.error('歌词加载失败', filename, err);
                currentLyrics = [];
                lyricContainer.innerHTML = '';
            });
    },

    togglePlaylist: function () {
        let self = this;
        let display = (playlist.style.display === 'block') ? 'none' : 'block';
        setTimeout(function () {
            playlist.style.display = display;
            if (playlist.style.display == 'block') {
                let parentDoc = list, childDoc = document.querySelector('#list-song-' + playNum);
                parentDoc.scrollTop = childDoc.offsetTop - parentDoc.offsetHeight / 2;
            }
        }, (display === 'block') ? 0 : 500);
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    togglePost: function () {
        if (post.style.display == "none") post.style.display = "block";
        else post.style.display = "none";
    },

    toggleWave: function () {
        if (waveCanvas.style.display == "none") waveCanvas.style.display = "block";
        else waveCanvas.style.display = "none";
    },

    toggleVolume: function () {
        let self = this;
        let display = (volume.style.display === 'block') ? 'none' : 'block';
        setTimeout(function () {
            volume.style.display = display;
        }, (display === 'block') ? 0 : 500);
        volume.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    formatTime: function (secs) {
        let minutes = Math.floor(secs / 60) || 0;
        let seconds = (secs - minutes * 60) || 0;
        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
};

// Control listeners
playBtn.addEventListener('click', function () {
    player.play();
});
pauseBtn.addEventListener('click', function () {
    player.pause();
});
prevBtn.addEventListener('click', function () {
    player.skip('prev');
});
nextBtn.addEventListener('click', function () {
    player.skip('next');
});
progressBar.addEventListener('click', function (event) {
    player.seek(event.clientX / window.innerWidth);
});
playlistBtn.addEventListener('click', function () {
    player.togglePlaylist();
});
playlist.addEventListener('click', function () {
    player.togglePlaylist();
});
postBtn.addEventListener('click', function () {
    player.togglePost();
});
waveBtn.addEventListener('click', function () {
    player.toggleWave();
});
volumeBtn.addEventListener('click', function () {
    player.toggleVolume();
});
volume.addEventListener('click', function () {
    player.toggleVolume();
});

// Volume control
barEmpty.addEventListener('click', function (event) {
    let per = event.layerX / parseFloat(barEmpty.scrollWidth);
    player.volume(per);
});
sliderBtn.addEventListener('mousedown', function () {
    window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function () {
    window.sliderDown = true;
});
volume.addEventListener('mouseup', function () {
    window.sliderDown = false;
});
volume.addEventListener('touchend', function () {
    window.sliderDown = false;
});
let move = function (event) {
    if (window.sliderDown) {
        let x = event.clientX || event.touches[0].clientX;
        let startX = window.innerWidth * 0.05;
        let layerX = x - startX;
        let per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
        player.volume(per);
    }
};
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);

// Audio visualization
let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    let HEIGHT = window.innerHeight;
    let WIDTH = window.innerWidth;
    waveCanvas.setAttribute('width', WIDTH);
    waveCanvas.setAttribute('height', HEIGHT);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    drawVisual = requestAnimationFrame(draw);

    if (!player.analyser) return;
    player.analyser.getByteFrequencyData(player.dataArray);

    canvasCtx.fillStyle = "rgba(0,0,0,0)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    const barWidth = (WIDTH / player.bufferLength);
    let x = 0;

    for (let i = 0; i < player.bufferLength; i++) {
        let barHeight = player.dataArray[i];
        canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
        canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}

// 键盘控制
document.addEventListener('keyup', function (event) {
    if (event.key == ' ' || event.key == "MediaPlayPause") {
        if (pauseBtn.style.display == 'none' || pauseBtn.style.display == "") player.play();
        else player.pause();
    } else if (event.key == "MediaTrackNext") {
        player.skip('next');
    } else if (event.key == "MediaTrackPrevious") {
        player.skip('prev');
    } else if (event.key == "l" || event.key === "L") {
        player.togglePlaylist();
    } else if (event.key == "p" || event.key === "P") {
        player.togglePost();
    } else if (event.key == "w" || event.key === "W") {
        player.toggleWave();
    } else if (event.key == "v" || event.key === "V") {
        player.toggleVolume();
    }
});

// 歌词按钮控制
lyricBtn.addEventListener('click', function () {
    if (lyricContainer.style.display === 'none' || !lyricContainer.style.display) {
        lyricContainer.style.display = 'block';
    } else {
        lyricContainer.style.display = 'none';
    }
});

// 控制台日志
console.log("\n %c Gmemp v3.4.8 %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
