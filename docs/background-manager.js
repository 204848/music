// background-manager.js
import { DOMElements } from './dom-elements.js';
import { MEDIA_PATH, BACKGROUND_SLIDESHOW_INTERVAL } from './config.js';

export class BackgroundManager {
    constructor() {
        this.dom = DOMElements;
        this.backgroundInterval = null;
        this.currentBgIndex = 0;
        this.activeBgLayer = 1;
        this.currentImageCache = [];
        this.isSlideshowRunning = false;
    }

    setBackground(picData, forceReset = false) {
        if (this.backgroundInterval) clearInterval(this.backgroundInterval);
        this.backgroundInterval = null;
        this.currentImageCache = [];
        this.currentBgIndex = 0;

        if (Array.isArray(picData) && picData.length > 1) {
            this.isSlideshowRunning = true;
            const firstImageUrl = `url('${MEDIA_PATH}${encodeURI(picData[0])}')`;
            this.dom.bgLayer1.style.backgroundImage = firstImageUrl;
            this.dom.bgLayer1.style.opacity = 1;
            this.dom.bgLayer2.style.opacity = 0;
            this.activeBgLayer = 1;

            picData.forEach(picName => {
                const img = new Image();
                img.src = MEDIA_PATH + encodeURI(picName);
                this.currentImageCache.push(img);
            });
            // Only start slideshow if requested or if already playing
        } else {
            this.isSlideshowRunning = false;
            const singlePic = Array.isArray(picData) ? picData[0] : picData;
            const imageUrl = `url('${MEDIA_PATH}${encodeURI(singlePic)}')`;
            this.dom.bgLayer1.style.backgroundImage = imageUrl;
            this.dom.bgLayer1.style.opacity = 1;
            this.dom.bgLayer2.style.opacity = 0;
            this.activeBgLayer = 1;
        }
    }

    startSlideshow(images) {
        if (!this.isSlideshowRunning) return; // Only run if multiple images were provided
        if (this.backgroundInterval) clearInterval(this.backgroundInterval);

        // Ensure images are cached
        if (this.currentImageCache.length === 0 && images && images.length > 0) {
            images.forEach(picName => {
                const img = new Image();
                img.src = MEDIA_PATH + encodeURI(picName);
                this.currentImageCache.push(img);
            });
        }
        if (this.currentImageCache.length === 0) return;

        const changeImage = () => {
            this.currentBgIndex = (this.currentBgIndex + 1) % this.currentImageCache.length;
            const nextImage = this.currentImageCache[this.currentBgIndex];

            if (nextImage) {
                let nextLayer = (this.activeBgLayer === 1) ? this.dom.bgLayer2 : this.dom.bgLayer1;
                let currentLayer = (this.activeBgLayer === 1) ? this.dom.bgLayer1 : this.dom.bgLayer2;

                nextLayer.style.backgroundImage = `url('${nextImage.src}')`;
                currentLayer.style.opacity = 0;
                nextLayer.style.opacity = 1;
                this.activeBgLayer = (this.activeBgLayer === 1) ? 2 : 1;
            }
        };
        this.backgroundInterval = setInterval(changeImage, BACKGROUND_SLIDESHOW_INTERVAL);
    }

    stopSlideshow() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }
    }
}
