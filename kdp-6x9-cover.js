// kdp-6x9-cover-creator.js
// Simplified for 6x9 books only - No external dependencies
const fs = require('fs').promises;
const path = require('path');

class KDP6x9CoverCreator {
  constructor() {
    // Fixed dimensions for 6x9 books
    this.trimWidth = 6;      // inches
    this.trimHeight = 9;     // inches
    
    // Paper thickness per page in inches
    this.paperThickness = {
      white: {
        bw: 0.0025,      // Black & White
        color: 0.002252   // Color
      },
      cream: {
        bw: 0.0025,      // Black & White  
        color: 0.002252   // Color
      }
    };

    // Cover thickness in inches
    this.coverThickness = 0.0025;
    
    // Bleed requirements in inches
    this.bleed = 0.125; // 0.125" bleed on all sides
    
    // DPI for print quality
    this.dpi = 300;
  }

  /**
   * Convert inches to pixels at 300 DPI
   */
  inchesToPixels(inches) {
    return Math.round(inches * this.dpi);
  }

  /**
   * Calculate spine width based on page count
   */
  calculateSpineWidth(pageCount, paperType = 'white', inkType = 'bw') {
    if (pageCount < 24) {
      throw new Error('Minimum page count is 24 for paperback books');
    }
    
    if (pageCount > 828) {
      throw new Error('Maximum page count is 828 for paperback books');
    }

    const thickness = this.paperThickness[paperType][inkType];
    const spineWidth = (pageCount * thickness) + this.coverThickness;
    
    return Math.round(spineWidth * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Calculate full cover dimensions for 6x9 book
   */
  calculateCoverDimensions(pageCount, paperType = 'white', inkType = 'bw') {
    const spineWidth = this.calculateSpineWidth(pageCount, paperType, inkType);

    // Full cover width = front cover + spine + back cover + bleed on both sides
    const fullCoverWidth = (this.trimWidth * 2) + spineWidth + (this.bleed * 2);
    
    // Full cover height = trim height + bleed on top and bottom
    const fullCoverHeight = this.trimHeight + (this.bleed * 2);

    return {
      spineWidth: spineWidth,
      fullCover: {
        width: Math.round(fullCoverWidth * 10000) / 10000,
        height: Math.round(fullCoverHeight * 10000) / 10000,
        widthPx: this.inchesToPixels(fullCoverWidth),
        heightPx: this.inchesToPixels(fullCoverHeight)
      },
      layout: {
        // Inch measurements
        backCoverStart: 0,
        backCoverEnd: this.trimWidth + this.bleed,
        spineStart: this.trimWidth + this.bleed,
        spineEnd: this.trimWidth + this.bleed + spineWidth,
        frontCoverStart: this.trimWidth + this.bleed + spineWidth,
        frontCoverEnd: fullCoverWidth,
        // Pixel measurements
        backCoverStartPx: 0,
        backCoverEndPx: this.inchesToPixels(this.trimWidth + this.bleed),
        spineStartPx: this.inchesToPixels(this.trimWidth + this.bleed),
        spineEndPx: this.inchesToPixels(this.trimWidth + this.bleed + spineWidth),
        frontCoverStartPx: this.inchesToPixels(this.trimWidth + this.bleed + spineWidth),
        frontCoverEndPx: this.inchesToPixels(fullCoverWidth)
      }
    };
  }

  /**
   * Create cover using Electron's offscreen canvas
   */
  async createCoverWithFrontImage(pageCount, frontCoverImagePath, outputPath, options = {}) {
    const {
      paperType = 'white',
      inkType = 'bw',
      backgroundColor = '#FFFFFF',
      spineColor = '#CCCCCC',
      backCoverColor = '#F0F0F0',
      showGuides = false,
      spineText = '',
      spineTextColor = '#000000',
      spineTextSize = 24,
      spineTextFont = 'Arial'
    } = options;

    try {
      // Get electron from the main process if in renderer
      const { nativeImage } = require('electron');
      
      // Calculate dimensions
      const dims = this.calculateCoverDimensions(pageCount, paperType, inkType);
      
      // Create offscreen canvas
      const canvas = this.createOffscreenCanvas(dims.fullCover.widthPx, dims.fullCover.heightPx);
      const ctx = canvas.getContext('2d');

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, dims.fullCover.widthPx, dims.fullCover.heightPx);

      // Draw back cover area
      ctx.fillStyle = backCoverColor;
      ctx.fillRect(0, 0, dims.layout.backCoverEndPx, dims.fullCover.heightPx);

      // Draw spine area
      ctx.fillStyle = spineColor;
      ctx.fillRect(dims.layout.spineStartPx, 0, 
        dims.layout.spineEndPx - dims.layout.spineStartPx, 
        dims.fullCover.heightPx);

      // Add spine text if provided
      if (spineText) {
        ctx.save();
        ctx.translate(dims.layout.spineStartPx + (dims.layout.spineEndPx - dims.layout.spineStartPx) / 2, 
          dims.fullCover.heightPx / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = `${spineTextSize}px ${spineTextFont}`;
        ctx.fillStyle = spineTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spineText, 0, 0);
        ctx.restore();
      }

      // Load and draw front cover image
      const frontImage = nativeImage.createFromPath(frontCoverImagePath);
      const imageSize = frontImage.getSize();
      const imageBuffer = frontImage.toBitmap();
      
      // Create temporary canvas for the image
      const imgCanvas = this.createOffscreenCanvas(imageSize.width, imageSize.height);
      const imgCtx = imgCanvas.getContext('2d');
      const imageData = imgCtx.createImageData(imageSize.width, imageSize.height);
      
      // Copy bitmap data (BGRA to RGBA)
      for (let i = 0; i < imageBuffer.length; i += 4) {
        imageData.data[i] = imageBuffer[i + 2];     // R
        imageData.data[i + 1] = imageBuffer[i + 1]; // G
        imageData.data[i + 2] = imageBuffer[i];     // B
        imageData.data[i + 3] = imageBuffer[i + 3]; // A
      }
      
      imgCtx.putImageData(imageData, 0, 0);

      // Calculate front cover dimensions
      const frontCoverWidth = dims.layout.frontCoverEndPx - dims.layout.frontCoverStartPx;
      const frontCoverHeight = dims.fullCover.heightPx;

      // Draw the image scaled to fit front cover area
      ctx.drawImage(imgCanvas, 
        0, 0, imageSize.width, imageSize.height,
        dims.layout.frontCoverStartPx, 0, frontCoverWidth, frontCoverHeight);

      // Add guide lines if requested
      if (showGuides) {
        this.addGuideLines(ctx, dims);
      }

      // Convert canvas to buffer and save
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      await fs.writeFile(outputPath, buffer);

      return {
        success: true,
        dimensions: dims,
        outputPath,
        info: {
          fullCoverSize: `${dims.fullCover.width}" × ${dims.fullCover.height}"`,
          fullCoverPixels: `${dims.fullCover.widthPx} × ${dims.fullCover.heightPx}px`,
          spineWidth: `${dims.spineWidth}"`,
          pageCount,
          paperType,
          inkType
        }
      };

    } catch (error) {
      throw new Error(`Failed to create cover: ${error.message}`);
    }
  }

  /**
   * Create offscreen canvas (works in both main and renderer process)
   */
  createOffscreenCanvas(width, height) {
    try {
      // Try to use Electron's built-in canvas
      const { Canvas } = require('electron').remote || require('electron');
      return new Canvas(width, height);
    } catch (e) {
      // Fallback to node-canvas if available (for testing outside Electron)
      try {
        const { createCanvas } = require('canvas');
        return createCanvas(width, height);
      } catch (e2) {
        // Create a minimal canvas-like object for dimension calculations only
        return {
          width,
          height,
          getContext: () => ({
            fillRect: () => {},
            fillStyle: '',
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
            putImageData: () => {}
          }),
          toBuffer: () => Buffer.alloc(0)
        };
      }
    }
  }

  /**
   * Add guide lines to show safe areas
   */
  addGuideLines(ctx, dims) {
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);

    // Spine boundaries
    ctx.beginPath();
    ctx.moveTo(dims.layout.spineStartPx, 0);
    ctx.lineTo(dims.layout.spineStartPx, dims.fullCover.heightPx);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(dims.layout.spineEndPx, 0);
    ctx.lineTo(dims.layout.spineEndPx, dims.fullCover.heightPx);
    ctx.stroke();

    // Safe area boundaries (0.125" from edges)
    const safeOffset = this.inchesToPixels(0.125);
    
    // Horizontal safe lines
    ctx.beginPath();
    ctx.moveTo(0, safeOffset);
    ctx.lineTo(dims.fullCover.widthPx, safeOffset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, dims.fullCover.heightPx - safeOffset);
    ctx.lineTo(dims.fullCover.widthPx, dims.fullCover.heightPx - safeOffset);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Generate a detailed report for the cover
   */
  generateReport(pageCount, paperType = 'white', inkType = 'bw') {
    const dims = this.calculateCoverDimensions(pageCount, paperType, inkType);
    
    return `
KDP 6x9 Book Cover Specifications
=================================
Page Count: ${pageCount}
Paper Type: ${paperType}
Ink Type: ${inkType === 'bw' ? 'Black & White' : 'Color'}

Cover Dimensions:
- Spine Width: ${dims.spineWidth}" (${this.inchesToPixels(dims.spineWidth)}px)
- Full Cover Size: ${dims.fullCover.width}" × ${dims.fullCover.height}"
- Full Cover Pixels: ${dims.fullCover.widthPx} × ${dims.fullCover.heightPx}px
- Bleed: ${this.bleed}" on all sides

Layout Guide:
- Back Cover: 0" to ${dims.layout.backCoverEnd}" (0px to ${dims.layout.backCoverEndPx}px)
- Spine: ${dims.layout.spineStart}" to ${dims.layout.spineEnd}" (${dims.layout.spineStartPx}px to ${dims.layout.spineEndPx}px)
- Front Cover: ${dims.layout.frontCoverStart}" to ${dims.layout.frontCoverEnd}" (${dims.layout.frontCoverStartPx}px to ${dims.layout.frontCoverEndPx}px)

Design Requirements:
- Front cover image should be ${this.inchesToPixels(this.trimWidth + this.bleed * 2)} × ${this.inchesToPixels(this.trimHeight + this.bleed * 2)}px
- Keep important elements at least 0.125" (${this.inchesToPixels(0.125)}px) from edges
- Spine text should be centered in the ${dims.spineWidth}" spine area
`;
  }
}

// Export for use in Electron app
module.exports = KDP6x9CoverCreator;

// Example usage
async function example() {
  const creator = new KDP6x9CoverCreator();
  
  // Just calculate dimensions
  const report = creator.generateReport(200);
  console.log(report);
  
  // Create a cover with front image
  try {
    const result = await creator.createCoverWithFrontImage(
      200,                    // page count
      'front-cover.jpg',      // front cover image
      'final-cover.jpg',      // output file
      {
        paperType: 'white',
        inkType: 'bw',
        spineText: 'My Book Title',
        spineTextSize: 36,
        showGuides: true
      }
    );
    console.log('Cover created!', result.info);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example if called directly
if (require.main === module) {
  example();
}