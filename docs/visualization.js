// visualization.js
import { DOMElements } from './dom-elements.js';
import { VISUALIZATION_SENSITIVITY, VISUALIZATION_OPACITY } from './config.js';

export class Visualization {
    constructor() {
        this.dom = DOMElements;
        this.analyser = null;
        this.bufferLength = 0;
        this.dataArray = null;
        this.drawId = null;
        this.canvasCtx = this.dom.waveCanvas.getContext("2d");
    }

    setup(howlerMasterGain, howlerCtx) {
        if (!howlerCtx) {
            console.warn('Howler AudioContext not available for visualization.');
            return;
        }

        if (this.analyser) {
            try {
                this.analyser.disconnect(0);
            } catch (e) {
                console.warn("Analyser disconnect error:", e);
            }
        }
        
        this.analyser = howlerCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Connect master gain to analyser, then analyser to destination if not already
        if (howlerMasterGain) {
            howlerMasterGain.connect(this.analyser);
            // In Howler.js, masterGain is already connected to destination.
            // Connecting analyser *after* masterGain ensures sound still plays.
            // If you want analyser to process *before* destination, Howler.js needs to handle it.
            // For a simple visualization, connecting analyser to destination is fine and common.
            // This might cause double connection if masterGain already connects to destination AND analyser connects to destination.
            // A safer approach: analyser connects to masterGain, but doesn't connect to destination directly here.
            // Instead, player-core's setupVisualization should ensure the chain is correct: source -> masterGain -> analyser -> destination.
            // For now, let's assume masterGain is the last node before destination that we can tap into.
            // If masterGain.connect(this.analyser) is enough to get the data, then don't connect analyser to destination here.
            // Howler.js generally handles the main audio routing. We just need to tap into it.
        } else {
             console.warn('Howler MasterGain not available for visualization connection.');
        }

        if (!this.drawId) {
            this.drawId = requestAnimationFrame(this._draw.bind(this));
        }
    }

    _draw() {
        if (!this.analyser) {
            this.drawId = null;
            return;
        }
        
        let W = window.innerWidth, H = window.innerHeight;
        if (this.dom.waveCanvas.width !== W || this.dom.waveCanvas.height !== H) {
            this.dom.waveCanvas.width = W;
            this.dom.waveCanvas.height = H;
        }
        
        this.analyser.getByteFrequencyData(this.dataArray);
        this.canvasCtx.clearRect(0, 0, W, H);
        this.canvasCtx.fillStyle = `rgba(255,255,255,${VISUALIZATION_OPACITY})`;
        
        const barWidth = (W / this.bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        for(let i = 0; i < this.bufferLength; i++) {
            barHeight = (this.dataArray[i] / 255.0) * H * VISUALIZATION_SENSITIVITY;
            this.canvasCtx.fillRect(x, H - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        
        this.drawId = requestAnimationFrame(this._draw.bind(this));
    }

    stop() {
        if (this.drawId) {
            cancelAnimationFrame(this.drawId);
            this.drawId = null;
        }
        if (this.analyser) {
            try {
                this.analyser.disconnect(0);
            } catch (e) {
                console.warn("Analyser disconnect error on stop:", e);
            }
            this.analyser = null;
        }
        // Clear canvas if it was visible
        if (this.dom.waveCanvas.style.display !== 'none') {
            this.canvasCtx.clearRect(0, 0, this.dom.waveCanvas.width, this.dom.waveCanvas.height);
        }
    }

    isVisible() {
        return this.dom.waveCanvas.style.display !== 'none';
    }
}
