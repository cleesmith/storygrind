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
    this.pages = 0;
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
      const chapters = this.parseManuscriptText(textContent);
      this.emitOutput(`Found ${chapters.length} chapters\n`);

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

      // Create PDF with all content - now returns object with pdfData and pageCount
      const result = await this.createPDF(chapters, metadata);
      const pdfData = result.pdfData;
      const pageCount = result.pageCount;

      // Save PDF
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(textFile, path.extname(textFile));
      const outputFilename = `${baseFileName}_${timestamp}.pdf`;
      const outputPath = path.join(saveDir, outputFilename);
      let dir = path.dirname(outputPath);
      let files = await fsPromises.readdir(dir);

      // Remove all .pdf files in the output directory before writing the new one
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }

      // Write the PDF data to file
      fs.writeFileSync(outputPath, pdfData);

      // Now you have pageCount available for your KDP cover calculations
      this.emitOutput(`\nGenerated PDF with ${pageCount} pages`);

      this.emitOutput(`\nPDF saved to: ${outputPath}\n`);

      return {
        success: true,
        outputFiles: [outputPath],
        stats: {
          chapterCount: chapters.length,
          wordCount: this.countWords(textContent),
          pages: pageCount
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

    const doc = new PDFDocument({
      size: [432, 648], // 6" x 9"
      margins: {
        top: 72,    // 1 inch
        bottom: 72, // 1 inch
        left: 63,   // 0.875 inches
        right: 63   // 0.875 inches
      },
      autoFirstPage: false,
      displayTitle: false,
      bufferPages: true
    });

    // Register fonts
    doc.registerFont('regular', regularFontPath);
    doc.registerFont('bold', boldFontPath);

    // Set metadata
    doc.info.Title = metadata.title;
    doc.info.Author = metadata.author;
    doc.info.Creator = 'StoryGrind';
    
    // Track pages that should not have headers/numbers
    const skipHeaderPages = new Set();
    const skipPageNumberPages = new Set();
    
    // Add first page and create title page
    doc.addPage();
    this.createTitlePage(doc, metadata);

    // Add copyright page
    this.createCopyrightPage(doc, metadata);

    // Ensure first chapter starts on odd page (right-hand page)
    let currentPageCount = 2; // Title + Copyright
    if (currentPageCount % 2 === 0) {
      doc.addPage(); // Add blank page
      skipHeaderPages.add(currentPageCount);
      skipPageNumberPages.add(currentPageCount);
    }

    // Now create the actual chapters
    chapters.forEach((chapter, chapterIndex) => {
      // Get current page count
      let currentRange = doc.bufferedPageRange();
      currentPageCount = currentRange.count;
      
      // Ensure chapters start on odd pages (right-hand pages)
      if ((currentPageCount + 1) % 2 === 0) {
        doc.addPage(); // Add blank page
        // Mark blank page (0-indexed)
        skipHeaderPages.add(currentPageCount);
        skipPageNumberPages.add(currentPageCount);
      }
      
      doc.addPage(); // Add the chapter page
      
      // Record this as a chapter start page - skip headers but keep page numbers (0-indexed)
      skipHeaderPages.add(doc.bufferedPageRange().count - 1);
      
      // Reset cursor to top margin position - with extra space from top
      doc.y = doc.page.margins.top + 72; // Add 1 inch of extra space at top

      // Extract chapter number and title
      // const chapterMatch = chapter.title.match(/Chapter\s+(\d+|[IVXLCDM]+)(?::\s*)?(.*)$/i);
      const chapterMatch = chapter.title.match(/Chapter\s+(\d+|[IVXLCDM]+)[\.:]?\s*(.*)$/i);
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
    });

    // Add "About the Author" if present
    if (metadata.aboutAuthor && metadata.aboutAuthor.trim()) {
      // Get current page count
      let currentRange = doc.bufferedPageRange();
      currentPageCount = currentRange.count;
      
      // Ensure it starts on odd page
      if ((currentPageCount + 1) % 2 === 0) {
        doc.addPage(); // Add blank page
        skipHeaderPages.add(currentPageCount);
        skipPageNumberPages.add(currentPageCount);
      }

      doc.addPage();
      skipHeaderPages.add(doc.bufferedPageRange().count - 1);
      
      doc.y = doc.page.margins.top + 72;
      doc.font('bold').fontSize(16).text('About the Author', { align: 'center' });
      doc.moveDown(4);
      doc.font('regular').fontSize(11);
      doc.text(metadata.aboutAuthor, { paragraphGap: 2, lineGap: 1 });
    }

    // Now add headers and page numbers to all pages
    const range = doc.bufferedPageRange();
    
    // CRITICAL: Reset cursor position before page numbering loop
    doc.text('', 0, 0);
    
    // Prepare header text
    const authorHeader = metadata.author;
    const titleHeader = this.toTitleCase(metadata.title);
    
    // range.count = total number of pages
    for (let i = 0; i < range.count; i++) {
      // Skip first two pages (title and copyright)
      if (i < 2) continue;
      
      // Switch to page
      doc.switchToPage(i);
      
      // Calculate actual page number (1-based for display)
      const pageNum = i + 1;
      
      // Add headers only if not a chapter start or blank page
      if (!skipHeaderPages.has(i)) {
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
      }
      
      // Footer: Add page number to all pages except blank pages
      if (!skipPageNumberPages.has(i)) {
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
    }

    // End the document and return buffer
    doc.end();

    // return new Promise((resolve, reject) => {
    //   const buffers = [];
    //   doc.on('data', buffers.push.bind(buffers));
    //   doc.on('end', () => {
    //     const pdfData = Buffer.concat(buffers);
    //     resolve(pdfData);
    //   });
    //   doc.on('error', reject);
    // });

    return new Promise((resolve, reject) => {
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve({
          pdfData: pdfData,
          pageCount: range.count
        });
      });
      doc.on('error', reject);
    });

  }

  /**
   * Parse Manuscript text into chapters
   * Supports various title formats with:
   *  ==============                  ==============
   *  DOUBLE NEWLINE before title and SINGLE NEWLINE after title
   *  ==============                  ==============
   * @param {string} text - Raw text content
   * @returns {Array} - Array of chapter objects
   */
  parseManuscriptText(text) {
    const chapters = [];
    
    // Normalize line endings and trim
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    // Split by double (or more) newlines - this gives us potential chapter boundaries
    const sections = text.split(/\n\s*\n\s*\n+/);
    
    let chapterCount = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.length < 50) continue;
      
      // Split section into lines
      const lines = section.split('\n');
      if (lines.length < 2) continue;
      
      // First line could be a title
      const firstLine = lines[0].trim();
      const remainingContent = lines.slice(1).join('\n').trim();
      
      // Check if first line looks like a title (not too long, has content after it)
      if (firstLine && firstLine.length <= 120 && remainingContent.length > 50) {
        chapterCount++;
        
        // Format the title appropriately
        const formattedTitle = this.formatChapterTitle(firstLine, chapterCount);
        
        // Split remaining content into paragraphs
        const paragraphs = remainingContent
          .split(/\n\s*\n/)
          .map(p => p.replace(/\n/g, ' ').trim())
          .filter(p => p.length > 0);
        
        if (paragraphs.length > 0) {
          chapters.push({
            id: `chapter${chapterCount}`,
            title: formattedTitle,
            paragraphs: paragraphs
          });
        }
      } else {
        // Whole section is content without clear title
        chapterCount++;
        
        const paragraphs = section
          .split(/\n\s*\n/)
          .map(p => p.replace(/\n/g, ' ').trim())
          .filter(p => p.length > 0);
        
        if (paragraphs.length > 0) {
          chapters.push({
            id: `chapter${chapterCount}`,
            title: `Chapter ${chapterCount}`,
            paragraphs: paragraphs
          });
        }
      }
    }
    
    // If no chapters found, treat whole text as one chapter
    if (chapters.length === 0) {
      const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 0);
      
      if (paragraphs.length > 0) {
        chapters.push({
          id: 'chapter1',
          title: 'Chapter 1',
          paragraphs: paragraphs
        });
      }
    }
    
    return chapters;
  }

  /**
   * Format a chapter title, preserving existing formats or adding "Chapter N" if needed
   * @param {string} title - Raw title text
   * @param {number} chapterNum - Chapter number for fallback
   * @returns {string} - Formatted title
   */
  formatChapterTitle(title, chapterNum) {
    // Already has "Chapter N" format
    const chapterMatch = title.match(/^Chapter\s+(\d+|[IVXLCDM]+)[\.:]?\s*(.*)$/i);
    if (chapterMatch) {
      const num = chapterMatch[1];
      const subtitle = chapterMatch[2].trim();
      return subtitle ? `Chapter ${num}: ${subtitle}` : `Chapter ${num}`;
    }
    
    // Numbered format like "1. Title"
    const numberedMatch = title.match(/^(\d+)\.\s*(.*)$/);
    if (numberedMatch) {
      const subtitle = numberedMatch[2].trim();
      return subtitle ? `Chapter ${numberedMatch[1]}: ${subtitle}` : `Chapter ${numberedMatch[1]}`;
    }
    
    // Markdown heading
    const markdownMatch = title.match(/^#+\s+(.+)$/);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }
    
    // Scene break markers
    if (/^\*\s*\*\s*\*$/.test(title)) {
      return `Chapter ${chapterNum}`;
    }
    
    // Plain text title - if it's short and looks like a title, keep it as is
    if (title.length <= 80 && !title.includes('.') && !title.includes('?')) {
      // Check if it's all caps or title case - likely a real title
      if (title === title.toUpperCase() || /^[A-Z]/.test(title)) {
        return title;
      }
    }
    
    // Default: add Chapter prefix
    return `Chapter ${chapterNum}: ${title}`;
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