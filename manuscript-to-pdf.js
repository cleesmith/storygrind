// manuscript-to-pdf.js
const ToolBase = require('./tool-base');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const appState = require('./state.js');

class ManuscriptToPDF extends ToolBase {
  constructor(name, config = {}) {
    super(name, config);
    // Reuse the same parsing logic from your EPUB converter
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
      
      // REUSE YOUR EXISTING PARSER!
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

  // COPY parseManuscriptText from your EPUB converter
  parseManuscriptText(text) {
    // ... exact same code from manuscript-to-epub.js ...
  }

  // COPY isManuscriptChapterTitle from your EPUB converter  
  isManuscriptChapterTitle(line) {
    // ... exact same code from manuscript-to-epub.js ...
  }

  // NEW: Create PDF using your chapter structure
  async createPDF(chapters, metadata) {
    const pdfDoc = await PDFDocument.create();
    
    // Set metadata
    pdfDoc.setTitle(metadata.title);
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setCreator('StoryGrind');
    pdfDoc.setProducer('pdf-lib (StoryGrind)');
    pdfDoc.setCreationDate(new Date());
    
    // Embed fonts
    const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
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
          
          if (width > format.textWidth) {
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
    
    return await pdfDoc.save();
  }

  // COPY these helper methods from your EPUB converter
  ensureAbsolutePath(filePath, basePath) {
    // ... same code ...
  }
  
  countWords(text) {
    // ... same code ...
  }
}

module.exports = ManuscriptToPDF;
