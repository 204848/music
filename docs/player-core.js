// player-core.js
// Removed: import { Howl, Howler } from './howler.min.js';
// Howl and Howler are now accessed globally via window.Howl and window.Howler

import { UIManager } from './ui-manager.js';
import { BackgroundManager } from './background-manager.js';
import { Visualization } from './visualization.js';
import { isMobile } from './utils.js';
import { loadAndParseLyric, startLyricInterval, stopLyricInterval, updateLyricDisplayAtTime } from './lyric-parser.js';
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
        this.preloadedLyrics = {}; // Cache for preloaded lyrics

        // Initialize UI with first track data
        const initialTrack = this.playlist[this.index];
        this.uiManager.updateTrackInfo(initialTrack.title, initialTrack.artist, initialTrack.date, initialTrack.article);
        this.uiManager.updateCoverImageMeta(initialTrack.pic);
        this.backgroundManager.setBackground(initialTrack.pic, true);
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

    _loadTrackLyrics(lyricFilename, trackIndex) {
        loadAndParseLyric(
            MEDIA_PATH + lyricFilename, // Prepend MEDIA_PATH
            trackIndex,
            (idx, lyrics) => {
                this.preloadedLyrics[idx] = lyrics;
            },
            // 如果歌曲正在播放，传入当前时间，否则传入0
            this.playlist[trackIndex].howl ? this.playlist[trackIndex].howl.seek() : 0
        );
    }

    _preloadTrack(index) {
        const data = this.playlist[index];
        if (data.howl && data.howl.state() !== 'unloaded') {
            // Already loaded or loading
            this._preloadDuration(data, index); // Still update duration displays
            return;
        }

        // Create Howl instance for preloading
        data.howl = new window.Howl({
            src: [MEDIA_PATH + data.mp3], html5: isMobile(), preload: true,
            onplay: () => {
                // This onplay should ideally not be triggered during pure preloading,
                // but if it is, ensure proper UI updates.
                this.uiManager.updatePlayPauseButtons(true);
                this.uiManager.toggleLoading(false);
                startLyricInterval(() => data.howl.seek());
                if (this.visualization.isVisible()) {
                    this.visualization.setup(window.Howler.masterGain, window.Howler.ctx);
                }
                this.backgroundManager.startSlideshow(data.pic);
                requestAnimationFrame(this._step.bind(this));
            },
            onload: () => {
                this._preloadDuration(data, index); // Update duration after load
                console.log(`Track loaded: ${data.title}`);
                // If a pending play was waiting for this load, trigger it
                if (this._pendingPlayPromise) {
                    this._pendingPlayPromise.resolve();
                    this._pendingPlayPromise = null;
                }
                // Handle howler unlock event if it's the first user gesture
                if (!window.Howler._audioUnlocked && window.Howler.ctx) {
                    window.Howler._unlockAudio();
                }
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
                updateLyricDisplayAtTime(pos);
                requestAnimationFrame(this._step.bind(this)); 
            },
            onloaderror: (id, error) => {
                console.error(`Error loading track ${data.title} (ID: ${id}):`, error);
                // In case of load error during preload, clear pending play if any
                if (this._pendingPlayPromise) {
                    this._pendingPlayPromise.reject(new Error("Audio load failed"));
                    this._pendingPlayPromise = null;
                }
                this.uiManager.toggleLoading(false);
                this.uiManager.updatePlayPauseButtons(false); // show play button on error
                // Optionally skip on load error
                // this.playNextTrack();
            }
        });
        this._preloadDuration(data, index); // Display cached/estimated duration if available
        this._loadTrackLyrics(data.lyric, index);
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
        } else if (data.howl) {
            // Already a Howl instance exists, but not loaded yet.
            // Wait for its onload to update duration.
        } else {
            // Should not happen if _preloadTrack is always called first.
        }
    }

    _preloadNeighbors(currentIndex) {
        // Preload next track
        const nextIndex = (currentIndex + 1) % this.playlist.length;
        if (nextIndex !== currentIndex) { // Avoid preloading same track if only one exists
            this._preloadTrack(nextIndex);
        }

        // Preload previous track
        const prevIndex = (currentIndex - 1 + this.playlist.length) % this.playlist.length;
        if (prevIndex !== currentIndex && prevIndex !== nextIndex) { // Avoid duplicates
            this._preloadTrack(prevIndex);
        }
        
        // Optionally unload distant tracks to save memory, e.g., anything not current, next, or previous
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

        // Reset UI elements for a new track
        if (isNewTrack) {
            this.uiManager.resetProgressBar();
            stopLyricInterval(); // Stop old lyric interval
            this.pendingSeekPercent = null;
            // Stop current playing sound if new track
            if (this.playlist[oldIndex].howl) {
                this.playlist[oldIndex].howl.stop();
            }
        }
        
        // Background logic
        if (isNewTrack) {
            this.backgroundManager.setBackground(data.pic, true);
        }

        // If sound not yet initialized (first time _preloadTrack wasn't called or Howl was unloaded)
        if (!sound || sound.state() === 'unloaded') {
            this._preloadTrack(index); // This will create the Howl instance
            sound = data.howl; // Get the newly created instance
        }
        
        // Update UI immediately for new track (before play might even start)
        if (isNewTrack) {
            this.uiManager.updateTrackInfo(data.title, data.artist, data.date, data.article);
            this.uiManager.updateCoverImageMeta(data.pic);
            window.location.hash = "#" + index;
            this.uiManager.updateActivePlaylistItem(oldIndex, index);
            this.uiManager.scrollPlaylistToActive(index);
            this._loadTrackLyrics(data.lyric, index);
            this._updateMediaSession(data);
        }

        this.index = index; // Set current index

        // Handle loading state
        if (sound.state() === 'loading') {
            this.uiManager.toggleLoading(true);
            this.uiManager.updatePlayPauseButtons(false); // Still show play button (or no button)
            // Create a promise that resolves when the sound is loaded
            await new Promise((resolve, reject) => {
                this._pendingPlayPromise = { resolve, reject }; // Store to resolve in onload
                sound.once('load', () => resolve());
                sound.once('loaderror', (id, error) => reject(error));
            }).catch(error => {
                console.error("Failed to play due to load error:", error);
                this.uiManager.toggleLoading(false);
                this.uiManager.updatePlayPauseButtons(false);
                return; // Stop execution if loading failed
            });
            this.uiManager.toggleLoading(false); // Hide loading after load
        } else if (sound.state() === 'unloaded') {
             // Should ideally not reach here if _preloadTrack is called, but as a fallback
            this.uiManager.toggleLoading(true);
            this.uiManager.updatePlayPauseButtons(false);
            await new Promise((resolve, reject) => {
                this._pendingPlayPromise = { resolve, reject };
                sound.once('load', () => resolve());
                sound.once('loaderror', (id, error) => reject(error));
                sound.load(); // Explicitly load if unloaded and not loading
            }).catch(error => {
                console.error("Failed to play due to load error:", error);
                this.uiManager.toggleLoading(false);
                this.uiManager.updatePlayPauseButtons(false);
                return;
            });
            this.uiManager.toggleLoading(false);
        }
        
        // Now sound should be 'loaded'
        if (sound.state() === 'loaded') {
            if (!sound.playing()) {
                sound.play();
            }
            // If already playing, onplay will handle UI updates.
            // If just loaded and then played, onplay will also trigger.
            this._preloadNeighbors(this.index); // 播放后预加载相邻歌曲
        }
        // UI updates handled by onplay/onload callbacks.
    }

    pause() {
        const sound = this.playlist[this.index].howl;
        if (sound && sound.playing()) { // Only pause if actually playing
            sound.pause();
            this.uiManager.updatePlayPauseButtons(false);
            this.backgroundManager.stopSlideshow();
            if (this.visualization.isVisible()) {
                this.visualization.stop();
            }
        }
    }

    skip(direction) {
        // Stop current track before skipping
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
        // The play method itself will handle stopping the old track
        this.play(index);
    }

    toggleMode() {
        if (this.playbackMode === 'list') this.playbackMode = 'shuffle';
        else if (this.playbackMode === 'shuffle') this.playbackMode = 'single';
        else this.playbackMode = 'list';
        this.uiManager.updateModeButton(this.playbackMode);
    }

    seek(percent) {
        this.isSeeking = true; // Set seeking flag
        const sound = this.playlist[this.index].howl;
        const currentIndex = this.index;
        const cachedDuration = this.preloadedDurations[currentIndex];

        if (sound) {
            if (sound.state() === 'loaded' || sound.state() === 'loading' || sound.playing()) {
                const duration = sound.duration();
                // Howler's seek works even if paused or loading for loaded sounds
                sound.seek(duration * percent); 
                // UI update will be handled by onseek callback or step for playing sounds
            } else {
                // If not loaded yet, save seek position to apply on load/play
                this.pendingSeekPercent = percent;
                // Update UI based on cached duration for immediate feedback
                if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                    const seekTime = cachedDuration * percent;
                    this.uiManager.updateProgressBar(seekTime, cachedDuration);
                    updateLyricDisplayAtTime(seekTime);
                }
            }
        } else {
            // No sound object yet (should be caught by _preloadTrack, but fallback)
            this.pendingSeekPercent = percent;
            if (cachedDuration && !isNaN(cachedDuration) && isFinite(cachedDuration)) {
                const seekTime = cachedDuration * percent;
                this.uiManager.updateProgressBar(seekTime, cachedDuration);
                updateLyricDisplayAtTime(seekTime);
            }
        }
    }

    setVolume(volume) {
        window.Howler.volume(volume); // Access Howler globally
        this.uiManager.updateVolumeDisplay(volume);
    }

    _step() {
        const sound = this.playlist[this.index].howl;
        // Don't update during manual seek, or if sound is null/undefined
        if (!sound || this.isSeeking) return; 
        
        let seek = sound.seek() || 0;
        let durationVal = sound.duration();
        this.uiManager.updateProgressBar(seek, durationVal);

        if (sound.playing()) {
            requestAnimationFrame(this._step.bind(this));
        }
    }

    playNextTrack() {
        // Ensure the current sound is properly stopped before switching
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
