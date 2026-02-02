// dom-elements.js
// Cache references to DOM elements
const elms = [
    'track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn',
    'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn',
    'waveCanvas', 'loading', 'playlist', 'list', 'lyricBtn', 'lyricContainer',
    'modeBtn', 'transBtn' // 添加这个
];

export const DOMElements = {};
elms.forEach(function (elm) {
    DOMElements[elm] = document.getElementById(elm);
});

// New progress bar elements
DOMElements.progressContainer = document.getElementById('progress-container');
DOMElements.progressBar = document.getElementById('progress-bar');
DOMElements.progressFilled = document.getElementById('progress-filled');
DOMElements.progressSlider = document.getElementById('progress-slider');
DOMElements.currentTimeDisplay = document.getElementById('progress-current-time');
DOMElements.durationDisplay = document.getElementById('progress-duration');

// Volume control elements
DOMElements.volumePopup = document.getElementById('volume-popup');
DOMElements.volumeBarTrack = document.getElementById('volume-bar-track');
DOMElements.volumeBarFilled = document.getElementById('volume-bar-filled');
DOMElements.volumePercentage = document.getElementById('volume-percentage');

// Background layers
DOMElements.bgLayer1 = document.getElementById('bg-layer1');
DOMElements.bgLayer2 = document.getElementById('bg-layer2');

// Lyrics wrapper
DOMElements.lyricsWrapper = document.getElementById('lyrics-wrapper');
