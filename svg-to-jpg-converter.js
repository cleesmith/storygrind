const fs = require('fs');
const path = require('path');

class SVGToJPGConverter {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Convert SVG content to JPG buffer (Vellum standard is .jpg)
     * @param {string|Buffer} svgContent - SVG content as string or buffer
     * @param {Object} options - Conversion options
     * @param {number} options.width - Output width (default: 1600)
     * @param {number} options.height - Output height (default: 2560) 
     * @param {number} options.quality - JPEG quality 0-1 (default: 0.92)
     * @param {string} options.backgroundColor - Background color (default: 'white')
     * @returns {Promise<Buffer>} - JPG buffer ready for EPUB
     */
    async convertSVGToJPG(svgContent, options = {}) {
        const {
            width = 1600,
            height = 2560,
            quality = 0.92,
            backgroundColor = 'white'
        } = options;

        try {
            // Ensure svgContent is a string
            const svgString = typeof svgContent === 'string' ? svgContent : svgContent.toString('utf8');
            
            // Create image element
            const img = new window.Image();
            
            // Convert SVG to data URI
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;

            // Wait for image to load
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load SVG'));
                setTimeout(() => reject(new Error('SVG load timeout')), 10000);
            });

            // Create canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext('2d');

            // --- BEGIN FIX: Fill the background first! ---
            this.ctx.save();
            this.ctx.fillStyle = backgroundColor || 'white';
            this.ctx.fillRect(0, 0, width, height);
            this.ctx.restore();
            // --- END FIX ---

            // Draw SVG to canvas (will overwrite alpha, but no borders now)
            this.ctx.drawImage(img, 0, 0, width, height);

            // Clean up URL
            URL.revokeObjectURL(url);

            // Convert to JPG and get buffer
            const dataURL = this.canvas.toDataURL('image/jpeg', quality);
            const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            return buffer;

        } catch (error) {
            throw new Error(`SVG to JPG conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert SVG to EPUB cover JPG (standard ebook dimensions)
     * @param {string|Buffer} svgContent - SVG content
     * @returns {Promise<Buffer>} - JPG buffer for EPUB
     */
    async convertToEPUBCover(svgContent) {
        return this.convertSVGToJPG(svgContent, {
            width: 1600,
            height: 2560,
            quality: 0.92,
            backgroundColor: 'white'
        });
    }

    /**
     * Get EPUB cover info (JPG format like Vellum)
     * @param {string|Buffer} svgContent - SVG content
     * @returns {Promise<Object>} - Cover info for EPUB manifest
     */
    async getEPUBCoverInfo(svgContent) {
        const buffer = await this.convertToEPUBCover(svgContent);
        
        return {
            filename: 'cover.jpg',
            buffer: buffer,
            mimeType: 'image/jpeg',
            size: buffer.length
        };
    }
}

module.exports = SVGToJPGConverter;
