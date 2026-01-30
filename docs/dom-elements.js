// dom-elements.js
// Cache references to DOM elements
const elms = [
    'track', 'artist', 'timer', 'duration', 'post', 'playBtn', 'pauseBtn',
    'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn',
    'waveCanvas', 'loading', 'playlist', 'list', 'lyricBtn', 'lyricContainer',
    'modeBtn'
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

// Lyric lines
DOMElements.lyricLines = {
    prev2: document.querySelector('.lyric-line.prev-line-2'),
    prev1: document.querySelector('.lyric-line.prev-line-1'),
    current: document.querySelector('.lyric-line.current-line'),
    next1: document.querySelector('.lyric-line.next-line-1'),
    next2: document.querySelector('.lyric-line.next-line-2')
};
