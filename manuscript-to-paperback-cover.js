// manuscript-to-paperback-cover.js

// 1. frontCoverImage: Path to your front cover JPG image with Browse button
// 2. authorPhoto: Path to author photo for back cover (optional) with Browse button
// 3. blurbText: Book description/blurb for back cover (optional)

const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const PDFDocument = require('pdfkit');
const canvasModule = require('canvas');
const appState = require('./state.js');

let createCanvas, loadImage;
createCanvas = canvasModule.createCanvas;
loadImage = canvasModule.loadImage;

class ManuscriptToPaperbackCover extends ToolBase {
  constructor(name, config = {}) {
    super(name, config);
    
    // Fixed dimensions for 6x9 books
    this.trimWidth = 6;      // inches
    this.trimHeight = 9;     // inches
    
    // Paper thickness per page in inches (calibrated to match KDP calculator)
    this.paperThickness = {
      white: {
        bw: 0.002237,    // Black & White (calibrated from KDP calculator)
        color: 0.002237  // Color (same as B&W for white paper)
      },
      cream: {
        bw: 0.002237,    // Black & White (same thickness)
        color: 0.002237  // Color (same as B&W for cream paper)
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
   * Read and validate project metadata
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Object>} - Metadata object with validation
   */
  async readProjectMetadata(projectPath) {
    const projectName = path.basename(projectPath);
    const metadataDir = path.join(projectPath, 'metadata');

    const metadata = {
      title: '',
      author: '',
      pov: '',
      publisher: '',
      buyUrl: '',
      copyright: '',
      dedication: '',
      aboutAuthor: '',
      blurb: ''
    };

    const requiredFiles = {
      '_title.txt': 'title',
      '_author.txt': 'author'
    };

    const optionalFiles = {
      '_pov.txt': 'pov',
      '_publisher.txt': 'publisher',
      '_buy_url.txt': 'buyUrl',
      '_copyright.txt': 'copyright',
      '_dedication.txt': 'dedication',
      '_about_author.txt': 'aboutAuthor',
      '_back_cover_blurb.txt': 'blurb'
    };

    // Check if metadata directory exists
    if (!fs.existsSync(metadataDir)) {
      throw new Error(`Project metadata not found. Please click "Project Settings" to set up your project metadata (title, author, etc.) before creating cover.`);
    }

    // Read required files
    for (const [filename, key] of Object.entries(requiredFiles)) {
      const filePath = path.join(metadataDir, filename);
      try {
        const content = await fsPromises.readFile(filePath, 'utf8');
        metadata[key] = content.trim();

        if (!metadata[key]) {
          throw new Error(`${key.charAt(0).toUpperCase() + key.slice(1)} is required but empty. Please click "Project Settings" and fill in the ${key} field.`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`${key.charAt(0).toUpperCase() + key.slice(1)} not found. Please click "Project Settings" to set up your project metadata.`);
        }
        throw error;
      }
    }

    // Read optional files
    for (const [filename, key] of Object.entries(optionalFiles)) {
      const filePath = path.join(metadataDir, filename);
      try {
        const content = await fsPromises.readFile(filePath, 'utf8');
        metadata[key] = content.trim();
      } catch (error) {
        // Optional files can be missing or empty
        metadata[key] = '';
      }
    }

    return metadata;
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
      throw new Error('Canvas module not installed.');
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
      spineTextFont = 'Arial',
      authorPhoto = '',
      blurbText = '',
      blurbTextColor = '#ffffff',
      blurbTextFont = 'Arial'
    } = options;

    try {
      // Check if front cover image exists
      try {
        fs.existsSync(frontCoverImagePath);
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

      // Add back cover content (author photo and blurb text)
      if (authorPhoto || blurbText) {
        await this.addBackCoverContent(ctx, dims, authorPhoto, blurbText, blurbTextColor, blurbTextFont);
      }

      // Draw spine area
      ctx.fillStyle = spineColor;
      ctx.fillRect(dims.layout.spineStartPx, 0, 
        dims.layout.spineEndPx - dims.layout.spineStartPx, 
        dims.fullCover.heightPx);

      // Add spine text if provided and page count is sufficient
      // Minimum 100 pages for readable spine text (spine too narrow below this)
      if ((spineTitle || spineAuthor) && pageCount >= 100) {
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
          const cleanSpineTitle = spineTitle
              .replace(/\n/g, ' ')      // Replace newlines with spaces
              .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
              .trim();                  // Remove leading/trailing whitespace

          ctx.fillText(cleanSpineTitle, 0, 0);
          
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
          // Sanitize spine author - ensure single line
          const cleanSpineAuthor = spineAuthor
              .replace(/\n/g, ' ')      // Replace newlines with spaces
              .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
              .trim();                  // Remove leading/trailing whitespace
          ctx.fillText(cleanSpineAuthor, 0, 0);
          
          ctx.restore();
        }
        
        ctx.restore();
      } else if ((spineTitle || spineAuthor) && pageCount < 100) {
        this.emitOutput(`Note: Spine text skipped - minimum 100 pages required for readable text (current: ${pageCount} pages)\n`);
      }

      // Load and draw front cover image
      this.emitOutput(`Loading front cover image: ${frontCoverImagePath}\n`);
console.dir(`Loading front cover image:`);
console.dir(frontCoverImagePath);
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

      // Create PDF with proper dimensions in points (72 points = 1 inch)
      const pdfWidthPoints = dims.fullCover.width * 72;
      const pdfHeightPoints = dims.fullCover.height * 72;
      
      this.emitOutput(`Creating PDF: ${dims.fullCover.width}" × ${dims.fullCover.height}" (${pdfWidthPoints} × ${pdfHeightPoints} points)\n`);
      
      const doc = new PDFDocument({
        size: [pdfWidthPoints, pdfHeightPoints],
        margins: { top: 0, left: 0, bottom: 0, right: 0 }
      });
      
      // Convert canvas to buffer and add to PDF with proper scaling
      const imageBuffer = canvas.toBuffer('image/png');
      doc.image(imageBuffer, 0, 0, {
        width: pdfWidthPoints,
        height: pdfHeightPoints
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
   * Add back cover content (author photo and blurb text)
   */
  async addBackCoverContent(ctx, dims, authorPhotoPath, blurbText, blurbTextColor, blurbTextFont) {
    const safeMargin = this.inchesToPixels(0.25); // 0.25" increased safety margin
    const barcodeHeight = this.inchesToPixels(1.5); // Reserve 1.5" for barcode at bottom
    
    // Back cover area boundaries
    const backCoverStartX = safeMargin;
    const backCoverEndX = dims.layout.backCoverEndPx - safeMargin;
    const backCoverStartY = safeMargin;
    const backCoverEndY = dims.fullCover.heightPx - safeMargin - barcodeHeight;
    
    let currentY = backCoverStartY;
    
    // Add author photo if provided
    if (authorPhotoPath) {
      try {
        // await fs.access(authorPhotoPath);
        const jpgCoverBuffer = fs.readFileSync(authorPhotoPath);
        const authorImage = await loadImage(authorPhotoPath);
        
        // Author photo dimensions (1.5" x 2" max)
        const photoMaxWidth = this.inchesToPixels(1.5);
        const photoMaxHeight = this.inchesToPixels(2);
        
        // Calculate scaled dimensions maintaining aspect ratio
        const aspectRatio = authorImage.width / authorImage.height;
        let photoWidth, photoHeight;
        
        if (aspectRatio > photoMaxWidth / photoMaxHeight) {
          // Width is limiting factor
          photoWidth = photoMaxWidth;
          photoHeight = photoMaxWidth / aspectRatio;
        } else {
          // Height is limiting factor
          photoHeight = photoMaxHeight;
          photoWidth = photoMaxHeight * aspectRatio;
        }
        
        // Draw photo in upper left
        ctx.drawImage(authorImage, backCoverStartX, currentY, photoWidth, photoHeight);
        
        // Update currentY to below the photo with some spacing
        currentY += photoHeight + this.inchesToPixels(0.25); // 0.25" spacing
        
      } catch (e) {
        this.emitOutput(`Warning: Author photo not found or could not be loaded: ${authorPhotoPath}\n`);
      }
    }
    
    // Add blurb text if provided
    if (blurbText) {
      ctx.save();
      
      // Text styling - make it readable like spine text
      const fontSize = 48; // 48px font for much better readability
      ctx.font = `${fontSize}px ${blurbTextFont}`;
      ctx.fillStyle = blurbTextColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Text wrapping
      const maxWidth = backCoverEndX - backCoverStartX;
      const lineHeight = fontSize * 1.4; // 1.4x line spacing
      
      // Simple word wrapping
      const words = blurbText.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Draw wrapped text
      lines.forEach((line, index) => {
        const y = currentY + (index * lineHeight);
        if (y + lineHeight <= backCoverEndY) {
          ctx.fillText(line, backCoverStartX, y);
        }
      });
      
      ctx.restore();
    }
  }

  /**
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(basePath, filePath);
  }

  /**
   * Execute the cover creation
   * @param {Object} options - Options for cover creation
   * @returns {Promise<Object>} - Result object
   */
  async execute(options) {
    const saveDir = appState.CURRENT_PROJECT_PATH;

    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    try {
      // Read project metadata
      const projectMetadata = await this.readProjectMetadata(saveDir);

      // Get required options with defaults
      const pageCount = parseInt(options.page_count);
      const frontCoverImagePath = this.ensureAbsolutePath(options.front_cover_image, saveDir);
console.dir(`execute: frontCoverImagePath:`);
console.dir(frontCoverImagePath);

      const paperType = options.paper_type || 'white';
      const inkType = options.ink_type || 'bw';
      const showGuides = options.show_guides !== false;

      // Optional paths
      const authorPhotoPath = options.author_photo ? this.ensureAbsolutePath(options.author_photo, saveDir) : '';

      // Validate page count
      if (isNaN(pageCount)) {
        throw new Error('Page count must be a number');
      }

      if (!frontCoverImagePath) {
        throw new Error('Front cover image path is required');
      }

      this.emitOutput('Creating paperback cover...\n');
      this.emitOutput(`- Page count: ${pageCount}\n`);
      this.emitOutput(`- Front cover image: ${frontCoverImagePath}\n`);
      this.emitOutput(`- Paper type: ${paperType}\n`);
      this.emitOutput(`- Ink type: ${inkType}\n`);
      
      // Use metadata for spine text and back cover content
      const spineTitle = projectMetadata.title;
      const spineAuthor = projectMetadata.author;
      const blurbText = projectMetadata.blurb || '';

      if (spineTitle || spineAuthor) {
        this.emitOutput(`- Spine title: ${spineTitle}\n`);
        this.emitOutput(`- Spine author: ${spineAuthor}\n`);
      }
      if (authorPhotoPath) {
        this.emitOutput(`- Author photo: ${authorPhotoPath}\n`);
      }
      if (blurbText) {
        this.emitOutput(`- Blurb text: ${blurbText.substring(0, 50)}...\n`);
      }

      // Generate output filename
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const outputFilename = `paperback_cover_${timestamp}.pdf`;
      const outputPath = path.join(saveDir, outputFilename);

      // Create the cover
      const result = await this.createCoverWithFrontImage(
        pageCount, 
        frontCoverImagePath, 
        outputPath,
        { 
          showGuides: showGuides,
          spineTitle: spineTitle,
          spineAuthor: spineAuthor,
          authorPhoto: authorPhotoPath,
          blurbText: blurbText,
          backgroundColor: '#000000',
          paperType: paperType,
          inkType: inkType
        }
      );

      this.emitOutput('\nCover created successfully!\n');
      this.emitOutput(`- Full cover size: ${result.info.fullCoverSize}\n`);
      this.emitOutput(`- Full cover pixels: ${result.info.fullCoverPixels}\n`);
      this.emitOutput(`- Spine width: ${result.info.spineWidth}\n`);
      this.emitOutput(`- Output saved to: ${result.outputPath}\n`);

      // Generate dimension report
      const dims = this.calculateCoverDimensions(pageCount, paperType, inkType);
      this.emitOutput('\nKDP 6x9 Book Cover Specifications\n');
      this.emitOutput('=================================\n');
      this.emitOutput(`Page Count: ${pageCount}\n`);
      this.emitOutput(`Paper Type: ${paperType}\n`);
      this.emitOutput(`Ink Type: ${inkType === 'bw' ? 'Black & White' : 'Color'}\n`);
      this.emitOutput('\nCover Dimensions:\n');
      this.emitOutput(`- Spine Width: ${dims.spineWidth}" (${this.inchesToPixels(dims.spineWidth)}px)\n`);
      this.emitOutput(`- Full Cover Size: ${dims.fullCover.width}" × ${dims.fullCover.height}"\n`);
      this.emitOutput(`- Full Cover Pixels: ${dims.fullCover.widthPx} × ${dims.fullCover.heightPx}px\n`);
      this.emitOutput(`- Bleed: ${this.bleed}" on all sides\n`);

      return {
        success: true,
        outputFiles: [outputPath],
        stats: {
          pageCount: pageCount,
          spineWidth: dims.spineWidth,
          fullCoverSize: `${dims.fullCover.width}" × ${dims.fullCover.height}"`,
          fullCoverPixels: `${dims.fullCover.widthPx} × ${dims.fullCover.heightPx}px`
        }
      };

    } catch (error) {
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
}

module.exports = ManuscriptToPaperbackCover;
