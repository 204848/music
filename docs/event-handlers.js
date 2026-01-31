// event-handlers.js
import { DOMElements } from './dom-elements.js';
import { updateLyricDisplayAtTime } from './lyric-parser.js';

let isSeekDragging = false;
let isVolumeDragging = false;

export function setupEventListeners(player, uiManager, visualization) {
    const dom = DOMElements;

    window.playerInstance = player;

    // Playback controls
    dom.playBtn.addEventListener('click', () => {
        const currentSound = player.playlist[player.index].howl;
        if (currentSound && currentSound.playing()) {
            player.pause();
        } else {
            player.play();
        }
    });
    dom.pauseBtn.addEventListener('click', () => {
        player.pause();
    });
    dom.prevBtn.addEventListener('click', () => player.skip('prev'));
    dom.nextBtn.addEventListener('click', () => player.skip('next'));

    // Progress bar seeking
    const startSeek = (e) => {
        isSeekDragging = true;
        dom.progressSlider.classList.add('active');
        document.body.style.cursor = 'grabbing';
        window.addEventListener('mousemove', onSeek);
        window.addEventListener('mouseup', endSeek);
        window.addEventListener('touchmove', onSeek, { passive: false });
        window.addEventListener('touchend', endSeek);
        e.preventDefault();
        onSeek(e); // Immediately update position
    };

    const onSeek = (e) => {
        if (!isSeekDragging) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const rect = dom.progressBar.getBoundingClientRect();
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        player.isSeeking = true; // Tell player-core to pause automatic updates

        // Real-time UI update during drag
        const currentSound = player.playlist[player.index].howl;
        const duration = (currentSound && currentSound.duration()) || player.preloadedDurations[player.index] || 0;
        const seekTime = duration * percent;
        uiManager.updateProgressBar(seekTime, duration);
        updateLyricDisplayAtTime(seekTime, player.currentDisplayedLyrics); // Pass currentDisplayedLyrics
    };

    const endSeek = (e) => {
        if (!isSeekDragging) return;
        isSeekDragging = false;
        dom.progressSlider.classList.remove('active');
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onSeek);
        window.removeEventListener('mouseup', endSeek);
        window.removeEventListener('touchmove', onSeek);
        window.removeEventListener('touchend', endSeek);
        
        // Final seek application
        const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        const rect = dom.progressBar.getBoundingClientRect();
        const percent = (clientX - rect.left) / rect.width;
        player.seek(Math.max(0, Math.min(1, percent)));
        player.isSeeking = false; // Allow player-core to resume automatic updates
    };

    dom.progressSlider.addEventListener('mousedown', startSeek);
    dom.progressSlider.addEventListener('touchstart', startSeek, { passive: false });
    dom.progressBar.addEventListener('click', (e) => {
        if (!isSeekDragging) {
            const rect = dom.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            player.seek(Math.max(0, Math.min(1, percent)));
        }
    });

    // Other controls
    dom.playlistBtn.addEventListener('click', () => uiManager.togglePlaylist());
    dom.playlist.addEventListener('click', (e) => {
        if (e.target === dom.playlist) { // Only close if clicking outside list-items
            uiManager.togglePlaylist();
        }
    });
    dom.postBtn.addEventListener('click', () => uiManager.togglePost());
    dom.waveBtn.addEventListener('click', () => {
        uiManager.toggleWave();
        const currentSound = player.playlist[player.index].howl;
        if (currentSound && currentSound.playing()) {
            if (visualization.isVisible()) {
                visualization.setup(window.Howler.masterGain, window.Howler.ctx);
            } else {
                visualization.stop();
            }
        } else {
            visualization.stop(); // Ensure it stops if not playing
        }
    });
    dom.modeBtn.addEventListener('click', () => player.toggleMode());
    dom.lyricBtn.addEventListener('click', () => uiManager.toggleLyricContainer());

    // Volume control events
    dom.volumeBtn.addEventListener('mouseenter', () => uiManager.showVolumePopup());
    dom.volumeBtn.addEventListener('mouseleave', () => uiManager.hideVolumePopup());
    dom.volumePopup.addEventListener('mouseenter', () => uiManager.showVolumePopup());
    dom.volumePopup.addEventListener('mouseleave', () => uiManager.hideVolumePopup());

    const startVolumeDrag = (e) => {
        isVolumeDragging = true;
        document.body.style.cursor = 'grabbing';
        window.addEventListener('mousemove', onVolumeDrag);
        window.addEventListener('mouseup', endVolumeDrag);
        window.addEventListener('touchmove', onVolumeDrag, { passive: false });
        window.addEventListener('touchend', endVolumeDrag);
        e.preventDefault();
        onVolumeDrag(e);
    };

    const onVolumeDrag = (e) => {
        if (!isVolumeDragging) return;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const volume = uiManager.calculateVolumeFromPosition(clientY);
        player.setVolume(volume);
    };

    const endVolumeDrag = () => {
        if (!isVolumeDragging) return;
        isVolumeDragging = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onVolumeDrag);
        window.removeEventListener('mouseup', endVolumeDrag);
        window.removeEventListener('touchmove', onVolumeDrag);
        window.removeEventListener('touchend', endVolumeDrag);
    };

    dom.volumeBarTrack.addEventListener('mousedown', startVolumeDrag);
    dom.volumeBarTrack.addEventListener('touchstart', startVolumeDrag, { passive: false });
    dom.volumeBarTrack.addEventListener('click', (e) => {
        if (!isVolumeDragging) {
            const volume = uiManager.calculateVolumeFromPosition(e.clientY);
            player.setVolume(volume);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => { // Changed to keydown for faster response on seek
        if (!player) return;
        const currentSound = player.playlist[player.index].howl;

        if (e.key === ' ' || e.key === "MediaPlayPause") {
            e.preventDefault(); // Prevent spacebar from scrolling the page
            if (currentSound && currentSound.playing()) {
                player.pause();
            } else {
                player.play();
            }
        } else if (e.key === "ArrowRight") { // 右方向键快进
            e.preventDefault();
            player.seekBy(3); // 快进 3 秒
        } else if (e.key === "ArrowLeft") { // 左方向键快退
            e.preventDefault();
            player.seekBy(-3); // 快退 3 秒
        } else if (e.key === "<" || e.key === ",") { // < 切换上一首
            e.preventDefault();
            player.skip('prev');
        } else if (e.key === ">" || e.key === ".") { // > 切换下一首
            e.preventDefault();
            player.skip('next');
        } else if (e.key === "l" || e.key === "L") {
            uiManager.togglePlaylist();
        } else if (e.key === "p" || e.key === "P") {
            uiManager.togglePost();
        } else if (e.key === "w" || e.key === "W") {
            dom.waveBtn.click();
        } else if (e.key === "v" || e.key === "V") {
            uiManager.showVolumePopup();
        }
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        visualization.stop();
        player.backgroundManager.stopSlideshow();
        stopLyricInterval();
    });

    // Handle console errors
    window.addEventListener('error', (e) => {
        if (e.message && e.message.includes('Unchecked runtime.lastError')) {
            return;
        }
        console.error('An error occurred:', e.error);
    });
}
