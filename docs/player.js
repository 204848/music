// 媒体文件基础URL (请根据您的实际情况修改)
let media = "./";

const BACKGROUND_SLIDESHOW_INTERVAL = 5000;

// 缓存DOM元素
let elms = [
    'title', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 
    'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'loading', 'waveCanvas',
    'lyric-wrapper', 'lyric-prev', 'lyric-current', 'lyric-next', // 新歌词元素
    'progress-container', 'progress-bar', 'progress-played', 'progress-thumb', // 新进度条元素
    'playlist-panel', 'list', 'close-playlist-btn', // 新歌单元素
    'volume-control-wrapper', 'volume-slider-container', 'volume-percentage', 'volume-bar', 'volume-level', 'volume-thumb', // 新音量元素
    'lyricBtn', 'modeBtn'
];
elms.forEach(function(elm) {
    window[elm.replace(/-/g, '')] = document.getElementById(elm);
});

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');
// 兼容旧代码，volume是必须的，但我们用新的UI
const volume = document.getElementById('volume'); 

// --- 全局变量 ---
let player;
let playNum = 0;
let requestJson = "memp.json";
let jsonData;
let currentLyrics = [];
let lyricInterval = null;
let lastLyricIndex = -1;

let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

let isSeeking = false; // 进度条拖动状态
let isAdjustingVolume = false; // 音量调节状态

// SVG 图标 Data URIs (从原文件复制)
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3Cpath fill='%23fff' d='M0 96C0 78.3 14.3 64 32 64H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 160c0-17.7 14.3-32 32-32H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm544 160c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H544z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M0 224c0-17.7 14.3-32 32-32s32 14.3 32 32V256c0 44.2 35.8 80 80 80H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H144C64.5 400 0 335.5 0 256V224zM288 96H368c44.2 0 80 35.8 80 80v32c0 17.7 14.3 32 32 32s32-14.3 32-32V176c0-79.5-64.5-144-144-144H288c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0 128a32 32 0 1 0 64 0 32 32 0 1 0 -64 0zM192 256a64 64 0 1 1 128 0A64 64 0 1 1 192 256zM320 64c-17.7 0-32 14.3-32 32s14.3 32 32 32h48c17.7 0 32-14.3 32-32V80c0-8.8-7.2-16-16-16H320zm112 32c0-17.7 14.3-32 32-32s32 14.3 32 32v16h16c8.8 0 16 7.2 16 16v64c0 17.7-14.3 32-32 32s-32-14.3-32-32V160H448c-17.7 0-32-14.3-32-32V96z'/%3E%3Cpath fill='%23fff' transform='translate(200, 290) scale(0.3)' d='M432,128.2,336,32.2V96h-24A120,120,0,0,0,92.5,215.5a120,120,0,0,0,219,81l48,48A184.2,184.2,0,0,1,311.5,416C191,416,96,321,96,200.5S191,85,311.5,85H336v64Z'/%3E%3Ctext x='256' y='160' font-size='160' font-weight='bold' fill='%23fff' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
};
const modeTitles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// --- 歌词解析 (从原文件复制并优化) ---
function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    const regex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
        let content = line.replace(regex, '').trim();
        if (content) {
            let match;
            // 重置正则表达式的lastIndex，以便重新匹配
            regex.lastIndex = 0; 
            while ((match = regex.exec(line)) !== null) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                result.push({ time: min * 60 + sec + ms / 1000, text: content });
            }
        }
    }
    
    return result.sort((a, b) => a.time - b.time);
}

function parseSRT(srtText) {
    if (!srtText) return [];
    // 修复换行符问题，支持\r\n和\n
    const blocks = srtText.trim().replace(/\r\n/g, '\n').split('\n\n');
    const result = [];

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 2) continue;

        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
            const parseTime = (h, m, s, ms) => parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
            const time = parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
            const text = lines.slice(2).join('<br>');
            result.push({ time, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

// --- 更新三行歌词显示 ---
function updateLyricDisplay(time, isSRT = false) {
    if (currentLyrics.length === 0) {
        lyricprev.innerHTML = '';
        lyriccurrent.innerHTML = '♪';
        lyricnext.innerHTML = '';
        return;
    }

    let currentIndex = -1;
    // 使用二分查找优化性能
    let low = 0, high = currentLyrics.length - 1;
    while(low <= high) {
        let mid = Math.floor((low + high) / 2);
        if(currentLyrics[mid].time <= time) {
            currentIndex = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    if (currentIndex !== lastLyricIndex) {
        lyricprev.innerHTML = (currentIndex > 0) ? currentLyrics[currentIndex - 1].text : '';
        lyriccurrent.innerHTML = (currentIndex !== -1) ? currentLyrics[currentIndex].text : '...';
        lyricnext.innerHTML = (currentIndex < currentLyrics.length - 1) ? currentLyrics[currentIndex + 1].text : '';
        lastLyricIndex = currentIndex;
    }
}


// --- 播放器主体 ---
let Player = function(playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.playbackMode = 'list';

    // 初始化显示
    title.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    this.setBackground(playlist[this.index].pic, true);
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;
    this.loadLyric(playlist[this.index].lyric || null);
    
    // 生成播放列表
    list.innerHTML = ''; // 清空
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        div.innerHTML = `
            <span class="song-index">${index + 1}</span>
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
};

Player.prototype = {
    play: function(index) {
        let self = this;
        index = typeof index === 'number' ? index : self.index;
        let data = self.playlist[index];
        const isNewTrack = (index !== self.index);

        if (data.howl) {
            data.howl.play();
        } else {
            data.howl = new Howl({
                src: [media + data.mp3],
                html5: isMobile(),
                onplay: function() {
                    duration.innerHTML = self.formatTime(Math.round(this.duration()));
                    requestAnimationFrame(self.step.bind(self));
                    pauseBtn.style.display = 'block';
                    playBtn.style.display = 'none';
                    loading.style.display = 'none';
                    if (lyricInterval) clearInterval(lyricInterval);
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        updateLyricDisplay(this.seek(), isSRT);
                    }, 150);
                },
                onload: () => { loading.style.display = 'none'; },
                onend: () => { self.playNextTrack(); },
                onpause: () => { if (lyricInterval) clearInterval(lyricInterval); },
                onstop: () => { if (lyricInterval) clearInterval(lyricInterval); },
                onseek: () => { requestAnimationFrame(self.step.bind(self)); }
            });
            data.howl.play();
        }

        self.index = index;
        
        if (isNewTrack) {
            title.innerHTML = data.title;
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

            if (Howler.ctx) {
                if (!self.analyser) {
                    self.analyser = Howler.ctx.createAnalyser();
                    self.analyser.fftSize = 2048;
                    Howler.masterGain.connect(self.analyser);
                    draw();
                }
                self.bufferLength = self.analyser.frequencyBinCount;
                self.dataArray = new Uint8Array(self.bufferLength);
            }
        }
        
        loading.style.display = 'block';
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
    },

    pause: function() {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        if (backgroundInterval) clearInterval(backgroundInterval);
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
    },

    skip: function(direction) {
        let index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                do {
                    index = Math.floor(Math.random() * this.playlist.length);
                } while (index === this.index);
            } else {
                index = 0;
            }
        } else { // 'list' or 'single'
            if (direction === 'next') {
                index = (this.index + 1) % this.playlist.length;
            } else { // 'prev'
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            }
        }
        this.skipTo(index);
    },

    skipTo: function(index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop();
        progressplayed.style.width = '0%';
        progressthumb.style.left = '0%';
        this.play(index);
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index);
        } else {
            this.skip('next');
        }
    },
    
    // ... Background and Mode functions from original JS, no major changes needed ...
     setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval);
        currentImageCache = [];
        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            bgLayer1.style.backgroundImage = `url('${media}${encodeURI(picData[0])}')`;
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
            bgLayer1.style.backgroundImage = `url('${media}${encodeURI(singlePic)}')`;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1;
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
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
        };
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
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


    volume: function(val) {
        Howler.volume(val);
        // 更新新的音量UI
        const percent = Math.round(val * 100);
        volumepercentage.textContent = `${percent}%`;
        volumelevel.style.height = `${percent}%`;
        volumethumb.style.bottom = `${percent}%`;
    },

    seek: function(per) {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) {
            sound.seek(sound.duration() * per);
        }
    },

    step: function() {
        const sound = this.playlist[this.index].howl;
        if (!sound) return;
        let seek = sound.seek() || 0;
        if (!isSeeking) {
            timer.innerHTML = this.formatTime(Math.round(seek));
            let percent = ((seek / sound.duration()) * 100) || 0;
            progressplayed.style.width = `${percent}%`;
            progressthumb.style.left = `${percent}%`;
        }
        if (sound.playing()) {
            requestAnimationFrame(this.step.bind(this));
        }
    },

    loadLyric: function(filename) {
        if (!filename) {
            currentLyrics = [];
            updateLyricDisplay(0);
            return;
        }
        const ext = filename.split('.').pop().toLowerCase();
        fetch(media + encodeURI(filename))
            .then(r => r.ok ? r.text() : Promise.reject('Lyric file not found'))
            .then(text => {
                currentLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
                lastLyricIndex = -1; // 重置
                const sound = this.playlist[this.index].howl;
                updateLyricDisplay(sound ? sound.seek() : 0, ext === 'srt');
            })
            .catch(error => {
                console.error(error);
                currentLyrics = [];
                updateLyricDisplay(0);
            });
    },

    updatePlaylistUI: function() {
        const currentPlaying = document.querySelector('.list-song.playing');
        if (currentPlaying) currentPlaying.classList.remove('playing');
        
        const newPlaying = document.getElementById('list-song-' + this.index);
        if (newPlaying) {
            newPlaying.classList.add('playing');
            if (playlistpanel.classList.contains('open')) {
                newPlaying.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },

    togglePlaylist: function() { playlistpanel.classList.toggle('open'); if(playlistpanel.classList.contains('open')) this.updatePlaylistUI(); },
    togglePost: function() { post.style.display = (post.style.display === "none") ? "block" : "none"; },
    toggleWave: function() { waveCanvas.style.display = (waveCanvas.style.display === "none") ? "block" : "none"; },
    toggleVolume: function() { 
        // 使用新的音量滑块容器
        volumeslidercontainer.style.display = (volumeslidercontainer.style.display === 'flex') ? 'none' : 'flex';
    },

    formatTime: function(secs) {
        let minutes = Math.floor(secs / 60) || 0;
        let seconds = (secs - minutes * 60) || 0;
        return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
    }
};

// --- 初始化和事件监听 ---
// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    let request = new XMLHttpRequest();
    request.open("GET", requestJson);
    request.responseType = 'json';
    request.send();
    request.onload = function() {
        jsonData = request.response;
        if (!jsonData) return;

        if (window.location.hash) {
            try {
                playNum = parseInt(window.location.hash.substring(1));
                if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) playNum = 0;
            } catch { playNum = 0; }
        } else {
             playNum = 0; // 默认第一首
        }
        player = new Player(jsonData);
    };
});

// 基本控制
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));

// 功能开关
playlistBtn.addEventListener('click', () => player.togglePlaylist());
closeplaylistbtn.addEventListener('click', () => player.togglePlaylist());
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => {
     waveCanvas.style.display = waveCanvas.style.display === 'none' ? 'block' : 'none'
});
lyricBtn.addEventListener('click', () => {
    lyricwrapper.style.opacity = lyricwrapper.style.opacity === '0' ? '1' : '0';
});
modeBtn.addEventListener('click', () => player.toggleMode());

// 新进度条拖动逻辑
function seekFromEvent(e) {
    const rect = progressbar.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const per = Math.min(1, Math.max(0, x / rect.width));
    player.seek(per);
}

progressthumb.addEventListener('mousedown', (e) => { isSeeking = true; e.preventDefault()});
document.addEventListener('mousemove', (e) => {
    if (!isSeeking) return;
    const rect = progressbar.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const per = Math.min(1, Math.max(0, x / rect.width));
    let percent = per * 100;
    progressplayed.style.width = `${percent}%`;
    progressthumb.style.left = `${percent}%`;
});
document.addEventListener('mouseup', (e) => {
    if (isSeeking) {
        isSeeking = false;
        seekFromEvent(e);
    }
});
progressbar.addEventListener('click', (e) => seekFromEvent(e));


// 新音量调节逻辑
function volumeFromEvent(e) {
     const rect = volumebar.getBoundingClientRect();
     const y = rect.bottom - (e.clientY || e.touches[0].clientY);
     const per = Math.min(1, Math.max(0, y / rect.height));
     player.volume(per);
}
volumeBtn.addEventListener('click', (e) => {
     e.stopPropagation(); // 防止点击按钮时触发document的点击事件
    player.toggleVolume();
});

volumethumb.addEventListener('mousedown', (e) => { isAdjustingVolume = true; e.preventDefault();});
document.addEventListener('mousemove', (e) => {
    if(!isAdjustingVolume) return;
    volumeFromEvent(e);
});
document.addEventListener('mouseup', (e) => {
    if (isAdjustingVolume) {
        isAdjustingVolume = false;
        volumeFromEvent(e);
    }
});
volumebar.addEventListener('click', (e) => volumeFromEvent(e));

// 点击页面其他地方关闭音量调节
document.addEventListener('click', (e) => {
    if (volumeslidercontainer.style.display === 'flex' && !volumecontrolwrapper.contains(e.target)) {
        volumeslidercontainer.style.display = 'none';
    }
});


// 节奏条 Canvas 绘制
function draw() {
    if (waveCanvas.style.display === 'none' || !player || !player.analyser) {
        requestAnimationFrame(draw);
        return;
    };
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

console.log("\n %c Gmemp Modified Version %c Based on https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
