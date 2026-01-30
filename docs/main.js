// main.js
import { Player } from './player-core.js';
import { UIManager } from './ui-manager.js';
import { BackgroundManager } from './background-manager.js';
import { Visualization } from './visualization.js';
import { setupEventListeners } from './event-handlers.js';

// Howler.js is loaded as a global script in index.html,
// so Howler and Howl objects are available on the window object.
// We don't need to import them as ES modules here, just ensure they are loaded globally.

// playerInstance 不再直接赋值给全局变量，而是通过 event-handlers.js 中设置 window.playerInstance
// 这样可以避免在初始化完成前全局变量不可用的问题
let playerInstance; 

async function initApp() {
    try {
        const response = await fetch("memp.json");
        const playlistData = await response.json();

        const uiManager = new UIManager();
        const backgroundManager = new BackgroundManager();
        const visualization = new Visualization();

        playerInstance = new Player(playlistData, uiManager, backgroundManager, visualization);

        setupEventListeners(playerInstance, uiManager, visualization);

        // 页面打开时，不自动播放，但会预加载。用户点击播放按钮后才会播放。
        // playerInstance.play(playerInstance.index); // 移除这行，不再自动播放
        console.log("Player initialized. Waiting for user interaction to play.");

    } catch (error) {
        console.error("Failed to load playlist or initialize app:", error);
    }
}

document.addEventListener('DOMContentLoaded', initApp);

console.log("\n %c Gmemp v3.6.4 (Modularized) %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
