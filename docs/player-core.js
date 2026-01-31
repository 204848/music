// player-core.js
// Howl and Howler are accessed globally via window.Howl and window.Howler

import { UIManager } from './ui-manager.js';
import { BackgroundManager } from './background-manager.js';
import { Visualization } from './visualization.js';
import { isMobile } from './utils.js';
// 导入歌词解析和控制函数，但歌词数据本身由Player管理
import { loadAndParseLyricFile, startLyricInterval, stopLyricInterval, updateLyricDisplayAtTime } from './lyric-parser.js';
import { MEDIA_PATH } from './config.js';

export class Player {
    constructor(playlistData, uiManager, backgroundManager, visualization) {
        this.playlist = playlistData;
        this.uiManager = uiManager;
        this.backgroundManager = backgroundManager;
        this.visualization = visualization;
        
        this.index = this._getInitialTrackIndex();
        this.playbackMode = 'list'; // 'list', 'shuffle', 'single'

        this.isSeeking = false;
        this.pendingSeekPercent = null;
        this.preloadedDurations = {}; // Cache for preloaded durations
        this.preloadedLyrics = {}; // Cache for preloaded lyrics (key: trackIndex, value: parsedLyricsArray)
        this.currentDisplayedLyrics = []; // Hold the lyrics array currently being displayed
        this._retryCounts = {}; // Track retry counts for each track

        // Initialize UI with first track data
        const initialTrack = this.playlist[this.index];
        this.uiManager.updateTrackInfo(initialTrack.title, initialTrack.artist, initialTrack.date, initialTrack.article);
        this.uiManager.updateCoverImageMeta(initialTrack.pic);
        this.backgroundManager.setBackground(initialTrack.pic, true); // Initial background setup
        this.uiManager.buildPlaylist(this.playlist, (idx) => this.skipTo(idx));
        this.uiManager.updateActivePlaylistItem(null, this.index);
        this.uiManager.updateModeButton(this.playbackMode);
        this.uiManager.updateVolumeDisplay(window.Howler.volume()); // Access Howler globally
        this.uiManager.updatePlayPauseButtons(false); // 默认显示播放按钮

        // Howler AudioContext 自动解锁配置
        window.Howler.autoUnlock = true;
        
        // 预加载当前歌曲（但不自动播放）
        this._preloadTrack(this.index);
        this._preloadNeighbors(this.index); // 预加载相邻歌曲
    }

    _getInitialTrackIndex() {
        let playNum = 0;
        if (window.location.hash !== '') {
            try {
                const hashIndex = parseInt(window.location.hash.slice(1));
                if (!isNaN(hashIndex) && hashIndex >= 0 && hashIndex < this.playlist.length) {
                    playNum = hashIndex;
                }
            } catch {
                // Fallback to default if hash is invalid
            }
        }
        return playNum;
    }

    // 更新：_loadTrackLyrics 不再是直接加载和设置全局歌词，而是缓存歌词数据
    async _loadTrackLyrics(lyricFilename, trackIndex) {
        if (this.preloadedLyrics[trackIndex]) {
            return this.preloadedLyrics[trackIndex]; // Already cached
        }
        const currentPlayTime = this.playlist[trackIndex].howl ? this.playlist[trackIndex].howl.seek() : 0;
        
        const parsedLyrics = await loadAndParseLyricFile(MEDIA_PATH + lyricFilename, currentPlayTime);
        this.preloadedLyrics[trackIndex] = parsedLyrics;
        return parsedLyrics;
    }

    _preloadTrack(index) {
        const data = this.playlist[index];
        if (data.howl && data.howl.state() !== 'unloaded') {
            // Already loaded or loading
            this._preloadDuration(data, index); // Still update duration displays
            this._loadTrackLyrics(data.lyric, index); // Ensure lyrics are cached
            return;
        }

        // Initialize retry count for this track
        this._retryCounts[index] = this._retryCounts[index] || 0;

        // Create Howl instance for preloading
        data.howl = new window.Howl({
            src: [MEDIA_PATH + data.mp3], html5: isMobile(), preload: true,
            onplay: () => {
                this.uiManager.updatePlayPauseButtons(true);
                this.uiManager.toggleLoading(false);
                // 使用当前播放歌曲的歌词进行更新
                startLyricInterval(() => data.howl.seek(), () => this.currentDisplayedLyrics);
                if (this.visualization.isVisible()) {
                    this.visualization.setup(window.Howler.masterGain, window.Howler.ctx);
                }
                this.backgroundManager.startSlideshow(data.pic);
                requestAnimationFrame(this._step.bind(this));
            },
            onload: () => {
                this._preloadDuration(data, index); // Update duration after load
                console.log(`Track loaded: ${data.title}`);
                if (this._pendingPlayPromise) {
                    this._pendingPlayPromise.resolve();
                    this._pendingPlayPromise = null;
                }
                if (!window.Howler._audioUnlocked && window.Howler.ctx) {
                    window.Howler._unlockAudio();
                }
                // Reset retry count on successful load
                this._retryCounts[index] = 0;
            },
            onend: () => { this.playNextTrack(); },
            onpause: () => { 
                stopLyricInterval(); 
                if (this.visualization.isVisible()) this.visualization.stop();
                this.backgroundManager.stopSlideshow();
            },
            onstop: () => { 
                stopLyricInterval(); 
                if (this.visualization.isVisible()) this.visualization.stop();
                this.backgroundManager.stopSlideshow();
            },
            onseek: () => { 
                this.isSeeking = false;
                const pos = data.howl.seek();
                this.uiManager.updateProgressBar(pos, data.howl.duration());
                // 使用当前播放歌曲的歌词进行更新
                updateLyricDisplayAtTime(pos, this.currentDisplayedLyrics); 
                requestAnimationFrame(this._step.bind(this)); 
            },
            onloaderror: (id, error) => {
                console.error(`Error loading track ${data.title} (ID: ${id}):`, error);

                // Check for decoding error specifically, and retry once
                if (error === 'Decoding audio data failed' && this._retryCounts[index] < 1) {
                    this._retryCounts[index]++;
                    console.warn(`Retrying load for track ${data.title} (Retry ${this._retryCounts[index]})`);
                    // Unload and then re-preload/load
                    data.howl.unload();
                    delete data.howl; // Remove the failed howl instance
                    // Schedule a re-load. If a play was pending, it will retry
                    if (this._pendingPlayPromise) {
                        this._preloadTrack(index); // This will create a new Howl and its promises
                    } else {
                        // If no pending play, just preload for next time
                        this._preloadTrack(index);
                    }
                    return; // Exit here, let the retry handle it
                }
                
                // If retry failed or it's not a decoding error, proceed to error handling
                if (this._pendingPlayPromise) {
                    this._pendingPlayPromise.reject(new Error("Audio load failed"));
                    this._pendingPlayPromise = null;
                }
                this.uiManager.toggleLoading(false);
                this.uiManager.updatePlayPauseButtons(false); // show play button on error
                // On persistent error, skip to next track
                console.error(`Failed to load track ${data.title} after retry. Skipping.`);
                this.playNextTrack();
            }
        });
        this._preloadDuration(data, index); // Display cached/estimated duration if available
        this._loadTrackLyrics(data.lyric, index); // Ensure lyrics are cached
    }

    _preloadDuration(data, index) {
        if (this.preloadedDurations[index]) {
            this.uiManager.updateDurationDisplays(this.preloadedDurations[index]);
            return;
        }

        if (data.howl && data.howl.state() === 'loaded') {
            setTimeout(() => {
                if (data.howl.duration()) {
                    const duration = data.howl.duration();
                    this.preloadedDurations[index] = duration;
                    this.uiManager.updateDurationDisplays(duration);
                }
            }, 100);
        }
    }

    _preloadNeighbors(currentIndex) {
        const nextIndex = (currentIndex + 1) % this.playlist.length;
        if (nextIndex !== currentIndex) {
            this._preloadTrack(nextIndex);
        }

        const prevIndex = (currentIndex - 1 + this.playlist.length) % this.playlist.length;
        if (prevIndex !== currentIndex && prevIndex !== nextIndex) {
            this._preloadTrack(prevIndex);
        }
        
        this._unloadDistantTracks(currentIndex, nextIndex, prevIndex);
    }

    _unloadDistantTracks(currentIndex, nextIndex, prevIndex) {
        for (let i = 0; i < this.playlist.length; i++) {
            if (i !== currentIndex && i !== nextIndex && i !== prevIndex) {
                const trackData = this.playlist[i];
                if (trackData.howl && trackData.howl.state() !== 'unloaded') {
                    console.log(`Unloading distant track: ${trackData.title}`);
                    trackData.howl.unload();
                    delete trackData.howl; // Clear the howl instance
                    // Also remove from preloaded caches if unloaded
                    delete this.preloadedDurations[i];
                    delete this.preloadedLyrics[i];
                }
            }
        }
    }


    async play(index) {
        const oldIndex = this.index;
        const isNewTrack = (typeof index === 'number' && index !== oldIndex);
        index = typeof index === 'number' ? index : oldIndex;
        let data = this.playlist[index];
        let sound = data.howl;

        if (isNewTrack) {
            this.uiManager.resetProgressBar();
            stopLyricInterval();
            this.pendingSeekPercent = null;
            if (this.playlist[oldIndex].howl) {
                this.playlist[oldIndex].howl.stop();
            }
        }
        
        // 优化：只有当图片列表实际变化时才更新背景
        if (isNewTrack || JSON.stringify(data.pic) !== JSON.stringify(this.currentBgPicData)) {
            this.backgroundManager.setBackground(data.pic);
            this.currentBgPicData = data.pic; // 记录当前背景图片数据
        }

        if (!sound || sound.state() === 'unloaded') {
            this._preloadTrack(index);
            sound = data.howl;
        }
        
        if (isNewTrack) {
            this.uiManager.updateTrackInfo(data.title, data.artist, data.date, data.article);
            this.uiManager.updateCoverImageMeta(data.pic);
            window.location.hash = "#" + index;
            this.uiManager.updateActivePlaylistItem(oldIndex, index);
            this.uiManager.scrollPlaylistToActive(index);
            await this._loadTrackLyrics(data.lyric, index); // 确保歌词已加载到缓存
            this.currentDisplayedLyrics = this.preloadedLyrics[index]; // 设置当前显示歌词
            updateLyricDisplayAtTime(sound.seek() || 0, this.currentDisplayedLyrics); // 立即更新歌词显示
            this._updateMediaSession(data);
        } else {
            // 如果是同一首歌的再次播放（比如暂停后播放），确保歌词状态正确
            this.currentDisplayedLyrics = this.preloadedLyrics[index];
            updateLyricDisplayAtTime(sound.seek() || 0, this.currentDisplayedLyrics);
        }

        this.index = index;

        if (sound.state() === 'loading' || sound.state() === 'unloaded') {
            this.uiManager.toggleLoading(true);
            this.uiManager.updatePlayPauseButtons(false);
            await new Promise((resolve, reject) => {
                this._pendingPlayPromise = { resolve, reject };
                sound.once('load', () => resolve());
                sound.once('loaderror', (id, error) => reject(error));
                if (sound.state() === 'unloaded') sound.load();
            }).catch(error => {
                console.error("Failed to play due to load error:", error);
                this.uiManager.toggleLoading(false);
                this.uiManager.updatePlayPauseButtons(false);
                return;
            });
            this.uiManager.toggleLoading(false);
        }
        
        if (sound.state() === 'loaded') {
            if (!sound.playing()) {
                sound.play();
            }
            this._preloadNeighbors(this.index);
        }
    }

    pause() {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) {
            sound.pause();
            this.uiManager.updatePlayPauseButtons(false);
            this.backgroundManager.stopSlideshow();
            if (this.visualization.isVisible()) {
                this.visualization.stop();
            }
        }
    }

    // 增加一个 seekBy 方法，用于按秒数调整进度
    seekBy(seconds) {
        const sound = this.playlist[this.index].howl;
        if (sound && (sound.state() === 'loaded' || sound.playing())) {
            let currentSeek = sound.seek() || 0;
            let newSeek = currentSeek + seconds;
            let duration = sound.duration();
            newSeek = Math.max(0, Math.min(newSeek, duration)); // Clamp between 0 and duration
            this.seek(newSeek / duration); // Convert to percentage and use existing seek method
        }
    }

    skip(direction) {
        const currentSound = this.playlist[this.index].howl;
        if (currentSound) currentSound.stop();

        let index = this.index;
        if (this.playbackMode === 'shuffle') {
            if (this.playlist.length > 1) {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * this.playlist.length);
                } while (newIndex === this.index);
                index = newIndex;
            }
        } else {
            if (direction === 'next') {
                index = (this.index + 1) % this.playlist.length;
            } else {
                index = (this.index - 1 + this.playlist.length) % this.playlist.length;
            }
        }
        this.skipTo(index);
    }

    skipTo(index) {
        this.play(index);
    }

    toggleMode() {
        if (this.playbackMode === 'list') this.playbackMode = 'shuffle';
        else if (this.playbackMode === 'shuffle') this.playbackMode = 'single';
        else this.playbackMode = 'list';
        this.uiManager.updateModeButton(this.playbackMode);
    }

    seek(percent) {
        this.isSeeking = true;
        const sound = this.playlist[this.index].howl;
        const currentIndex = this.index;
        const cachedDuration = this.preloadedDurations[currentIndex];

        if (sound) {
            if (sound.state() === 'loaded' || sound.state() === 'loading' || sound.playing()) {
                const duration = sound.duration();
                sound.seek(duration * percent); 
            } else {
                this.pendingSeekPercent = percent;
                if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                    const seekTime = cachedDuration * percent;
                    this.uiManager.updateProgressBar(seekTime, cachedDuration);
                    updateLyricDisplayAtTime(seekTime, this.currentDisplayedLyrics);
                }
            }
        } else {
            this.pendingSeekPercent = percent;
            if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                const seekTime = cachedDuration * percent;
                this.uiManager.updateProgressBar(seekTime, cachedDuration);
                updateLyricDisplayAtTime(seekTime, this.currentDisplayedLyrics);
            }
        }
    }

    setVolume(volume) {
        window.Howler.volume(volume);
        this.uiManager.updateVolumeDisplay(volume);
    }

    _step() {
        const sound = this.playlist[this.index].howl;
        if (!sound || this.isSeeking) return; 
        
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        this.uiManager.updateProgressBar(seek, durationVal);

        if (sound.playing()) {
            requestAnimationFrame(this._step.bind(this));
        }
    }

    playNextTrack() {
        const currentSound = this.playlist[this.index].howl;
        if (currentSound) currentSound.stop();

        if (this.playbackMode === 'single') {
            this.skipTo(this.index);
        } else {
            this.skip('next');
        }
    }

    _updateMediaSession(data) {
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
        img.src = MEDIA_PATH + encodeURI(coverPic);
    }
}
