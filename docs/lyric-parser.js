// lyric-parser.js
import { DOMElements } from './dom-elements.js';

let lyricInterval = null;
let lastLyricIndex = -1; // 用于跟踪当前歌词索引

// 更新：loadAndParseLyricFile 只负责从文件加载和解析，不负责存储或显示
export async function loadAndParseLyricFile(fullFilename, currentTime = 0) {
    if (!fullFilename) {
        return [];
    }

    const ext = fullFilename.toLowerCase().split('.').pop();
    try {
        const response = await fetch(fullFilename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const parsedLyrics = (ext === 'srt') ? parseSRT(text) : (ext === 'lrc') ? parseLRC(text) : [];
        return parsedLyrics;
    } catch (error) {
        console.error(`Failed to load or parse lyric file: ${fullFilename}`, error);
        return [];
    }
}

// 更新：startLyricInterval 接受一个函数来获取当前歌词数组
export function startLyricInterval(getCurrentTimeFn, getCurrentLyricsFn) {
    if (lyricInterval) clearInterval(lyricInterval);
    lyricInterval = setInterval(() => {
        const pos = getCurrentTimeFn();
        const currentLyrics = getCurrentLyricsFn(); // 从回调中获取当前歌词
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

// 更新：updateLyricDisplayAtTime 接受一个歌词数组参数
export function updateLyricDisplayAtTime(time, lyricsToDisplay) {
    const currentIndexInLyrics = getCurrentLyricIndex(time, lyricsToDisplay);
    updateLyricDisplay(lyricsToDisplay, currentIndexInLyrics);
    lastLyricIndex = currentIndexInLyrics;
}

// Internal functions for parsing and updating display
// 修改 parseLRC 函数
function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const tempMap = {}; // 使用对象合并相同时间的歌词

    for (let line of lines) {
        line = line.trim();
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
                const fixedTime = time.toFixed(3);
                if (!tempMap[fixedTime]) {
                    tempMap[fixedTime] = { time: parseFloat(fixedTime), text: text, trans: "" };
                } else {
                    // 如果时间戳已存在，认为是翻译
                    tempMap[fixedTime].trans = text;
                }
            }
        }
    }
    
    const result = Object.values(tempMap).sort((a, b) => a.time - b.time);
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
    const tempMap = {}; 
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
        
        if (text) {
            const fixedTime = start.toFixed(3);
            if (!tempMap[fixedTime]) {
                tempMap[fixedTime] = { time: start, end: end, text: text, trans: "" };
            } else {
                tempMap[fixedTime].trans = text; // 如果时间相同，存为翻译
            }
        }
    }
    // 转换成数组并排序
    const sortedResult = Object.values(tempMap).sort((a, b) => a.time - b.time);
    // 补齐结束时间
    for (let j = 0; j < sortedResult.length - 1; j++) {
        sortedResult[j].end = sortedResult[j + 1].time;
    }
    return sortedResult;
}

function getCurrentLyricIndex(time, lyrics) {
    if (!lyrics || lyrics.length === 0) return -1;
    
    // 增加一个微小的偏移量（0.1秒），解决由于性能波动导致的“慢半拍”感觉
    const adjustedTime = time + 0.1; 

    let result = -1;
    for (let i = 0; i < lyrics.length; i++) {
        if (adjustedTime >= lyrics[i].time) {
            result = i;
        } else {
            break;
        }
    }
    return result;
}

// 修改 updateLyricDisplay 函数
function updateLyricDisplay(lyrics, currentIndex) {
    const container = DOMElements.lyricContainer; // 获取外层容器
    const wrapper = DOMElements.lyricsWrapper;
    const lines = wrapper.querySelectorAll('.lyric-line');
    
    if (currentIndex === -1 || !lines[currentIndex]) return;

    // 移除所有高亮
    lines.forEach(line => line.classList.remove('active'));
    
    // 高亮当前行
    const activeLine = lines[currentIndex];
    activeLine.classList.add('active');

    // --- 修复点：动态计算中心偏移量 ---
    // container.offsetHeight / 2 是容器的中心线
    // activeLine.offsetTop 是当前行距离 wrapper 顶部的距离
    // activeLine.offsetHeight / 2 是为了让当前行的文字中线也对准容器中心
    const containerMid = container.offsetHeight / 2;
    const lineMid = activeLine.offsetTop + (activeLine.offsetHeight / 2);
    
    const offset = containerMid - lineMid;
    
    // 应用平滑滚动
    wrapper.style.transform = `translateY(${offset}px)`;
}
