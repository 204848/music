// ui-manager.js
import { DOMElements } from './dom-elements.js';
import { formatTime } from './utils.js';
import { MEDIA_PATH, MODE_ICONS, MODE_TITLES } from './config.js';

export class UIManager {
    constructor() {
        this.dom = DOMElements;
        this.volumeHideTimeout = null;
    }

    updateTrackInfo(title, artist, date, article) {
        this.dom.track.innerHTML = title;
        this.dom.artist.innerHTML = artist;
        this.dom.post.innerHTML = `<p><b>${date}</b></p>${article}`;
        document.title = `${title} - Gmemp`;
        document.querySelector('meta[property="og:title"]').setAttribute('content', title);
    }

    updateCoverImageMeta(pic) {
        const ogImage = Array.isArray(pic) ? pic[0] : pic;
        document.querySelector('meta[property="og:image"]').setAttribute('content', MEDIA_PATH + encodeURI(ogImage));
    }

    updatePlayPauseButtons(isPlaying) {
        this.dom.playBtn.style.display = isPlaying ? 'none' : 'block';
        this.dom.pauseBtn.style.display = isPlaying ? 'block' : 'none';
        // 确保loading状态不影响按钮显示
        if (this.dom.loading.style.display === 'block') {
            this.dom.playBtn.style.display = 'none';
            this.dom.pauseBtn.style.display = 'none';
        }
    }

    toggleLoading(show) {
        this.dom.loading.style.display = show ? 'block' : 'none';
        if (show) {
            this.dom.playBtn.style.display = 'none';
            this.dom.pauseBtn.style.display = 'none';
        } else {
            const currentSound = window.playerInstance && window.playerInstance.playlist[window.playerInstance.index].howl;
            if (currentSound && currentSound.playing()) {
                this.updatePlayPauseButtons(true);
            } else {
                this.updatePlayPauseButtons(false);
            }
        }
    }

    updateDurationDisplays(duration) {
        if (duration && !isNaN(duration) && isFinite(duration)) {
            const formattedDuration = formatTime(Math.round(duration));
            this.dom.duration.innerHTML = formattedDuration;
            this.dom.durationDisplay.innerHTML = formattedDuration;
        } else {
             this.dom.duration.innerHTML = '0:00';
            this.dom.durationDisplay.innerHTML = '0:00';
        }
    }

    updateProgressBar(seek, duration) {
        const formattedSeek = formatTime(Math.floor(seek));
        this.dom.timer.innerHTML = formattedSeek;
        this.dom.currentTimeDisplay.innerHTML = formattedSeek;

        if (duration && isFinite(duration) && duration > 0) {
            const percent = (seek / duration) * 100;
            this.dom.progressFilled.style.width = percent + '%';
            this.dom.progressSlider.style.left = percent + '%';
        } else {
            this.dom.progressFilled.style.width = '0%';
            this.dom.progressSlider.style.left = '0%';
        }
    }
    
    resetProgressBar() {
        this.dom.progressFilled.style.width = '0%';
        this.dom.progressSlider.style.left = '0%';
        this.dom.currentTimeDisplay.innerHTML = '0:00';
        this.dom.timer.innerHTML = '0:00';
        this.dom.duration.innerHTML = '0:00';
        this.dom.durationDisplay.innerHTML = '0:00';
    }

    buildPlaylist(playlist, skipToFn) {
        this.dom.list.innerHTML = '';
        playlist.forEach((song, index) => {
            let div = document.createElement('div');
            div.className = 'list-song';
            div.id = 'list-song-' + index;
            div.innerHTML = `${song.title} - ${song.artist}`;
            div.onclick = () => { skipToFn(index); };
            this.dom.list.appendChild(div);
        });
        // 当歌单首次构建时，如果歌单是可见的，滚动到当前歌曲
        if (this.dom.playlist.style.display === 'block') {
            const currentTrackIndex = window.playerInstance ? window.playerInstance.index : 0;
            this.scrollPlaylistToActive(currentTrackIndex);
        }
    }

    updateActivePlaylistItem(oldIndex, newIndex) {
        if (oldIndex !== null && this.dom.list.querySelector('#list-song-' + oldIndex)) {
            this.dom.list.querySelector('#list-song-' + oldIndex).style.backgroundColor = '';
        }
        if (this.dom.list.querySelector('#list-song-' + newIndex)) {
            this.dom.list.querySelector('#list-song-' + newIndex).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }
    }
    
    scrollPlaylistToActive(index) {
        const activeItem = this.dom.list.querySelector('#list-song-' + index);
        if (activeItem) {
             this.dom.list.scrollTop = activeItem.offsetTop - this.dom.list.offsetHeight / 2;
        }
    }

    // 重点调整：togglePlaylist，增加滚动功能
    togglePlaylist(show) {
        let display = (show === undefined) ? (this.dom.playlist.style.display === 'block' ? 'none' : 'block') : (show ? 'block' : 'none');
        setTimeout(() => {
            this.dom.playlist.style.display = display;
            if (display === 'block') {
                 // 歌单展开时，滚动到当前播放的歌曲
                const currentTrackIndex = window.playerInstance ? window.playerInstance.index : 0;
                this.scrollPlaylistToActive(currentTrackIndex);
            }
        }, (display === 'block') ? 0 : 500); // fadein/fadeout duration is 0.5s
        this.dom.playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
    }

    togglePost(show) {
        this.dom.post.style.display = (show === undefined) ? (this.dom.post.style.display === "none" ? "block" : "none") : (show ? "block" : "none");
    }

    toggleWave(show) {
        this.dom.waveCanvas.style.display = (show === undefined) ? (this.dom.waveCanvas.style.display === "none" ? "block" : "none") : (show ? "block" : "none");
    }
    
    toggleLyricContainer(show) {
        this.dom.lyricContainer.style.display = (show === undefined) ? (this.dom.lyricContainer.style.display === 'none' || !this.dom.lyricContainer.style.display ? 'block' : 'none') : (show ? 'block' : 'none');
    }

    // 在 UIManager 类中添加
renderAllLyrics(lyrics) {
    this.dom.lyricsWrapper.innerHTML = '';
    this.dom.transBtn.style.display = 'none'; // 1. 先隐藏按钮
    
    if (!lyrics || lyrics.length === 0) {
        this.dom.lyricsWrapper.innerHTML = '<div class="lyric-line active">暂无歌词</div>';
        return;
    }

    let hasTrans = false;
    lyrics.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'lyric-line';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-text';
        textSpan.textContent = line.text;
        lineDiv.appendChild(textSpan);

        // 检查这一行是否有翻译
        if (line.trans && line.trans.trim() !== "") {
            hasTrans = true; // 2. 标记存在翻译
            const transSpan = document.createElement('span');
            transSpan.className = 'lyric-trans';
            transSpan.textContent = line.trans;
            lineDiv.appendChild(transSpan);
        }

        this.dom.lyricsWrapper.appendChild(lineDiv);
    });

    // 3. 如果整首歌有翻译，显示开关按钮
    if (hasTrans) {
        this.dom.transBtn.style.display = 'block'; 
        // 强制设置按钮位置和显示
        this.dom.transBtn.style.visibility = 'visible';
    }
}

toggleTranslation() {
    const isShowing = this.dom.lyricsWrapper.classList.toggle('show-trans');
    
    // 新增：让按钮本身也切换 active 类，配合上面的 CSS 变色
    if (this.dom.transBtn) {
        this.dom.transBtn.classList.toggle('active', isShowing);
    }

    // 重新计算偏移
    const activeLine = this.dom.lyricsWrapper.querySelector('.lyric-line.active');
    if (activeLine) {
        const offset = 150 - activeLine.offsetTop;
        this.dom.lyricsWrapper.style.transform = `translateY(${offset}px)`;
    }
}

    updateModeButton(mode) {
        this.dom.modeBtn.style.backgroundImage = `url("${MODE_ICONS[mode]}")`;
        this.dom.modeBtn.title = MODE_TITLES[mode];
    }

    showVolumePopup() {
        clearTimeout(this.volumeHideTimeout);
        this.dom.volumePopup.classList.add('show');
        this.dom.progressContainer.style.width = '89%';
    }

    hideVolumePopup() {
        this.volumeHideTimeout = setTimeout(() => {
            this.dom.volumePopup.classList.remove('show');
            this.dom.progressContainer.style.width = '100%';
        }, 300);
    }

    updateVolumeDisplay(volume) {
        const percent = Math.round(volume * 100);
        const heightPercent = percent;
        this.dom.volumeBarFilled.style.height = heightPercent + '%';
        this.dom.volumePercentage.textContent = percent + '%';
    }

    calculateVolumeFromPosition(clientY) {
        const rect = this.dom.volumeBarTrack.getBoundingClientRect();
        const position = (rect.bottom - clientY) / rect.height;
        return Math.max(0, Math.min(1, position));
    }
}
