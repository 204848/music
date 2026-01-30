// utils.js
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function formatTime(secs) {
    let minutes = Math.floor(secs / 60) || 0;
    let seconds = (secs - minutes * 60) || 0;
    return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
}
