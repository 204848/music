let media = "https://music.1357924680liu.dpdns.org/media/";

// ==========================================================
// == 配置项 ==
// 背景图轮播的切换间隔时间（单位：毫秒）。例如：5000 代表 5 秒
const BACKGROUND_SLIDESHOW_INTERVAL = 5000;
// ==========================================================

// Cache references to DOM elements
let elms = ['track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar', 'waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricBtn', 'lyricContainer', 'modeBtn'];
elms.forEach(function (elm) {
    window[elm] = document.getElementById(elm);
});

const bgLayer1 = document.getElementById('bg-layer1');
const bgLayer2 = document.getElementById('bg-layer2');
// LyricContainer 已经在 elms 数组中被获取，这里就不再重复声明了。

let player;
let playNum = 0;
let requestJson = "memp.json";
let currentLyrics = [];
let lyricDisplayState = { currentIndex: -1 }; // 用于追踪当前显示在页面中的歌词索引
let lyricInterval = null;
let lastLyricTime = -1;

// 背景轮询与缓存相关变量
let backgroundInterval = null;
let currentBgIndex = 0;
let activeBgLayer = 1;
let currentImageCache = [];

// SVG 图标 Data URIs (修复并简化了单曲循环图标)
const modeIcons = {
    list: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3E%3Cpath fill='%23fff' d='M216 24c0-13.3-10.7-24-24-24s-24 10.7-24 24V72c-35.3 0-64 28.7-64 64v16c0 13.3 10.7 24 24 24s24-10.7 24-24V136c0-8.8 7.2-16 16-16s16 7.2 16 16v240c0 8.8-7.2 16-16 16s-16-7.2-16-16V360c0-13.3-10.7-24-24-24s-24 10.7-24 24v16c0 35.3 28.7 64 64 64h16V488c0 13.3 10.7 24 24 24s24-10.7 24-24V440h16c35.3 0 64-28.7 64-64V136c0-35.3-28.7-64-64-64V24zm-48 320v-16c0-8.8 7.2-16 16-16s16 7.2 16 16v16c0 8.8-7.2 16-16 16s-16-7.2-16-16zm112-16v16c0 8.8 7.2 16 16 16s16-7.2 16-16v-16c0-8.8-7.2-16-16-16s-16 7.2-16 16z'/%3E%3C/svg%3E", // 顺序
    shuffle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L182.2 320H224c13.3 0 24 10.7 24 24s-10.7 24-24 24H128c-13.3 0-24-10.7-24-24V320c0-13.3 10.7-24 24-24h45.3L314.7 160H224c-13.3 0-24-10.7-24-24s10.7-24 24-24h160v-32c0-12.9 7.8-24.6 19.8-29.6zM160 352H96v-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416h64c13.3 0 24-10.7 24-24s-10.7-24-24-24z'/%3E%3C/svg%3E", // 随机
    single: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23fff' d='M224 96c0-17.7 14.3-32 32-32s32 14.3 32 32v192h64c17.7 0 32 14.3 32 32s-14.3 32-32 32H224 160c-17.7 0-32-14.3-32-32s14.3-32 32-32h64V96z'/%3E%3Cpath fill='%23fff' d='M160 416c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64zm0-96c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32z'/%3E%3C/svg%3E" // 单曲
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
        let times = [];
        let lastIndex = 0;
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
                result.push({ time: time, text: text, end: Infinity }); // 暂时设为Infinity，之后会更新
            }
        }
    }
    result.sort((a, b) => a.time - b.time);
    // 补充歌词结束时间 (end time)
    for (let i = 0; i < result.length - 1; i++) {
        result[i].end = result[i + 1].time;
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
        if (!/^\d+$/.test(indexLine)) { i++; continue; } // Skip non-index lines
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
        if (text) result.push({ time: start, end: end, text: text }); // For SRT, time is start, end is end
        i++; // Skip empty line
    }
    return result;
}

// Player class
let Player = function (playlist) {
    this.playlist = playlist;
    this.index = playNum;
    this.isSlideshowRunning = false;
    this.playbackMode = 'list'; // 'list', 'shuffle', 'single'

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
    // Initialize mode button display
    this.updateModeButton();
};

Player.prototype = {
    play: function (index) {
        const isNewTrack = (typeof index === 'number' && index !== this.index);
        index = typeof index === 'number' ? index : this.index;
        let data = this.playlist[index];
        let sound;

        // If resuming current track's slideshow
        if (!isNewTrack && this.isSlideshowRunning) {
            this.startBackgroundSlideshow(data.pic, false); // false means don't reset image index
        }

        // Clear previous lyric interval and reset state
        if (lyricInterval) clearInterval(lyricInterval);
        lastLyricTime = -1;
        lyricDisplayState.currentIndex = -1;
        if (lyricContainer) lyricContainer.innerHTML = ''; // Clear lyrics on new play/resume to prevent flicker

        if (data.howl) {
            sound = data.howl;
        } else {
            sound = data.howl = new Howl({
                src: [media + data.mp3], html5: isMobile(),
                onplay: () => {
                    duration.innerHTML = this.formatTime(Math.round(sound.duration()));
                    requestAnimationFrame(this.step.bind(this));
                    progressBar.style.display = 'block'; pauseBtn.style.display = 'block'; playBtn.style.display = 'none'; loading.style.display = 'none';
                    
                    const isSRT = data.lyric && /\.srt$/i.test(data.lyric);
                    lyricInterval = setInterval(() => {
                        const pos = sound.seek();
                        // Only update if time significantly changed
                        if (Math.abs(pos - lastLyricTime) > 0.05) { // Update every 50ms
                            this.updateLyrics(pos, isSRT); 
                            lastLyricTime = pos;
                        }
                    }, 50); 
                },
                onload: () => { loading.style.display = 'none'; progressBar.style.display = 'block'; },
                onend: () => { this.playNextTrack(); },
                onpause: () => { 
                    if (lyricInterval) clearInterval(lyricInterval); 
                    if (backgroundInterval) clearInterval(backgroundInterval);
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
                    this.updateLyrics(pos, isSRT); 
                    lastLyricTime = pos; 
                    requestAnimationFrame(this.step.bind(this)); 
                }
            });
        }
        sound.play();

        // Update UI elements only if it's a new track being played
        if (isNewTrack) {
            track.innerHTML = data.title;
            artist.innerHTML = data.artist;
            document.title = `${data.title} - Gmemp`;
            post.innerHTML = `<p><b>${data.date}</b></p>${data.article}`;
            this.setBackground(data.pic, true); // Force reset background for new track
            window.location.hash = "#" + index;

            const ogImage = Array.isArray(data.pic) ? data.pic[0] : data.pic;
            document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
            document.querySelector('meta[property="og:image"]').setAttribute('content', media + encodeURI(ogImage));
            // Update selected song in playlist UI
            if(document.querySelector('#list-song-' + playNum)) { 
                document.querySelector('#list-song-' + playNum).style.backgroundColor = ''; 
            }
            document.querySelector('#list-song-' + index).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            playNum = index;
            
            this.loadLyric(data.lyric || null); // Load new song's lyric
            if ('mediaSession' in navigator) this.updateMediaSession(data); // Update media controls
            
            // Re-initialize analyser for new sound
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            Howler.masterGain.connect(this.analyser);
            draw();
        }

        progressBar.style.margin = `-${window.innerHeight * 0.3 / 2}px auto`;
        if (sound.state() === 'loaded') { 
            loading.style.display = 'none'; 
        } else { 
            loading.style.display = 'block'; 
            playBtn.style.display = 'none'; 
            pauseBtn.style.display = 'none'; 
        }
        this.index = index;
    },

    // **新增/优化：歌词显示渲染函数**
    updateLyrics: function(time, isSRT) {
        if (!currentLyrics.length || !lyricContainer) {
            lyricContainer.innerHTML = ''; // Clear if no lyrics
            return;
        }
        
        let targetIndex = -1;
        // Find current active lyric line
        for (let i = 0; i < currentLyrics.length; i++) {
            const lyric = currentLyrics[i];
            if (time >= lyric.time && time < lyric.end) {
                targetIndex = i;
                break;
            }
        }
        
        // Only update DOM if the active lyric line has changed
        if (targetIndex !== lyricDisplayState.currentIndex) {
            lyricContainer.innerHTML = ''; // Clear old lines
            
            // Define how many lines to show before and after current
            const linesBefore = 2; // Show 2 lines before current
            const linesAfter = 2;  // Show 2 lines after current
            
            const start = Math.max(0, targetIndex - linesBefore);
            const end = Math.min(currentLyrics.length, targetIndex + linesAfter + 1); // +1 for the current line itself
            
            for (let i = start; i < end; i++) {
                const lyric = currentLyrics[i];
                const lineDiv = document.createElement('div');
                lineDiv.className = 'lyric-line';
                lineDiv.textContent = lyric.text;
                
                // Add classes for styling (active, prev, next, etc.)
                if (i === targetIndex) {
                    lineDiv.classList.add('active');
                } else if (i === targetIndex - 1) {
                    lineDiv.classList.add('prev');
                } else if (i === targetIndex - 2) {
                    lineDiv.classList.add('prev-prev');
                } else if (i === targetIndex + 1) {
                    lineDiv.classList.add('next');
                } else if (i === targetIndex + 2) {
                    lineDiv.classList.add('next-next');
                }
                
                lyricContainer.appendChild(lineDiv);
            }
            
            lyricDisplayState.currentIndex = targetIndex; // Update tracked index
        }
    },

    playNextTrack: function() {
        if (this.playbackMode === 'single') {
            this.skipTo(this.index); // Single loop: play current track again
        } else {
            this.skip('next'); // List or Shuffle: use skip logic for next track
        }
    },
    
    updateMediaSession: function(data) {
        if (!('mediaSession' in navigator)) return;
        const coverPic = Array.isArray(data.pic) ? data.pic[0] : data.pic;
        const metadata = { title: data.title, artist: data.artist };
        
        const setMetadata = (artwork = []) => {
            navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork });
        };

        // Set action handlers once
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.skip('prev'));
        navigator.mediaSession.setActionHandler('nexttrack', () => this.skip('next'));

        if (!coverPic) { // If no cover pic, just set text metadata
            setMetadata();
            return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Required for cross-origin images to be drawn on canvas
        img.onload = () => {
            const canvas = document.createElement('canvas'); 
            const ctx = canvas.getContext('2d');
            const size = 512; 
            canvas.width = size; 
            canvas.height = size;
            const srcSize = Math.min(img.width, img.height);
            const sx = (img.width - srcSize) / 2, sy = (img.height - srcSize) / 2;
            ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
            setMetadata([{ src: canvas.toDataURL('image/jpeg', 0.9), sizes: '512x512', type: 'image/jpeg' }]);
        };
        img.onerror = () => {
            console.warn("封面图片加载失败 for mediaSession: " + img.src);
            setMetadata(); // Set metadata without artwork if image fails to load
        };
        img.src = media + encodeURI(coverPic);
    },
    
    setBackground: function(picData, forceReset = false) {
        if (backgroundInterval) clearInterval(backgroundInterval); // Clear any existing slideshow

        currentImageCache = []; // Clear previous song's image cache

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            
            // Immediately display the first image to avoid delay
            const firstImageUrl = `url('${media}${encodeURI(picData[0])}')`;
            bgLayer1.style.backgroundImage = firstImageUrl;
            bgLayer1.style.opacity = 1; // Make sure bgLayer1 is visible
            bgLayer2.style.opacity = 0; // Make sure bgLayer2 is hidden
            activeBgLayer = 1; // Set active layer to 1 initially

            // Preload all images for the current track
            picData.forEach(picName => {
                const img = new Image();
                img.src = media + encodeURI(picName);
                currentImageCache.push(img); // Store Image objects in cache
            });
            
            // Start the slideshow after initial image is set
            // Passing forceReset ensures index starts from 0 for new tracks
            this.startBackgroundSlideshow(picData, forceReset); 
        } else {
            this.isSlideshowRunning = false;
            // Handle single image background
            const singlePic = Array.isArray(picData) ? picData[0] : picData; // Ensure we get a single string
            const imageUrl = `url('${media}${encodeURI(singlePic)}')`;
            bgLayer1.style.backgroundImage = imageUrl;
            bgLayer1.style.opacity = 1;
            bgLayer2.style.opacity = 0;
            activeBgLayer = 1; // Ensure layer 1 is active for static image
        }
    },
    
    startBackgroundSlideshow: function(images, resetIndex = true) {
        if (backgroundInterval) clearInterval(backgroundInterval); // Clear existing interval

        if (resetIndex) currentBgIndex = 0; // Reset index for new tracks or forced reset

        // Ensure the current active layer displays the correct image
        const initialImage = currentImageCache[currentBgIndex];
        if (initialImage) {
            const currentActiveLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
            currentActiveLayer.style.backgroundImage = `url('${initialImage.src}')`;
            currentActiveLayer.style.opacity = 1;
        }

        const changeImage = () => {
            currentBgIndex = (currentBgIndex + 1) % images.length; // Cycle through images
            const nextImage = currentImageCache[currentBgIndex]; // Get preloaded Image object
            
            if (nextImage) {
                let nextLayer = (activeBgLayer === 1) ? bgLayer2 : bgLayer1;
                let currentLayer = (activeBgLayer === 1) ? bgLayer1 : bgLayer2;
                
                // Set background of the *next* layer and then crossfade
                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0; // Fade out current
                nextLayer.style.opacity = 1; // Fade in next
                activeBgLayer = (activeBgLayer === 1) ? 2 : 1; // Toggle active layer
            }
        };
        
        backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    },

    pause: function () {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.pause();
        // Clear interval so slideshow pauses too
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
                } while (newIndex === this.index); // Ensure it's not the same song
                index = newIndex;
            }
        } else { // 'list' mode (or 'single' for manual skip)
            if (direction === 'next') {
                index = (this.index + 1) % this.playlist.length; // Standard next (wraps around)
            } else { // 'prev'
                index = (this.index - 1 + this.playlist.length) % this.playlist.length; // Standard previous (wraps around)
            }
        }
        this.skipTo(index);
    },

    skipTo: function (index) {
        const sound = this.playlist[this.index].howl;
        if (sound) sound.stop(); // Stop current sound
        progress.style.width = '0%'; // Reset progress bar
        this.play(index); // Play new sound
    },
    
    // Toggle playback mode
    toggleMode: function() {
        if (this.playbackMode === 'list') {
            this.playbackMode = 'shuffle';
        } else if (this.playbackMode === 'shuffle') {
            this.playbackMode = 'single';
        } else { // It's 'single'
            this.playbackMode = 'list';
        }
        this.updateModeButton(); // Update button icon and title
    },
    
    // Update mode button's icon and title
    updateModeButton: function() {
        if (modeBtn) { // Ensure button exists
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
            // Manually update lyrics after seek
            const isSRT = this.playlist[this.index].lyric && /\.srt$/i.test(this.playlist[this.index].lyric);
            this.updateLyrics(sound.seek(), isSRT);
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
        if (!filename) {
            currentLyrics = []; 
            lyricContainer.innerHTML = ''; // Clear display
            lyricDisplayState.currentIndex = -1; // Reset state
            return;
        }
        const ext = filename.toLowerCase().split('.').pop();
        fetch(media + encodeURI(filename))
            .then(r => r.text())
            .then(text => {
                currentLyrics = (ext === 'srt') ? parseSRT(text) : parseLRC(text);
                // After loading new lyrics, update display for current time
                const sound = this.playlist[this.index].howl;
                const pos = sound ? sound.seek() : 0;
                this.updateLyrics(pos, ext === 'srt');
            })
            .catch((error) => {
                console.error("Failed to load or parse lyrics: ", error);
                currentLyrics = []; 
                lyricContainer.innerHTML = '歌词加载失败'; // Show error message
                lyricDisplayState.currentIndex = -1;
            });
    },

    // UI toggle functions
    togglePlaylist: function () { 
        let display = (playlist.style.display === 'block') ? 'none' : 'block'; 
        // Use a timeout to allow fadeout animation before setting display:none
        setTimeout(() => { 
            playlist.style.display = display; 
            if (display === 'block') { 
                // Scroll to current song if playlist is shown
                const currentSongElement = document.querySelector('#list-song-' + playNum);
                if (currentSongElement) {
                    list.scrollTop = currentSongElement.offsetTop - list.offsetHeight / 2; 
                }
            } 
        }, (display === 'block') ? 0 : 500); // 0ms for fadein, 500ms for fadeout
        playlist.className = (display === 'block') ? 'fadein' : 'fadeout'; 
    },
    togglePost: function () { post.style.display = (post.style.display == "none") ? "block" : "none"; },
    toggleWave: function () { waveCanvas.style.display = (waveCanvas.style.display == "none") ? "block" : "none"; },
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

// Event Listeners
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
prevBtn.addEventListener('click', () => player.skip('prev'));
nextBtn.addEventListener('click', () => player.skip('next'));
progressBar.addEventListener('click', (event) => player.seek(event.clientX / window.innerWidth));
playlistBtn.addEventListener('click', () => player.togglePlaylist());
playlist.addEventListener('click', () => player.togglePlaylist()); // Close playlist on click outside
postBtn.addEventListener('click', () => player.togglePost());
waveBtn.addEventListener('click', () => player.toggleWave());
volumeBtn.addEventListener('click', () => player.toggleVolume());
volume.addEventListener('click', () => player.toggleVolume()); // Close volume on click outside
modeBtn.addEventListener('click', () => player.toggleMode());

barEmpty.addEventListener('click', (event) => {
    // Calculate percentage based on the click position within the barEmpty
    let barRect = barEmpty.getBoundingClientRect();
    let per = (event.clientX - barRect.left) / barRect.width;
    player.volume(per);
});
sliderBtn.addEventListener('mousedown', () => window.sliderDown = true);
sliderBtn.addEventListener('touchstart', () => window.sliderDown = true, { passive: true });
volume.addEventListener('mouseup', () => window.sliderDown = false);
volume.addEventListener('touchend', () => window.sliderDown = false);
const move = (event) => {
    if (window.sliderDown) {
        let x = event.clientX || (event.touches ? event.touches[0].clientX : undefined);
        if (typeof x === 'undefined') return; // Exit if no valid clientX
        let barRect = barEmpty.getBoundingClientRect();
        let per = Math.min(1, Math.max(0, (x - barRect.left) / barRect.width));
        player.volume(per);
    }
};
volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move, { passive: true }); // Using passive to avoid blocking scroll

let canvasCtx = waveCanvas.getContext("2d");
function draw() {
    // Ensure player and analyser exist before drawing
    if (!player || !player.analyser) return; 
    let W = window.innerWidth, H = window.innerHeight;
    waveCanvas.width = W; 
    waveCanvas.height = H;
    canvasCtx.clearRect(0, 0, W, H); // Clear canvas

    // Get frequency data and draw bars
    player.analyser.getByteFrequencyData(player.dataArray);
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)'; // Bar color
    const barW = W / player.bufferLength; // Width of each bar
    let x = 0;
    for (let i = 0; i < player.bufferLength; i++) {
        let barH = player.dataArray[i] / 2; // Height of bar (0-128)
        canvasCtx.fillRect(x, H - barH, barW, barH);
        x += barW + 1; // Add 1px gap between bars
    }
    requestAnimationFrame(draw); // Loop drawing
}

// Keyboard shortcuts
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
    else if (e.key === "m" || e.key === "M") { player.toggleMode(); } // Toggle playback mode
});

// Toggle lyric display button
lyricBtn.addEventListener('click', () => {
    lyricContainer.style.display = (lyricContainer.style.display === 'none' || !lyricContainer.style.display) ? 'block' : 'none';
});

console.log("\n %c Gmemp v3.7.0 (Lyric Enhanced & Fully Stable) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
