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

            // Set white background (required for JPG)
            this.ctx.fillStyle = backgroundColor;
            this.ctx.fillRect(0, 0, width, height);

            // Draw SVG to canvas
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

// Example: How to use in your StoryGrind EPUB converter
// Following Vellum's pattern of saving both .epub and .jpg files

/*
const SVGToJPGConverter = require('./svg-to-jpg-converter');

async function convertManuscriptToEPUB(manuscriptPath, outputDir, coverSVG = null) {
    const converter = new SVGToJPGConverter();
    
    // Read manuscript
    const manuscriptContent = fs.readFileSync(manuscriptPath, 'utf8');
    const manuscriptName = path.basename(manuscriptPath, '.txt');
    
    // Process chapters
    const chapters = parseManuscript(manuscriptContent);
    
    // Handle cover conversion if provided
    let coverBuffer = null;
    if (coverSVG) {
        try {
            coverBuffer = await converter.convertToEPUBCover(coverSVG);
            console.log(`Cover converted to JPG: ${coverBuffer.length} bytes`);
        } catch (error) {
            console.warn(`Cover conversion failed: ${error.message}`);
            coverBuffer = null;
        }
    }
    
    // Build EPUB structure in memory
    const epubStructure = {
        'META-INF/container.xml': generateContainerXML(),
        'OEBPS/content.opf': generateOPF(chapters, coverBuffer ? 'cover.jpg' : null),
        'OEBPS/toc.ncx': generateNCX(chapters),
        ...generateChapterFiles(chapters)
    };
    
    // Add cover JPG to EPUB if converted
    if (coverBuffer) {
        epubStructure['OEBPS/cover.jpg'] = coverBuffer;
    }
    
    // Generate EPUB file
    const epubPath = path.join(outputDir, `${manuscriptName}.epub`);
    const epubBuffer = createEPUBZip(epubStructure);
    fs.writeFileSync(epubPath, epubBuffer);
    
    // Save cover.jpg alongside EPUB (like Vellum does)
    if (coverBuffer) {
        const coverPath = path.join(outputDir, `${manuscriptName}-cover.jpg`);
        fs.writeFileSync(coverPath, coverBuffer);
        console.log(`Cover saved: ${coverPath}`);
    }
    
    console.log(`EPUB created: ${epubPath}`);
    return {
        epubPath: epubPath,
        coverPath: coverBuffer ? path.join(outputDir, `${manuscriptName}-cover.jpg`) : null
    };
}

// Alternative: Save cover with same name as EPUB
function saveCoverLikeVellum(epubPath, coverBuffer) {
    const epubDir = path.dirname(epubPath);
    const epubName = path.basename(epubPath, '.epub');
    const coverPath = path.join(epubDir, `${epubName}.jpg`);
    
    fs.writeFileSync(coverPath, coverBuffer);
    return coverPath;
}

// Usage example:
async function processManuscript(manuscriptPath, coverSVGContent) {
    const outputDir = path.dirname(manuscriptPath);
    
    try {
        const result = await convertManuscriptToEPUB(
            manuscriptPath, 
            outputDir, 
            coverSVGContent
        );
        
        console.log('Conversion complete!');
        console.log(`EPUB: ${result.epubPath}`);
        if (result.coverPath) {
            console.log(`Cover: ${result.coverPath}`);
        }
        
    } catch (error) {
        console.error('Conversion failed:', error.message);
    }
}

.....

  async generateJPGCover_Mandelbrot(metadata, jpgOutputPath) {
    const fs = require('fs');
    // Set up canvas size (typical cover size)
    const width = 1600, height = 2560;
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    // Mandelbrot params
    const maxIter = 60;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    // Coloring
    function colorFunc(iter, maxIter, x, y) {
      if (iter === maxIter) return [20,20,30]; // background
      let t = iter / maxIter;
      return [
        Math.floor(200 + 55 * Math.sin(8*t)),
        Math.floor(80 + 120 * Math.cos(5*t + x/40)),
        Math.floor(200 + 55 * Math.cos(7*t + y/80))
      ];
    }
    // Generate Mandelbrot image
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let cr = (x / width) * 3.5 - 2.5;   // real axis: -2.5 to +1
        let ci = (y / height) * 2.0 - 1.0;  // imag axis: -1 to +1
        let zr = 0, zi = 0, iter = 0;
        while (zr*zr + zi*zi < 4 && iter < maxIter) {
          let tmp = zr*zr - zi*zi + cr;
          zi = 2*zr*zi + ci;
          zr = tmp;
          iter++;
        }
        let idx = (y * width + x) * 4;
        let [r,g,b] = colorFunc(iter, maxIter, x, y);
        imageData.data[idx + 0] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Add text overlay (title/author)
    ctx.font = 'bold 140px Arial, sans-serif';
    ctx.fillStyle = '#ffffffcc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#222';
    ctx.shadowBlur = 16;
    // Title (multi-line split if long)
    let lines = (metadata.title || 'Untitled').toUpperCase().match(/.{1,22}( |$)/g) || [];
    lines.forEach((line, i) => {
      ctx.fillText(line.trim(), width/2, 260 + i * 170);
    });
    // Author near bottom
    ctx.shadowBlur = 10;
    ctx.font = 'bold 90px Arial, sans-serif';
    ctx.fillText((metadata.author || '').toUpperCase(), width/2, height - 260);
    ctx.shadowBlur = 0;
    // Save as JPG (quality 94%)
    const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const jpgData = jpgDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    fs.writeFileSync(jpgOutputPath, Buffer.from(jpgData, 'base64'));
    return jpgOutputPath;
  }

*/
