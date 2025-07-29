// kdp-6x9-cover.js
// KDP 6x9 book cover creator with properly sized spine text
const fs = require('fs').promises;
const path = require('path');

// Check if canvas and PDFKit are available
const PDFDocument = require('pdfkit');
let createCanvas, loadImage;
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
} catch (e) {
  console.error('\n================================');
  console.error('Canvas module not found!');
  console.error('To use image processing, install it with:');
  console.error('npm install canvas');
  console.error('================================\n');
}

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
   * Create cover with front image using node-canvas
   */
  async createCoverWithFrontImage(pageCount, frontCoverImagePath, outputPath, options = {}) {
    if (!createCanvas || !loadImage) {
      throw new Error('Canvas module not installed. Run: npm install canvas');
    }

    const {
      paperType = 'white',
      inkType = 'bw',
      backgroundColor = '#000000',
      spineColor = '#000000',
      backCoverColor = '#000000',
      showGuides = false,
      spineTitle = '',
      spineAuthor = '',
      spineTextColor = '#ffffff',
      spineTextFont = 'Arial'
    } = options;

    try {
      // Check if front cover image exists
      try {
        await fs.access(frontCoverImagePath);
      } catch (e) {
        throw new Error(`Front cover image not found: ${frontCoverImagePath}`);
      }

      // Calculate dimensions
      const dims = this.calculateCoverDimensions(pageCount, paperType, inkType);
      
      // Create canvas
      const canvas = createCanvas(dims.fullCover.widthPx, dims.fullCover.heightPx);
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
      if (spineTitle || spineAuthor) {
        ctx.save();
        
        // Calculate available space (spine width minus some padding)
        const spineWidthPx = dims.layout.spineEndPx - dims.layout.spineStartPx;
        const spineHeightPx = dims.fullCover.heightPx;
        const safeMargin = this.inchesToPixels(0.25); // 0.25" increased safety margin
        
        // Calculate font size to fit spine width (since text will be rotated)
        // Use 75% of spine width for larger, more visible text
        const maxFontSize = Math.floor(spineWidthPx * 0.75);
        const finalFontSize = Math.min(maxFontSize, 72); // Increased cap to 72px
        
        ctx.font = `${finalFontSize}px ${spineTextFont}`;
        ctx.fillStyle = spineTextColor;
        
        // Position at center of spine horizontally
        const spineCenter = dims.layout.spineStartPx + (spineWidthPx / 2);
        
        // Draw title at top of spine (left-justified when rotated)
        if (spineTitle) {
          ctx.save();
          
          // Position for title at top, respecting safety margins
          ctx.translate(spineCenter, safeMargin + finalFontSize);
          
          // Rotate 90 degrees clockwise
          ctx.rotate(Math.PI / 2);
          
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(spineTitle, 0, 0);
          
          ctx.restore();
        }
        
        // Draw author at bottom of spine (right-justified when rotated)
        if (spineAuthor) {
          ctx.save();
          
          // Position for author at bottom, respecting safety margins
          ctx.translate(spineCenter, spineHeightPx - safeMargin - finalFontSize/2);
          
          // Rotate 90 degrees clockwise
          ctx.rotate(Math.PI / 2);
          
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(spineAuthor, 0, 0);
          
          ctx.restore();
        }
        
        ctx.restore();
      }

      // Load and draw front cover image
      console.log(`Loading front cover image: ${frontCoverImagePath}`);
      const image = await loadImage(frontCoverImagePath);
      
      // Calculate front cover dimensions
      const frontCoverWidth = dims.layout.frontCoverEndPx - dims.layout.frontCoverStartPx;
      const frontCoverHeight = dims.fullCover.heightPx;

      // Draw the image scaled to fit front cover area
      ctx.drawImage(image, 
        dims.layout.frontCoverStartPx, 0, 
        frontCoverWidth, frontCoverHeight);

      // Add guide lines if requested
      if (showGuides) {
        this.addGuideLines(ctx, dims);
      }

      // Create PDF with the canvas image
      const doc = new PDFDocument({
        size: [dims.fullCover.widthPx, dims.fullCover.heightPx],
        margins: { top: 0, left: 0, bottom: 0, right: 0 }
      });
      
      // Convert canvas to buffer and add to PDF
      const imageBuffer = canvas.toBuffer('image/png');
      doc.image(imageBuffer, 0, 0, {
        width: dims.fullCover.widthPx,
        height: dims.fullCover.heightPx
      });
      
      // Save PDF
      doc.pipe(require('fs').createWriteStream(outputPath));
      doc.end();
      
      // Wait for PDF to finish writing
      await new Promise((resolve) => {
        doc.on('end', resolve);
      });

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

    // Vertical safe lines for edges
    ctx.beginPath();
    ctx.moveTo(safeOffset, 0);
    ctx.lineTo(safeOffset, dims.fullCover.heightPx);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(dims.fullCover.widthPx - safeOffset, 0);
    ctx.lineTo(dims.fullCover.widthPx - safeOffset, dims.fullCover.heightPx);
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

// CLI interface
async function runCLI() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`
KDP 6x9 Cover Creator
=====================
Usage: node kdp-6x9-cover.js <command> [options]

Commands:
  calculate <pageCount> [paperType] [inkType]
    Calculate cover dimensions only
  
  create <pageCount> <frontCoverImage> <outputPath> [title] [author]
    Create a full cover with your front cover image

Parameters:
- pageCount: Number of pages (24-828)
- frontCoverImage: Path to your front cover JPG/PNG image
- outputPath: Output path for generated cover
- title: Book title for spine (optional) - appears at top, left-justified
- author: Author name for spine (optional) - appears at bottom, right-justified
         Text reads bottom-to-top (left-to-right when book is flat)
         Text automatically sized to fit spine width
- paperType: "white" or "cream" (default: white)
- inkType: "bw" or "color" (default: bw)

Examples:
  node kdp-6x9-cover.js calculate 200
  node kdp-6x9-cover.js create 200 cover.jpg output-cover.pdf
  node kdp-6x9-cover.js create 200 cover.jpg output-cover.pdf "The Accounting" "Clee Smith"
  node kdp-6x9-cover.js create 200 cover.jpg output-cover.pdf "My Book Title"

Options:
  -h, --help      Show this help message
`);
    return;
  }

  const calculator = new KDP6x9CoverCreator();
  const command = args[0];

  try {
    if (command === 'calculate') {
      const pageCount = parseInt(args[1]);
      const paperType = args[2] || 'white';
      const inkType = args[3] || 'bw';
      
      if (isNaN(pageCount)) {
        throw new Error('Page count must be a number');
      }
      
      console.log(calculator.generateReport(pageCount, paperType, inkType));
    } 
    else if (command === 'create') {
      const pageCount = parseInt(args[1]);
      const frontCoverImage = args[2];
      const outputPath = args[3];
      const spineTitle = args[4] || '';
      const spineAuthor = args[5] || '';
      
      if (isNaN(pageCount)) {
        throw new Error('Page count must be a number');
      }
      
      if (!frontCoverImage || !outputPath) {
        console.error('Error: Missing required parameters');
        console.error('Usage: node kdp-6x9-cover.js create <pageCount> <frontCoverImage> <outputPath> [title] [author]');
        process.exit(1);
      }
      
      console.log('Creating cover...');
      console.log(`- Page count: ${pageCount}`);
      console.log(`- Front cover image: ${frontCoverImage}`);
      console.log(`- Output path: ${outputPath}`);
      if (spineTitle || spineAuthor) {
        console.log(`- Spine title: ${spineTitle}`);
        console.log(`- Spine author: ${spineAuthor}`);
      }
      
      const result = await calculator.createCoverWithFrontImage(
        pageCount, 
        frontCoverImage, 
        outputPath,
        { 
          showGuides: true,
          spineTitle: spineTitle,
          spineAuthor: spineAuthor,
          backgroundColor: '#000000'
        }
      );
      
      console.log('\nCover created successfully!');
      console.log(`- Full cover size: ${result.info.fullCoverSize}`);
      console.log(`- Full cover pixels: ${result.info.fullCoverPixels}`);
      console.log(`- Spine width: ${result.info.spineWidth}`);
      console.log(`- Output saved to: ${result.outputPath}`);
    }
    else {
      console.error(`Unknown command: ${command}`);
      console.error('Use --help for usage information');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = KDP6x9CoverCreator;

// Run CLI if script is called directly
if (require.main === module) {
  runCLI();
}