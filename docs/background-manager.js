// background-manager.js
import { DOMElements } from './dom-elements.js';
import { MEDIA_PATH, BACKGROUND_SLIDESHOW_INTERVAL } from './config.js';

export class BackgroundManager {
    constructor() {
        this.dom = DOMElements;
        this.backgroundInterval = null;
        this.currentBgIndex = 0;
        this.activeBgLayer = 1;
        this.imageUrlsCache = []; // Stores actual URL strings to check for changes
        this.currentImageObjects = []; // Stores Image objects for preloading
        this.isSlideshowActive = false; // Indicates if slideshow mode is enabled
    }

    setBackground(picData) {
        // Normalize picData to an array of full URLs for comparison
        const newImageUrls = (Array.isArray(picData) ? picData : [picData])
                                .map(picName => `${MEDIA_PATH}${encodeURI(picName)}`);

        // Check if the image list has actually changed
        if (JSON.stringify(newImageUrls) === JSON.stringify(this.imageUrlsCache)) {
            // Image list is the same, no need to re-preload or reset.
            // Just ensure slideshow state (active/inactive) is consistent with the current picData structure.
            this.isSlideshowActive = (Array.isArray(picData) && picData.length > 1);
            return; // Exit early if no change
        }

        // --- Image list has changed, proceed with reset and (re)loading ---
        this.stopSlideshow(); // Stop any active slideshow
        this.imageUrlsCache = newImageUrls; // Update the cache
        this.currentImageObjects = []; // Clear previous image objects
        this.currentBgIndex = 0; // Reset index
        this.isSlideshowActive = (Array.isArray(picData) && picData.length > 1);

        if (this.isSlideshowActive) {
            // Preload all images if it's a slideshow
            newImageUrls.forEach(url => {
                const img = new Image();
                img.src = url;
                this.currentImageObjects.push(img);
            });
            // Set the first image immediately
            if (this.currentImageObjects.length > 0) {
                this.dom.bgLayer1.style.backgroundImage = `url('${this.currentImageObjects[0].src}')`;
                this.dom.bgLayer1.style.opacity = 1;
                this.dom.bgLayer2.style.opacity = 0;
                this.activeBgLayer = 1;
            }
        } else {
            // Single image mode
            const singleImageUrl = newImageUrls.length > 0 ? newImageUrls[0] : '';
            this.dom.bgLayer1.style.backgroundImage = `url('${singleImageUrl}')`;
            this.dom.bgLayer1.style.opacity = 1;
            this.dom.bgLayer2.style.opacity = 0;
            this.activeBgLayer = 1;
            // Preload the single image if needed
            if (singleImageUrl) {
                const img = new Image();
                img.src = singleImageUrl;
                this.currentImageObjects.push(img);
            }
        }
    }

    startSlideshow() {
        if (!this.isSlideshowActive || this.currentImageObjects.length <= 1) {
            // No slideshow if only one image or not in slideshow mode
            this.stopSlideshow(); // Ensure it's stopped
            return;
        }

        if (this.backgroundInterval) clearInterval(this.backgroundInterval);

        const changeImage = () => {
            this.currentBgIndex = (this.currentBgIndex + 1) % this.currentImageObjects.length;
            const nextImage = this.currentImageObjects[this.currentBgIndex];

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
