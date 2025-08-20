let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 可配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn'];
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

// === 播放模式相关 ===
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%234CAF50' d='M0 128c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zm0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM0 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z'/%3E%3C/svg%3E",
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%232196F3' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E",
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23FF9800' d='M0 224c0-17.7 14.3-32 32-32s32 14.3 32 32V256c0 44.2 35.8 80 80 80H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H144C64.5 400 0 335.5 0 256V224zM288 96H368c44.2 0 80 35.8 80 80v32c0 17.7 14.3 32 32 32s32-14.3 32-32V176c0-79.5-64.5-144-144-144H288c-17.7 0-32 14.3-32 32s14.3 32 32 32zM208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z'/%3E%3Cpath fill='%23FF9800' transform='translate(20, 0) scale(0.35)' d='M432,128.2,336,32.2V96h-24A120,120,0,0,0,92.5,215.5a120,120,0,0,0,219,81l48,48A184.2,184.2,0,0,1,311.5,416C191,416,96,321,96,200.5S191,85,311.5,85H336v64Z'/%3E%3Ctext x='240' y='325' font-size='200' font-weight='bold' fill='%23FF9800' text-anchor='middle' alignment-baseline='middle'%3E1%3C/text%3E%3C/svg%3E"
};
const modeTitles = {
    list: '顺序播放',
    shuffle: '随机播放',
    single: '单曲循环'
};

// 从 memp.json 加载播放列表
let request = new XMLHttpRequest();
request.open("GET", requestJson);
request.responseType = 'text';
request.send();
request.onload = function () {
    let jsonData = JSON.parse(request.response);
    console.log(jsonData);

    if (window.location.hash !== '') {
        try {
            playNum = parseInt(window.location.hash.slice(1), 10);
            if (isNaN(playNum) || playNum < 0 || playNum >= jsonData.length) {
                playNum = jsonData.length - 1;
            }
        } catch (e) {
            playNum = jsonData.length - 1;
        }
    } else {
        playNum = jsonData.length - 1;
    }

    player = new Player(jsonData);
};

// 工具函数
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
            let min = parseInt(match[1], 10);
            let sec = parseInt(match[2], 10);
            let ms = 0;
            if (match[3]) {
                ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3], 10);
            } else if (match[4]) {
                ms = parseInt(match[4], 10) * 10;
            }
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
        const start = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10) + parseInt(timeMatch[4], 10) / 1000;
        const end = parseInt(timeMatch[5], 10) * 3600 + parseInt(timeMatch[6], 10) * 60 + parseInt(timeMatch[7], 10) + parseInt(timeMatch[8], 10) / 1000;
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

    // === 初始 DOM 更新 ===
    // 1. 显示第一首歌的信息
    track.innerHTML = playlist[this.index].title;
    artist.innerHTML = playlist[this.index].artist;
    // 1.1. 绑定单击事件切换艺术家显示
    document.querySelector('#track').addEventListener('click', () => {
        const currentText = artist.innerHTML;
        if (currentText === playlist[this.index].artist) {
            artist.innerHTML = playlist[this.index].title;
        } else {
            artist.innerHTML = playlist[this.index].artist;
        }
    });

    // 2. 设置初始背景图片（立即显示）
    this.setBackground(playlist[this.index].pic, true);

    // 3. 设置歌曲介绍
    post.innerHTML = `<p><b>${playlist[this.index].date}</b></p>${playlist[this.index].article}`;

    // 4. 更新 Open Graph 元数据
    const initialPic = Array.isArray(playlist[this.index].pic) ? playlist[this.index].pic[0] : playlist[this.index].pic;
    document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(initialPic));
    document.querySelector('meta[property="og:title"]').setAttribute('content', playlist[this.index].title);
    document.title = `${playlist[this.index].title} - Gmemp`;

    // 5. 加载初始歌词
    this.loadLyric(playlist[this.index].lyric || null);

    // 6. 构建播放列表 (优化：添加.current类)
    playlist.forEach((song, index) => {
        let div = document.createElement('div');
        div.className = 'list-song';
        div.id = 'list-song-' + index;
        if (index === this.index) {
            div.classList.add('current'); // 为当前播放歌曲添加特殊类
        }
        div.innerHTML = `${song.title} - ${song.artist}`;
        div.onclick = () => { this.skipTo(index); };
        list.appendChild(div);
    });

    // 7. 初始化播放模式按钮
    this.updateModeButton();
};

Player.prototype = {
    // 播放函数
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = typeof index === 'number' ? index : this.index;
        let data = this.playlist[index];
        let sound;

        // 如果不是新歌且背景轮播正在进行，则同步恢复轮播状态
        if (!isNewTrack && this.isSlideshowRunning) {
            this.startBackgroundSlideshow(data.pic, false);
        }

        // 清除旧的歌词更新定时器
        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricTime = -1;

        // 检查 Howl 音频对象是否已存在
        if (data.howl) {
            sound = data.howl;
        } else {
            // 创建新的 Howl 实例
            sound = data.howl = new Howl({
                src: [media + data.mp3],
                html5: isMobile(), // 移动端使用 HTML5 Audio
                onplay: () => {
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(this.step.bind(this));
                    progressBar.style.display = 'block';
                    pauseBtn.style.display = 'block';
                    playBtn.style.display = 'none';
                    loading.style.display = 'none';

                    // 启动歌词更新定时器
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        // 优化：减少更新频率和不必要的DOM操作
                        if (Math.abs(pos - lastLyricTime) > 0.1) {
                            this.updateLyricDisplay(pos, isSRT);
                            lastLyricTime = pos;
                        }
                    }, 100);
                },
                onload: () => {
                    loading.style.display = 'none';
                    progressBar.style.display = 'block';
                },
                // 核心改动：根据播放模式决定下一首
                onend: () => {
                    if (this.playbackMode === 'single') {
                        // 单曲循环：重新播放当前歌曲
                        this.skipTo(this.index);
                    } else {
                        // 顺序或随机：播放下一首（由 skip 函数内部逻辑决定）
                        this.skip('next');
                    }
                },
                onpause: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval); // 暂停时也停止背景轮播
                    progressBar.style.display = 'none';
                },
                onstop: () => {
                    if (lyricInterval) clearInterval(lyricInterval);
                    if (backgroundInterval) clearInterval(backgroundInterval);
                    progressBar.style.display = 'none';
                },
                onseek: () => {
                    const pos = sound.seek();
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    this.updateLyricDisplay(pos, isSRT);
                    lastLyricTime = pos;
                    requestAnimationFrame(this.step.bind(this));
                }
            });
        }

        // 开始播放
        sound.play();

        // 如果是新歌，则进行一系列 UI 和状态更新
        if (isNewTrack) {
            // 更新顶部信息
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;

            // 更新背景（会预加载所有图片）
            this.setBackground(data.pic, true);

            // 更新 URL hash
            window.location.hash = "#" + index;

            // 更新 Open Graph 元数据
            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));

            // 更新播放列表的高亮状态 (优化：使用 .current 类)
            const oldCurrent = document.querySelector('.list-song.current');
            if (oldCurrent) oldCurrent.classList.remove('current');
            const newCurrent = document.querySelector('#list-song-' + index);
            if (newCurrent) newCurrent.classList.add('current');
            playNum = index;

            // 更新歌词显示（加载新歌词）
            this.loadLyric(data.lyric || null);

            // 更新系统媒体会话 (MediaSession API)
            if ('mediaSession' in navigator) this.updateMediaSession(data);

            // 更新音频可视化 (Web Audio API) - 这是节奏条的核心
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw(); // 启动或重启动画循环

        }

        // 调整进度条位置 (保持居中)
        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`;

        // 更新播放/暂停按钮状态
        if (sound.state() === 'loaded') {
            loading.style.display = 'none';
        } else {
            loading.style.display = 'block';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
        }

        // 更新当前播放索引
        this.index = index;
    },

    // 新增：更新歌词显示容器 (优化版)
    updateLyricDisplay: function(currentTime, isSRT) {
        if (!currentLyrics.length || !lyricContainer) return;

        const container = lyricContainer;
        container.innerHTML = ''; // Clear previous content

        let activeIndex = -1;
        let linesToShow = 5; // Show up to 5 lines
        let halfLines = Math.floor(linesToShow / 2);

        // 找到当前时间对应的歌词索引
        for (let i = 0; i < currentLyrics.length; i++) {
            const lyric = currentLyrics[i];
            if (currentTime >= lyric.time && (isSRT ? currentTime < lyric.end : currentTime < lyric.end)) {
                activeIndex = i;
                break;
            }
        }

        if (activeIndex === -1) return; // No active lyric found

        // 计算显示范围
        let startIndex = Math.max(0, activeIndex - halfLines);
        let endIndex = Math.min(currentLyrics.length - 1, activeIndex + halfLines);

        // 动态调整以确保始终显示 linesToShow 行（如果可用）
        if (endIndex - startIndex + 1 < linesToShow) {
           if (startIndex > 0) startIndex = Math.max(0, endIndex - linesToShow + 1);
           else if (endIndex < currentLyrics.length - 1) endIndex = Math.min(currentLyrics.length - 1, startIndex + linesToShow - 1);
        }

        // 创建和显示歌词行
        for (let i = startIndex; i <= endIndex; i++) {
            const lyric = currentLyrics[i];
            if(lyric.text == undefined)continue;
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyric-line';
            if (i === activeIndex) {
                lineDiv.classList.add('active');
            }
            lineDiv.textContent = lyric.text;
            container.appendChild(lineDiv);
        }
    },

    // 更新 MediaSession 元数据
    updateMediaSession: function(data) {
        if (!('mediaSession' in navigator)) return;

        const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic;
        const metadata = { title: data.title, artist: data.artist };
        
        const setMetadata = (artwork = []) => {
            navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork });
        };

        // 设置按钮事件
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev'));
        navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next'));

        // 如果没有封面图片，则直接设置元数据
        if (!coverPic) {
            setMetadata();
            return;
        }

        // 加载并裁剪封面图片
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 512;
            canvas.width = size;
            canvas.height = size;
            
            // 计算裁剪区域 (居中裁剪为正方形)
            const srcSize = Math.min(img.width, img.height);
            const sx = (img.width - srcSize) / 2;
            const sy = (img.height - srcSize) / 2;
            
            // 绘制到 canvas 并导出为 data URL
            ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
            setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]);
        };
        img.onerror = () => {
            console.warn("封面图片加载失败 for mediaSession: " + img.src);
            setMetadata(); // 加载失败也设置元数据（无封面）
        };
        img.src = media + encodeURI(coverPic); // 开始加载图片
    },

    // 背景图片设置与缓存逻辑
    setBackground: function(picData, forceReset = false) {
        // 清除上一个背景的定时器
        if (backgroundInterval) clearInterval(backgroundInterval);

        // 清空当前图片缓存
        currentImageCache = [];

        // 判断是否为多图模式 (数组且长度大于1)
        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;

            // 立即显示第一张图片
            const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = firstImageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1; // 记录当前活动层

            // 在后台预加载所有图片
            picData.forEach(picName => {
                const img = new Image();
                img.src = media + encodeURI(picName);
                currentImageCache.push(img); // 存入缓存数组
            });

            // 启动背景轮播（使用缓存的图片对象）
            this.startBackgroundSlideshow(picData, forceReset);
        } else {
            // 单图模式
            this.isSlideshowRunning = false;
            
            // 获取单张图片名（处理数组或字符串）
            const singlePic = Array.isArray(picData) ? picData[0] : picData;
            
            // 设置背景图
            const imageUrl = `url('${media}${encodeURI(singlePic)}')`;
            bgLayer1.style.backgroundImage = imageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1; // 重置活动层
        }
    },

    // 启动背景轮播逻辑 (使用已缓存的图片)
    startBackgroundSlideshow: function(images, resetIndex = true) {
        // 清除任何已存在的定时器
        if (backgroundInterval) clearInterval(backgroundInterval);
        
        // 根据参数决定是否重置图片索引
        if (resetIndex) currentBgIndex = 0;

        // 确保初始图片已加载并显示
        const initialImage = currentImageCache[currentBgIndex];
        if(initialImage && initialImage.complete) {
            const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`;
            currentActiveLayer.style.opacity = 1;
        }

        // 定义切换图片的函数
        const changeImage = () => {
            // 计算下一张图片索引
            currentBgIndex = (currentBgIndex + 1) % images.length;
            
            // 获取下一张已缓存的图片对象
            const nextImage = currentImageCache[currentBgIndex];
            
            // 如果图片已加载，则进行切换
            if(nextImage && nextImage.complete) {
                // 确定当前层和下一层
                let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
                let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
                
                // 设置下一层的背景图
                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                
                // 执行淡入淡出动画
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                
                // 更新活动层状态
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1;
            }
            // 如果图片未加载完成，本次不切换，等待下次定时器触发
        };
        
        // 启动定时器
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    // 暂停播放
    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        playBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
        // 注意：背景轮播已在 onpause 回调中暂停
    },

    // 跳转到上一首或下一首 (根据播放模式)
    skip: function (direction) {
        let index = this.index;
        
        // 核心逻辑：根据播放模式计算新的索引
        if (this.playbackMode === 'shuffle') {
            // 随机播放模式
            if (this.playlist.length > 1) {
                let newIndex;
                // 确保随机到的不是当前歌曲
                do {
                    newIndex = Math.floor(Math.random() * this.playlist.length);
                } while (newIndex === this.index);
                index = newIndex;
            } else {
                // 如果只有一首歌，随机播放就是它自己
                index = 0;
            }
        } else {
            // 'list' 或 'single' 模式 (单曲循环的 'next' 按钮行为)
            if (direction === 'next') {
                // 下一首：索引减1 (因为列表是倒序的)
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            } else { // direction === 'prev'
                // 上一首：索引加1
                index = (this.index + 1) % this.playlist.length;
            }
        }
        
        // 跳转到计算出的索引
        this.skipTo(index);
    },

    // 跳转到指定索引的歌曲
    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop(); // 停止当前播放的歌曲
        progress.style.width = '0%'; // 重置进度条
        this.play(index); // 开始播放新歌曲
    },

    // 切换播放模式
    toggleMode: function() {
        // 循环切换模式
        if (this.playbackMode === 'list') {
            this.playbackMode = 'shuffle';
        } else if (this.playbackMode === 'shuffle') {
            this.playbackMode = 'single';
        } else { // 'single'
            this.playbackMode = 'list';
        }
        // 更新按钮图标和提示文字
        this.updateModeButton();
    },

    // 更新模式按钮的外观
    updateModeButton: function() {
        if (modeBtn) {
            // 设置对应的 SVG 图标
            modeBtn.style.backgroundImage = `url("${modeIcons[this.playbackMode]}")`;
            // 设置对应的提示文字
            modeBtn.title = modeTitles[this.playbackMode];

            // 更新 body 上的 data-mode 属性，以支持 CSS 样式变化
            document.body.setAttribute('data-mode', this.playbackMode);
        }
    },

    // 音量控制
    volume: function (val) {
        Howler.volume(val);
        let barWidth = (val * 90) / 100;
        barFull.style.width = `${barWidth * 100}%`;
        sliderBtn.style.left = `${window.innerWidth * barWidth + window.innerWidth * 0.05 - 25}px`;
    },

    // 进度条拖动
    seek: function (per) {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) {
            const seekTime = sound.duration() * per;
            sound.seek(seekTime);
            // 拖动后立即更新歌词显示
            const isSRT = this.playlist[this.index].lyric && /\.srt$/i.test(this.playlist[this.index].lyric);
            this.updateLyricDisplay(seekTime, isSRT);
            lastLyricTime = seekTime;
        }
    },

    // 进度条动画更新
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

    // 加载歌词文件
    loadLyric: function (filename) {
        // 清空旧歌词和容器
        currentLyrics = [];
        if (lyricContainer) lyricContainer.innerHTML = '';

        // 如果没有歌词文件名，则返回
        if (!filename) return;

        // 确定歌词文件扩展名
        const ext = filename.toLowerCase().split('.').pop();
        
        // 发起 fetch 请求加载歌词文本
        fetch(media + encodeURI(filename))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                // 根据扩展名解析歌词
                if (ext === 'srt') {
                    currentLyrics = parseSRT(text);
                } else if (ext === 'lrc') {
                    currentLyrics = parseLRC(text);
                } else {
                    // 如果不是已知格式，则作为空数组处理
                    currentLyrics = [];
                }
                
                // 如果解析成功且有歌词内容
                if (currentLyrics.length > 0) {
                    const sound = this.playlist[this.index].howl;
                    const pos = sound ? sound.seek() : 0;
                    this.updateLyricDisplay(pos, ext === 'srt'); // 初始显示第一句歌词
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

    // UI 切换函数
    togglePlaylist: function () {
        let display = (playlist.style.display === 'block') ? 'none' : 'block';
        setTimeout(() => {
            playlist.style.display = display;
            if (display === 'block') {
                // 如果打开播放列表，则滚动到当前播放歌曲的位置
                const currentSongElement = document.querySelector('#list-song-' + this.index);
                if (currentSongElement) {
                    list.scrollTop = currentSongElement.offsetTop - list.offsetHeight / 2;
                }
            }
        }, (display === 'block') ? 0 : 500);
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    togglePost: function () {
        post.style.display = (post.style.display === "none") ? "block" : "none";
    },

    toggleWave: function () {
        waveCanvas.style.display = (waveCanvas.style.display === "none") ? "block" : "none";
    },

    toggleVolume: function () {
        let display = (volume.style.display === 'block') ? 'none' : 'block';
        setTimeout(() => {
            volume.style.display = display;
        }, (display === 'block') ? 0 : 500);
        volume.className = (display === 'block') ? 'fadein' : 'fadeout';
    },

    // 格式化时间 (秒 -> mm:ss)
    formatTime: function (secs) {
        let minutes = Math.floor(secs / 60) || 0;
        let seconds = (secs - minutes * 60) || 0;
        return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
    }
};

// === 事件监听器 (UI交互) ===
// 基础播放控制
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));

// 进度条点击
progressBar.addEventListener('click', (event) => player.seek(event.clientX / window.innerWidth));

// UI 面板开关
playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', () => player.togglePlaylist()); // 点击外部也关闭
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', () => player.toggleVolume()); // 点击外部也关闭

// 播放模式切换
modeBtn.addEventListener('click', () => player.toggleMode());
lyricBtn.addEventListener('click', () => {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

// 音量条控制 (鼠标/触摸)
barEmpty.addEventListener('click', (event) => {
    let rect = barEmpty.getBoundingClientRect();
    let per = (event.clientX - rect.left) / rect.width;
    player.volume(per);
});

// 滑块拖动逻辑
['mousedown', 'touchstart'].forEach(eventType => {
    sliderBtn.addEventListener(eventType, () => window.sliderDown = true);
});
['mouseup', 'touchend'].forEach(eventType => {
    document.addEventListener(eventType, () => window.sliderDown = false);
});

// 音量条拖动事件处理
const handleVolumeDrag = (event) => {
    if (window.sliderDown) {
        let clientX = event.clientX || (event.touches && event.touches[0].clientX);
        if (clientX !== undefined) {
            let barRect = barEmpty.getBoundingClientRect();
            let per = (clientX - barRect.left) / barRect.width;
            per = Math.min(1, Math.max(0, per)); // 限制在 0-1 之间
            player.volume(per);
        }
    }
};
volume.addEventListener('mousemove', handleVolumeDrag);
volume.addEventListener('touchmove', handleVolumeDrag, { passive: true });

// 音频可视化 (Canvas) - 这就是节奏条的绘制逻辑
let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    // 检查 player 和 analyser 是否已准备就绪
    if (!player || !player.analyser) return;

    let W = window.innerWidth, H = window.innerHeight;
    
    // 动态调整 canvas 大小以适应屏幕
    waveCanvas.width = W;
    waveCanvas.height = H;

    // 清除上一帧画面
    canvasCtx.clearRect(0, 0, W, H);

    // 从 analyser 获取当前的频率数据
    player.analyser.getByteFrequencyData(player.dataArray);

    // 设置节奏条颜色
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)'; // 半透明白色

    // 计算每个节奏条的宽度和间距
    const barW = W / player.bufferLength;
    let x = 0;

    // 遍历所有频率数据点并绘制矩形条
    for (let i = 0; i < player.bufferLength; i++) {
        // 高度与频率强度成正比
        let barH = player.dataArray[i] / 2;
        // 绘制矩形：x坐标, y坐标(从底部向上), 宽度, 高度
        canvasCtx.fillRect(x, H - barH, barW, barH);
        // 移动到下一个条形的x位置 (条形宽度 + 1像素间距)
        x += barW + 1;
    }

    // 请求浏览器在下次重绘之前调用 draw 函数，形成动画循环
    requestAnimationFrame(draw);
}

// 键盘快捷键
document.addEventListener('keyup', e => {
    if (!player) return;
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

// 控制台水印
console.log("\n %c Gmemp v3.8.0 (Complete with Visualizer) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
