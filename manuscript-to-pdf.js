// manuscript-to-pdf.js
const ToolBase = require('./tool-base');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const appState = require('./state.js');

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
      x: format.pageWidth / 2 - boldFont.widthOfTextAtSize(metadata.title, 24) / 2,
      y: titleY,
      size: 24,
      font: boldFont,
    });
    
    // Author
    page.drawText(metadata.author, {
      x: format.pageWidth / 2 - bodyFont.widthOfTextAtSize(metadata.author, 18) / 2,
      y: titleY - 60,
      size: 18,
      font: bodyFont,
    });
    
    // Publisher at bottom
    const publisher = metadata.publisher || 'StoryGrind';
    page.drawText(publisher, {
      x: format.pageWidth / 2 - bodyFont.widthOfTextAtSize(publisher, 12) / 2,
      y: format.bottomMargin,
      size: 12,
      font: bodyFont,
    });
    
    return 1; // page count
  }

  createCopyrightPage(pdfDoc, metadata, format, fonts) {
    const page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { bodyFont } = fonts;
    const year = new Date().getFullYear();
    
    const copyrightText = [
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
      `First Edition: ${year}`
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
      y -= 16;
    });
    
    return 1;
  }

  createTableOfContents(pdfDoc, chapters, format, fonts) {
    const page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
    const { boldFont, bodyFont } = fonts;
    
    // Title
    page.drawText('Contents', {
      x: format.pageWidth / 2 - boldFont.widthOfTextAtSize('Contents', 18) / 2,
      y: format.pageHeight - format.topMargin - 50,
      size: 18,
      font: boldFont,
    });
    
    let y = format.pageHeight - format.topMargin - 120;
    
    chapters.forEach((chapter, index) => {
      // Just chapter title, no page numbers
      page.drawText(chapter.title, {
        x: format.leftMargin,
        y: y,
        size: 12,
        font: bodyFont,
      });
      
      y -= 20;
      
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
    
    // Bio text (you can customize this)
    const bioText = `${metadata.author} is an author who creates compelling stories using StoryGrind for editing and publishing as 'Slip the Trap'. When not writing, they enjoy exploring new narrative possibilities and connecting with readers.`;
    
    // Word wrap the bio
    const words = bioText.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = bodyFont.widthOfTextAtSize(testLine, 12);
      
      if (width > format.textWidth * 0.92) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    let y = format.pageHeight - format.topMargin - 120;
    lines.forEach(line => {
      page.drawText(line, {
        x: format.leftMargin,
        y: y,
        size: 12,
        font: bodyFont,
      });
      y -= format.lineHeight;
    });
    
    return 1;
  }


  async execute(options) {
console.dir(options);
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
      
      // Extract metadata
      const metadata = {
        title: options.title || options.displayTitle,
        author: options.author || appState.getAuthorName(),
        language: options.language || 'en',
        publisher: options.publisher || 'StoryGrind'
      };
      
      // Create PDF
      const pdfBuffer = await this.createPDF(chapters, metadata);
      
      // Save PDF
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(textFile, path.extname(textFile));
      const outputFilename = `${baseFileName}_${timestamp}.pdf`;
      const outputPath = path.join(saveDir, outputFilename);
      
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
    
    // Use Helvetica fonts - better KDP compatibility than Times
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Create fonts object
    const fonts = {
      bodyFont,
      boldFont
    };
    
    // Format settings (based on Vellum analysis)
    const format = {
      pageWidth: 432,     // 6 inches
      pageHeight: 648,    // 9 inches
      leftMargin: 63,
      rightMargin: 63,
      topMargin: 72,
      bottomMargin: 72,
      lineHeight: 22,
      bodyFontSize: 12,
      chapterTitleSize: 18,
      chapterNumSize: 16,
      paragraphIndent: 36,
      textWidth: 432 - 63 - 63
    };
    
    let pageNum = 1;

    // 1. Title Page
    pageNum += this.createTitlePage(pdfDoc, metadata, format, fonts);

    // 2. Copyright Page
    pageNum += this.createCopyrightPage(pdfDoc, metadata, format, fonts);

    // 3. Table of Contents
    pageNum += this.createTableOfContents(pdfDoc, chapters, format, fonts);
    
    // Process each chapter (using YOUR structure)
    chapters.forEach((chapter, chapterIndex) => {
      // Add chapter title page
      let page = pdfDoc.addPage([format.pageWidth, format.pageHeight]);
      let y = format.pageHeight - 200;
      
      // Extract chapter number if present in title
      const chapterMatch = chapter.title.match(/Chapter\s+(\d+|[IVXLCDM]+)/i);
      if (chapterMatch) {
        // Draw chapter number
        page.drawText(chapterMatch[0], {
          x: format.leftMargin,
          y: y,
          size: format.chapterNumSize,
          font: bodyFont,
        });
        y -= 30;
        
        // Draw title (without chapter number)
        const titleOnly = chapter.title.replace(chapterMatch[0], '').replace(/^:\s*/, '').trim();
        if (titleOnly) {
          page.drawText(titleOnly, {
            x: format.leftMargin,
            y: y,
            size: format.chapterTitleSize,
            font: boldFont,
          });
        }
      } else {
        // Just draw the title
        page.drawText(chapter.title, {
          x: format.leftMargin,
          y: y,
          size: format.chapterTitleSize,
          font: boldFont,
        });
      }
      
      y -= 60;
      
      // Process paragraphs (YOUR content array)
      chapter.content.forEach((paragraph, paraIndex) => {
        // Word wrap
        const words = paragraph.split(/\s+/);
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = bodyFont.widthOfTextAtSize(testLine, format.bodyFontSize);
          
          if (width > format.textWidth * 0.92) {
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
          if (y < format.bottomMargin + 40) {
            // Add page number
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
          
          // First line of paragraph gets indent
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
        
        // Extra space between paragraphs
        y -= format.lineHeight * 0.5;
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