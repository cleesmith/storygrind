// manuscript-to-pdf-with-title.js
const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const PDFDocument = require('pdfkit');
const appState = require('./state.js');

class ManuscriptToPDF extends ToolBase {
  constructor(name, config = {}) {
    super(name, config);
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
      aboutAuthor: ''
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
      '_about_author.txt': 'aboutAuthor'
    };

    // Check if metadata directory exists
    if (!fs.existsSync(metadataDir)) {
      throw new Error(`Project metadata not found. Please click "Project Settings" to set up your project metadata (title, author, etc.) before converting.`);
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

  async execute(options) {
    let textFile = options.text_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;

    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    textFile = this.ensureAbsolutePath(textFile, saveDir);

    try {
      this.emitOutput(`Reading text file: ${textFile}\n`);

      const textContent = fs.readFileSync(textFile, 'utf8');

      // Parse all chapters
      let chapters = this.parseManuscriptText(textContent);
      this.emitOutput(`Found ${chapters.length} chapters\n`);

      // ========== TESTING MODE: Remove this block for production ==========
      const TESTING_MODE = true; // Set to false to process entire manuscript
      if (TESTING_MODE && chapters.length > 2) {
        chapters = chapters.slice(0, 2);
        this.emitOutput(`⚠️  TESTING MODE: Limited to first ${chapters.length} chapters\n`);
      }
      // =====================================================================
      
      // Original code (commented out for testing):
      // const chapters = this.parseManuscriptText(textContent);
      // this.emitOutput(`Found ${chapters.length} chapters\n`);

      // Read project metadata
      const projectMetadata = await this.readProjectMetadata(saveDir);

      // Use project metadata
      const metadata = {
        title: projectMetadata.title.replace(/\n/g, ' '),
        author: projectMetadata.author,
        language: options.language || 'en',
        publisher: projectMetadata.publisher || 'StoryGrind',
        copyright: projectMetadata.copyright,
        aboutAuthor: projectMetadata.aboutAuthor
      };

      // Create PDF with all content
      const pdfBuffer = await this.createPDF(chapters, metadata);

      // Save PDF
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(textFile, path.extname(textFile));
      const outputFilename = `${baseFileName}_${timestamp}.pdf`;
      const outputPath = path.join(saveDir, outputFilename);

      let dir = path.dirname(outputPath);
      let files = await fsPromises.readdir(dir);
      // Remove all .pdf files in the output directory
      // before writing the new one
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }

      fs.writeFileSync(outputPath, pdfBuffer);

      this.emitOutput(`\nPDF saved to: ${outputPath}\n`);

      return {
        success: true,
        outputFiles: [outputPath],
        stats: {
          chapterCount: chapters.length,
          wordCount: this.countWords(textContent)
        }
      };
    } catch (error) {
      console.error('Error in PDF Generator:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  createTitlePage(doc, metadata) {
    const pageWidth = 432;
    const pageHeight = 648;

    // Title - centered at ~35% of page height
    doc.font('bold')
      .fontSize(28)
      .text(metadata.title.toUpperCase(), 0, 190, {
        align: 'center',
        width: pageWidth,
        continued: false
      });

    // Author - centered at ~50% of page height
    doc.font('regular')
      .fontSize(20)
      .text(metadata.author.toUpperCase(), 0, 330, {
        align: 'center',
        width: pageWidth,
        continued: false
      });

    // Publisher - at ~80% of page height
    doc.fontSize(12)
      .text((metadata.publisher || 'StoryGrind').toUpperCase(), 0, 555, {
        align: 'center',
        width: pageWidth,
        continued: false
      });
  }

  createCopyrightPage(doc, metadata) {
    // Add new page for copyright
    doc.addPage();
    
    const pageWidth = 432;
    const pageHeight = 648;
    const leftMargin = 63;
    const bottomMargin = 72;
    const year = new Date().getFullYear();
    
    // Build copyright text array with proper blank lines
    let copyrightText = [
      `Copyright © ${year} ${metadata.author}`,
      '',
      'All rights reserved.',
      '',
      `Published by ${metadata.publisher || 'StoryGrind'}`,
      '',
      'This is a work of fiction. Names, characters, places, and incidents',
      'either are the product of the author\'s imagination or are used',
      'fictitiously. Any resemblance to actual persons, living or dead,',
      'events, or locales is entirely coincidental.'
    ];
    
    // Add user's custom copyright text if available
    if (metadata.copyright && metadata.copyright.trim()) {
      copyrightText.push('', '');
      const userLines = metadata.copyright.split('\n').map(line => line.trim()).filter(line => line);
      copyrightText = copyrightText.concat(userLines);
    }
    
    // Calculate starting Y position to place text at BOTTOM of page
    const lineHeight = 14;
    const totalHeight = copyrightText.length * lineHeight;
    const startY = pageHeight - bottomMargin - totalHeight - 50; // Near bottom with 50px padding
    
    // Set font and size
    doc.font('regular').fontSize(10);
    
    // Draw each line
    let currentY = startY;
    copyrightText.forEach(line => {
      doc.text(line, leftMargin, currentY, {
        width: pageWidth - (leftMargin * 2),
        align: 'left'
      });
      currentY += lineHeight;
    });
  }

  /**
   * Convert title to title case (capitalize first letter of each word)
   * @param {string} str - String to convert
   * @returns {string} - Title cased string
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Create PDF with title page and all chapters
  async createPDF(chapters, metadata) {
    // Check for EB Garamond fonts
    const regularFontPath = path.join(__dirname, 'EBGaramond-Regular.ttf');
    const boldFontPath = path.join(__dirname, 'EBGaramond-Bold.ttf');

    if (!fs.existsSync(regularFontPath)) {
      throw new Error(`EB Garamond Regular font file not found at: ${regularFontPath}. Please ensure EBGaramond-Regular.ttf is in the same directory as this script.`);
    }
    if (!fs.existsSync(boldFontPath)) {
      throw new Error(`EB Garamond Bold font file not found at: ${boldFontPath}. Please ensure EBGaramond-Bold.ttf is in the same directory as this script.`);
    }

    // Create PDF document with exact dimensions from original
    const doc = new PDFDocument({
      size: [432, 648], // 6" x 9"
      margins: {
        top: 72,    // 1 inch
        bottom: 72, // 1 inch
        left: 63,   // 0.875 inches
        right: 63   // 0.875 inches
      },
      autoFirstPage: false,  // Prevent automatic first page creation
      displayTitle: false,   // Don't display title in reader
      bufferPages: true      // Buffer pages to allow page manipulation
    });

    // Register fonts
    doc.registerFont('regular', regularFontPath);
    doc.registerFont('bold', boldFontPath);

    // Set metadata
    doc.info.Title = metadata.title;
    doc.info.Author = metadata.author;
    doc.info.Creator = 'StoryGrind';
    
    // Track chapter start pages for header logic
    const chapterStartPages = new Set();
    
    // Add first page and create title page
    doc.addPage();
    this.createTitlePage(doc, metadata);

    // Add copyright page
    this.createCopyrightPage(doc, metadata);

    // Track current page count
    let currentPageCount = 2; // We've added title and copyright pages

    // Each chapter starts on a new page
    chapters.forEach((chapter, chapterIndex) => {
      // Ensure chapters start on odd pages (right-hand pages)
      // If we're currently on an even page, add a blank page
      if (currentPageCount % 2 === 0) {
        doc.addPage(); // Add blank page
        currentPageCount++;
      }
      
      doc.addPage(); // Add the chapter page
      currentPageCount++;
      
      // Record this as a chapter start page (0-indexed)
      chapterStartPages.add(currentPageCount - 1);
      
      // Reset cursor to top margin position - with extra space from top
      doc.y = doc.page.margins.top + 72; // Add 1 inch of extra space at top

      // Extract chapter number and title
      const chapterMatch = chapter.title.match(/Chapter\s+(\d+|[IVXLCDM]+)(?::\s*)?(.*)$/i);
      if (chapterMatch) {
        const chapterNum = chapterMatch[1];
        const titleOnly = chapterMatch[2].trim();
        
        // Display chapter number centered
        doc.font('bold')
          .fontSize(18)
          .text(chapterNum, { align: 'center' });
        
        // Add a small gap between number and title
        doc.moveDown(0.5);
        
        // Display title if present
        if (titleOnly) {
          doc.font('bold')
            .fontSize(16)
            .text(titleOnly, { align: 'center' });
        }
      } else {
        // Fallback for chapters without "Chapter N" format
        doc.font('bold')
          .fontSize(16)
          .text(chapter.title, { align: 'center' });
      }

      // Add significant blank space before content starts
      doc.moveDown(4); // More space between title and content
      
      // Start the chapter content
      doc.font('regular').fontSize(11);
      chapter.paragraphs.forEach((paragraph, paraIndex) => {
        if (paraIndex === 0) {
          // First paragraph has no indent
          doc.text(paragraph, { paragraphGap: 2, lineGap: 1 });
        } else {
          // Subsequent paragraphs are indented
          doc.text(paragraph, { indent: 15, paragraphGap: 2, lineGap: 1 });
        }
      });
      
      // Update page count after adding chapter content
      // This is approximate - we'd need to track actual pages added
      const range = doc.bufferedPageRange();
      currentPageCount = range.start + range.count;
    });

    // Now add headers and page numbers to all pages
    const range = doc.bufferedPageRange();
    
    // CRITICAL: Reset cursor position before page numbering loop
    doc.text('', 0, 0);
    
    // Prepare header text
    const authorHeader = metadata.author.toUpperCase();
    const titleHeader = this.toTitleCase(metadata.title);
    
    for (let i = 0; i < range.count; i++) {
      // Skip first two pages (title and copyright)
      if (i < 2) continue;
      
      // Skip chapter start pages (no headers on chapter opening pages)
      if (chapterStartPages.has(i)) continue;
      
      // Switch to page
      doc.switchToPage(i);
      
      // Calculate actual page number (1-based for display)
      const pageNum = i + 1;
      
      // Add headers
      let oldTopMargin = doc.page.margins.top;
      doc.page.margins.top = 0; // Remove top margin to write into it
      
      doc.font('regular').fontSize(10);
      
      // Even pages (left pages) - Author name on left
      if (pageNum % 2 === 0) {
        doc.text(
          authorHeader,
          doc.page.margins.left,
          oldTopMargin / 2, // Centered vertically in top margin
          { 
            align: 'left',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right
          }
        );
      }
      // Odd pages (right pages) - Title on right
      else {
        doc.text(
          titleHeader,
          doc.page.margins.left,
          oldTopMargin / 2, // Centered vertically in top margin
          { 
            align: 'right',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right
          }
        );
      }
      
      doc.page.margins.top = oldTopMargin; // Restore top margin
      
      // Footer: Add page number
      let oldBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // Remove bottom margin to write into it
      
      doc.font('regular')
        .fontSize(10)
        .text(
          pageNum.toString(),
          0,
          doc.page.height - (oldBottomMargin / 2), // Centered vertically in bottom margin
          { 
            align: 'center',
            width: doc.page.width
          }
        );
      
      doc.page.margins.bottom = oldBottomMargin; // Restore bottom margin
    }

    // End the document and return buffer
    doc.end();

    return new Promise((resolve, reject) => {
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);
    });
  }

  /**
   * Parse Manuscript text into chapters
   * @param {string} text - Raw text content
   * @returns {Array} - Array of chapter objects
   */
  parseManuscriptText(text) {
    const chapters = [];

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Manuscript chapter patterns
    const chapterPatterns = [
      /\n\s*Chapter\s+\d+:\s*[^\n]*\n/gi,        // "Chapter 1: The Big Show"
      /\n\s*Chapter\s+\d+[^\n]*\n/gi,            // "Chapter 1"
      /\n\s*Chapter\s+[IVXLCDM]+:\s*[^\n]*\n/gi, // Roman with colon
      /\n\s*Chapter\s+[IVXLCDM]+[^\n]*\n/gi,     // Roman
      /\n\s*\d+\.\s*[^\n]*\n/g,                  // Numbered
      /\n\s*#{1,3}\s+[^\n]+\n/g,                 // Markdown
      /\n\s*\*\s*\*\s*\*\s*\n/g                  // Separators
    ];

    let splits = [text];
    let chapterTitles = [];

    // Try each pattern to find chapter breaks
    for (const pattern of chapterPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 1) {
        splits = text.split(pattern);
        chapterTitles = matches.map(m => m.trim());
        break;
      }
    }

    // If no patterns found, split by gaps
    if (splits.length === 1) {
      splits = text.split(/\n\s*\n\s*\n\s*\n/);
      if (splits.length === 1) {
        splits = text.split(/\f/);
      }
    }

    // Process each split into chapters
    let chapterCount = 0;
    splits.forEach((section, index) => {
      section = section.trim();
      if (section.length < 50) return;

      let title = '';
      let content = section;

      // If we have chapter titles from pattern matching, use them
      if (chapterTitles.length > 0 && index > 0 && index - 1 < chapterTitles.length) {
        title = chapterTitles[index - 1];
        // Content is already clean since we split by the pattern
      } else {
        // Otherwise check if first line is a chapter title
        const lines = section.split('\n');
        const firstLine = lines[0].trim();
        
        if (this.isManuscriptChapterTitle(firstLine)) {
          title = firstLine;
          content = lines.slice(1).join('\n').trim();
        } else {
          title = `Chapter ${chapterCount + 1}`;
        }
      }

      // Split content into paragraphs
      const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 0);

      if (paragraphs.length > 0) {
        chapters.push({
          id: `chapter${chapterCount + 1}`,
          title: title,
          paragraphs: paragraphs
        });
        chapterCount++;
      }
    });

    // If still no chapters, create one big chapter
    if (chapters.length === 0) {
      const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 0);

      chapters.push({
        id: 'chapter1',
        title: 'Chapter 1',
        paragraphs: paragraphs
      });
    }

    return chapters;
  }

  /**
   * Check if a line looks like a Manuscript chapter title
   * @param {string} line - Line to check
   * @returns {boolean} - True if likely a chapter title
   */
  isManuscriptChapterTitle(line) {
    if (line.length > 120) return false;

    const patterns = [
      /^Chapter\s+\d+:\s*.+/i,
      /^Chapter\s+\d+$/i,
      /^Chapter\s+\d+\s+.+/i,
      /^Chapter\s+[IVXLCDM]+:\s*.+/i,
      /^Chapter\s+[IVXLCDM]+$/i,
      /^\d+\.\s*.+/,
      /^#{1,3}\s+.+/,
      /^[A-Z][A-Z\s]{4,}$/,
    ];

    return patterns.some(pattern => pattern.test(pattern));
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
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

module.exports = ManuscriptToPDF;