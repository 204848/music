// lyric-parser.js
import { DOMElements } from './dom-elements.js';

let currentLyrics = [];
let lyricInterval = null;
let lastLyricIndex = -1; // 用于跟踪当前歌词索引

export async function loadAndParseLyric(filename, trackIndex, onLyricLoaded, currentTime = 0) {
    if (!filename) {
        currentLyrics = [];
        updateLyricDisplay([], -1); // 清空歌词显示
        onLyricLoaded(trackIndex, []);
        return;
    }

    const ext = filename.toLowerCase().split('.').pop();
    try {
        // 假设歌词文件与 HTML 文件在同一目录或可通过相对路径访问
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const parsedLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
        currentLyrics = parsedLyrics;
        
        // Initial update
        const currentIndexInLyrics = getCurrentLyricIndex(currentTime, parsedLyrics);
        updateLyricDisplay(parsedLyrics, currentIndexInLyrics);
        lastLyricIndex = currentIndexInLyrics;
        
        onLyricLoaded(trackIndex, parsedLyrics);
        return parsedLyrics;
    } catch (error) {
        console.error(`Failed to load or parse lyric file: ${filename}`, error);
        currentLyrics = [];
        updateLyricDisplay([], -1); // 清空歌词显示
        onLyricLoaded(trackIndex, []);
        return [];
    }
}

export function startLyricInterval(getCurrentTimeFn) {
    if (lyricInterval) clearInterval(lyricInterval);
    lyricInterval = setInterval(() => {
        const pos = getCurrentTimeFn();
        const currentIndex = getCurrentLyricIndex(pos, currentLyrics);
        if (currentIndex !== lastLyricIndex) {
            updateLyricDisplay(currentLyrics, currentIndex);
            lastLyricIndex = currentIndex;
        }
    }, 80); // Update frequency
}

export function stopLyricInterval() {
    if (lyricInterval) clearInterval(lyricInterval);
}

export function updateLyricDisplayAtTime(time) {
    const currentIndexInLyrics = getCurrentLyricIndex(time, currentLyrics);
    updateLyricDisplay(currentLyrics, currentIndexInLyrics);
    lastLyricIndex = currentIndexInLyrics;
}

// Internal functions for parsing and updating display
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
        const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
        const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
            if (text) text += '<br>';
            text += lines[i].trim();
            i++;
        }
        if (text) result.push({ time: start, end, text });
        // The original SRT parsing in Howler.js example did not handle the blank line explicitly,
        // but skipping it here makes sense for typical SRT format.
        // Ensure to advance past the blank line before next subtitle entry
        while (i < lines.length && lines[i].trim() === '') {
            i++;
        }
    }
    return result;
}

function getCurrentLyricIndex(time, lyrics) {
    if (!lyrics || lyrics.length === 0) return -1;
    if (time < lyrics[0].time) return 0;

    let left = 0;
    let right = lyrics.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (lyrics[mid].time <= time) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    if (result >= 0 && time < (lyrics[result].end || Infinity)) {
        return result;
    }
    return Math.max(0, result);
}

function updateLyricDisplay(lyrics, currentIndex) {
    const lyricLines = DOMElements.lyricLines;

    if (!lyrics || lyrics.length === 0) {
        lyricLines.prev2.textContent = '';
        lyricLines.prev1.textContent = '';
        lyricLines.current.textContent = '暂无歌词';
        lyricLines.next1.textContent = '';
        lyricLines.next2.textContent = '';
        return;
    }

    const prev2El = lyricLines.prev2;
    const prev1El = lyricLines.prev1;
    const currentEl = lyricLines.current;
    const next1El = lyricLines.next1;
    const next2El = lyricLines.next2;

    // Add fade-out effect
    prev2El.style.opacity = '0';
    prev1El.style.opacity = '0';
    currentEl.style.opacity = '0';
    next1El.style.opacity = '0';
    next2El.style.opacity = '0';

    setTimeout(() => {
        const index = Math.max(0, Math.min(currentIndex, lyrics.length - 1));

        prev2El.textContent = (index >= 2) ? lyrics[index - 2].text : '';
        prev1El.textContent = (index >= 1) ? lyrics[index - 1].text : '';
        currentEl.textContent = (index >= 0) ? lyrics[index].text : '';
        next1El.textContent = (index < lyrics.length - 1) ? lyrics[index + 1].text : '';
        next2El.textContent = (index < lyrics.length - 2) ? lyrics[index + 2].text : '';

        // Add fade-in and transform effects
        prev2El.style.opacity = index >= 2 ? '0.7' : '0';
        prev1El.style.opacity = index >= 1 ? '0.7' : '0';
        currentEl.style.opacity = '1';
        next1El.style.opacity = index < lyrics.length - 1 ? '0.7' : '0';
        next2El.style.opacity = index < lyrics.length - 2 ? '0.7' : '0';

        prev2El.style.transform = index >= 2 ? 'translateY(-32px)' : 'translateY(0)';
        prev1El.style.transform = index >= 1 ? 'translateY(-16px)' : 'translateY(0)';
        currentEl.style.transform = 'scale(1.05)';
        next1El.style.transform = index < lyrics.length - 1 ? 'translateY(16px)' : 'translateY(0)';
        next2El.style.transform = index < lyrics.length - 2 ? 'translateY(32px)' : 'translateY(0)';
    }, 150);
}
