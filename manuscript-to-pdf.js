// manuscript-to-pdf.js
const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const appState = require('./state.js');

// console.log('StandardFonts:', StandardFonts);
// StandardFonts: {
//   Courier: 'Courier',
//   CourierBold: 'Courier-Bold',
//   CourierOblique: 'Courier-Oblique',
//   CourierBoldOblique: 'Courier-BoldOblique',
//   Helvetica: 'Helvetica',
//   HelveticaBold: 'Helvetica-Bold',
//   HelveticaOblique: 'Helvetica-Oblique',
//   HelveticaBoldOblique: 'Helvetica-BoldOblique',
//   TimesRoman: 'Times-Roman',
//   TimesRomanBold: 'Times-Bold',
//   TimesRomanItalic: 'Times-Italic',
//   TimesRomanBoldItalic: 'Times-BoldItalic',
//   Symbol: 'Symbol',
//   ZapfDingbats: 'ZapfDingbats'
// }

class ManuscriptToPDF extends ToolBase {
  constructor(name, config = {}) {
    super(name, config);
  }

  createTitlePage(pdfDoc, metadata, format, fonts) {
    const page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { boldFont, bodyFont } = fonts;
    
    // Title
    const titleY = format.pageHeight / 2 + 100;
    page.drawText(metadata.title, {
      x: format.pageWidth / 2 - boldFont.widthOfTextAtSize(metadata.title, 22) / 2,
      y: titleY,
      size: 22,
      font: boldFont,
    });
    
    // Author
    page.drawText(metadata.author, {
      x: format.pageWidth / 2 - bodyFont.widthOfTextAtSize(metadata.author, 16) / 2,
      y: titleY - 60,
      size: 16,
      font: bodyFont,
    });
    
    // Publisher at bottom
    const publisher = metadata.publisher || 'StoryGrind';
    page.drawText(publisher, {
      x: format.pageWidth / 2 - bodyFont.widthOfTextAtSize(publisher, 11) / 2,
      y: format.bottomMargin,
      size: 11,
      font: bodyFont,
    });
    
    return 1; // page count
  }

  createCopyrightPage(pdfDoc, metadata, format, fonts) {
    const page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { bodyFont } = fonts;
    const year = new Date().getFullYear();
    
    let copyrightText;
    let userCopyrightText = "";
    
    if (metadata.copyright && metadata.copyright.trim()) {
      userCopyrightText = metadata.copyright.split('\n').map(line => line.trim());
    }
    copyrightText = [
      `Copyright © ${year} ${metadata.author}`,
      '',
      'All rights reserved.',
      '',
      `Published by ${metadata.publisher}`,
      '',
      'This is a work of fiction. Names, characters, places, and incidents',
      'either are the product of the author\'s imagination or are used',
      'fictitiously. Any resemblance to actual persons, living or dead,',
      'events, or locales is entirely coincidental.',
      '',
      '',
      `${userCopyrightText}`
    ];
    
    let y = format.pageHeight - format.topMargin - 100;
    
    copyrightText.forEach(line => {
      if (line) {
        page.drawText(line, {
          x: format.leftMargin,
          y: y,
          size: 10,
          font: bodyFont,
        });
      }
      y -= 14;
    });
    
    return 1;
  }

  createTableOfContents(pdfDoc, chapters, format, fonts) {
    let page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { boldFont, bodyFont } = fonts;
    
    // Title
    page.drawText('Contents', {
      x: format.pageWidth / 2 - boldFont.widthOfTextAtSize('Contents', 18) / 2,
      y: format.pageHeight - format.topMargin - 50,
      size: 18,
      font: boldFont,
    });
    
    let y = format.pageHeight - format.topMargin - 160;
    
    chapters.forEach((chapter, index) => {
      // Just chapter title, no page numbers
      page.drawText(chapter.title, {
        x: format.leftMargin,
        y: y,
        size: 11,
        font: bodyFont,
      });
      
      y -= 11;
      
      // Check if we need a new page for long TOCs
      if (y < format.bottomMargin + 40) {
        page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
        y = format.pageHeight - format.topMargin;
      }
    });
    
    return 1;
  }

  createAboutAuthorPage(pdfDoc, metadata, format, fonts) {
    const page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { boldFont, bodyFont } = fonts;
    
    // Title
    page.drawText('About the Author', {
      x: format.pageWidth / 2 - boldFont.widthOfTextAtSize('About the Author', 18) / 2,
      y: format.pageHeight - format.topMargin - 50,
      size: 18,
      font: boldFont,
    });
    
    // Bio text from metadata or default
    let bioText;
    if (metadata.aboutAuthor && metadata.aboutAuthor.trim()) {
      bioText = metadata.aboutAuthor;
    } else {
      bioText = `${metadata.author} is an author who creates compelling stories using StoryGrind for editing and publishing.

When not writing, they enjoy exploring new narrative possibilities and reading well edited books.`;
    }
    
    // Word wrap the bio
    const words = bioText.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = bodyFont.widthOfTextAtSize(testLine, 11);
      
      if (width > format.textWidth * 0.90) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    let y = format.pageHeight - format.topMargin - 100;
    lines.forEach(line => {
      page.drawText(line, {
        x: format.leftMargin,
        y: y,
        size: 11,
        font: bodyFont,
      });
      y -= format.lineHeight;
    });
    
    return 1;
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
      
      const chapters = this.parseManuscriptText(textContent);
      
      // Read project metadata
      const projectMetadata = await this.readProjectMetadata(saveDir);
      
      // Use project metadata
      const metadata = {
        title: projectMetadata.title,
        author: projectMetadata.author,
        language: options.language || 'en',
        publisher: projectMetadata.publisher || 'StoryGrind',
        copyright: projectMetadata.copyright,
        aboutAuthor: projectMetadata.aboutAuthor
      };
      
      // Create PDF
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
      console.error('Error in Manuscript to PDF Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
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
      /\n\s*Chapter\s+\d+:\s*[^\n]*\n/gi,        // Primary: "Chapter 1: The Big Show"
      /\n\s*Chapter\s+\d+[^\n]*\n/gi,            // Fallback: "Chapter 1"
      /\n\s*Chapter\s+[IVXLCDM]+:\s*[^\n]*\n/gi, // Roman with colon
      /\n\s*Chapter\s+[IVXLCDM]+[^\n]*\n/gi,     // Roman
      /\n\s*\d+\.\s*[^\n]*\n/g,                  // Numbered
      /\n\s*#{1,3}\s+[^\n]+\n/g,                 // Markdown
      /\n\s*\*\s*\*\s*\*\s*\n/g                  // Separators
    ];

    let splits = [text];
    
    // Try each pattern to find chapter breaks
    for (const pattern of chapterPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 1) {
        splits = text.split(pattern);
        // Re-add the chapter titles to content
        for (let i = 1; i < splits.length; i++) {
          splits[i] = matches[i - 1].trim() + '\n\n' + splits[i];
        }
        break;
      }
    }

    // If no patterns found, split by gaps
    if (splits.length === 1) {
      console.log('No chapter patterns found, trying gap detection...');
      splits = text.split(/\n\s*\n\s*\n\s*\n/);
      if (splits.length === 1) {
        splits = text.split(/\f/);
      }
    }

    // Process each split into chapters
    splits.forEach((section, index) => {
      section = section.trim();
      if (section.length < 50) return;

      const lines = section.split('\n');
      let title = '';
      let content = section;

      const firstLine = lines[0].trim();
      
      if (this.isManuscriptChapterTitle(firstLine)) {
        title = firstLine;
        content = lines.slice(1).join('\n').trim();
      } else {
        title = `Chapter ${index + 1}`;
      }

      // Split content into paragraphs
      const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 0);

      if (paragraphs.length > 0) {
        chapters.push({
          id: `chapter${index + 1}`,
          title: title,
          content: paragraphs
        });
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
        content: paragraphs
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

    return patterns.some(pattern => pattern.test(line));
  }

  // Create PDF using your chapter structure
  async createPDF(chapters, metadata) {
    const pdfDoc = await PDFDocument.create();
    
    // Set metadata
    pdfDoc.setTitle(metadata.title);
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setCreator('StoryGrind');
    pdfDoc.setProducer('StoryGrind using pdf-lib');
    pdfDoc.setCreationDate(new Date());
    
    const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Create fonts object
    const fonts = {
      bodyFont,
      boldFont
    };
    
    // Format settings - optimized to match Vellum
    const format = {
      pageWidth: 432,     // 6 inches
      pageHeight: 648,    // 9 inches
      leftMargin: 63,     // 0.875 inches
      rightMargin: 63,    // 0.875 inches
      topMargin: 72,      // 1 inch
      bottomMargin: 72,   // 1 inch
      lineHeight: 14,     // Tight spacing for ~30 lines per page
      bodyFontSize: 10,
      chapterTitleSize: 14,
      chapterNumSize: 13,
      paragraphIndent: 28,
      textWidth: 432 - 63 - 60,
      paragraphSpacing: 2  // Minimal paragraph spacing
    };
    
    let pageNum = 1;

    // 1. Title Page
    pageNum += this.createTitlePage(pdfDoc, metadata, format, fonts);

    // 2. Copyright Page
    pageNum += this.createCopyrightPage(pdfDoc, metadata, format, fonts);

    // 3. Table of Contents
    pageNum += this.createTableOfContents(pdfDoc, chapters, format, fonts);
    
    // Process each chapter
    chapters.forEach((chapter, chapterIndex) => {
      // Add chapter page (title and body on same page)
      let page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
      
      // Start position for chapter heading
      let y = format.pageHeight - format.topMargin - 80;
      
      // Extract chapter number if present in title
      const chapterMatch = chapter.title.match(/Chapter\s+(\d+|[IVXLCDM]+)/i);
      if (chapterMatch) {
        // Draw chapter number centered
        const chapterNum = chapterMatch[1];
        const numWidth = bodyFont.widthOfTextAtSize(chapterNum, format.chapterNumSize);
        page.drawText(chapterNum, {
          x: format.pageWidth / 2 - numWidth / 2,
          y: y,
          size: format.chapterNumSize,
          font: bodyFont,
        });
        y -= 30;  // Space between number and title
        
        // Draw title (without chapter number) centered
        const titleOnly = chapter.title.replace(chapterMatch[0], '').replace(/^:\s*/, '').trim();
        if (titleOnly) {
          const titleWidth = boldFont.widthOfTextAtSize(titleOnly.toUpperCase(), format.chapterTitleSize);
          page.drawText(titleOnly.toUpperCase(), {
            x: format.pageWidth / 2 - titleWidth / 2,
            y: y,
            size: format.chapterTitleSize,
            font: boldFont,
          });
        }
        y -= 60;  // Space before body text starts
      } else {
        // Just draw the title centered
        const titleWidth = boldFont.widthOfTextAtSize(chapter.title, format.chapterTitleSize);
        page.drawText(chapter.title, {
          x: format.pageWidth / 2 - titleWidth / 2,
          y: y,
          size: format.chapterTitleSize,
          font: boldFont,
        });
        y -= 60;  // Space before body text starts
      }
      
      // Process paragraphs on the same page
      chapter.content.forEach((paragraph, paraIndex) => {
        // Word wrap with smart quote handling
        const words = paragraph.split(/\s+/);
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = bodyFont.widthOfTextAtSize(testLine, format.bodyFontSize);
          
          if (width > format.textWidth * 0.90) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        // Draw each line
        lines.forEach((line, lineIndex) => {
          // Check if we need a new page
          if (y < format.bottomMargin + 10) {
            // Add page number centered at bottom
            page.drawText(String(pageNum), {
              x: format.pageWidth / 2 - 10,
              y: format.bottomMargin - 20,
              size: 10,
              font: bodyFont,
            });
            
            // Create new page
            page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
            y = format.pageHeight - format.topMargin;
            pageNum++;
          }
          
          // First line of paragraph gets indent (except first paragraph of chapter)
          const x = (lineIndex === 0 && paraIndex > 0) ? 
            format.leftMargin + format.paragraphIndent : 
            format.leftMargin;
          
          page.drawText(line, {
            x: x,
            y: y,
            size: format.bodyFontSize,
            font: bodyFont,
          });
          
          y -= format.lineHeight;
        });
        
        // Minimal space between paragraphs
        if (paraIndex < chapter.content.length - 1) {
          y -= format.paragraphSpacing;
        }
      });
      
      // Add page number to last page of chapter
      page.drawText(String(pageNum), {
        x: format.pageWidth / 2 - 10,
        y: format.bottomMargin - 20,
        size: 10,
        font: bodyFont,
      });
      pageNum++;
    });

    // 5. About the Author (at the end)
    this.createAboutAuthorPage(pdfDoc, metadata, format, fonts);
    
    return await pdfDoc.save();
  }
  
  /**
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    
    // Check if the path is already absolute
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Make the path absolute by joining with the base path
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