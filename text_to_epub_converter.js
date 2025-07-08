#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * Text to EPUB 3.0 Converter for StoryGrind
 * Full-width layout like Vellum
 */
class StoryGrindEpub3Converter {
  constructor() {
    this.defaultMetadata = {
      title: 'Untitled Book',
      author: 'Unknown Author',
      language: 'en',
      publisher: 'StoryGrind',
      description: 'Created with StoryGrind EPUB Converter'
    };
  }

  /**
   * Convert folder name to proper book title
   * @param {string} folderName - Raw folder name
   * @returns {string} - Formatted book title
   */
  formatFolderNameAsTitle(folderName) {
    let title = folderName;
    
    // Handle camelCase: "ADarkerRoast" → "A Darker Roast"
    title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Handle kebab-case and snake_case
    title = title.replace(/[-_]/g, ' ');
    
    // Convert to Title Case
    title = title.replace(/\b\w+/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    // Clean up multiple spaces
    title = title.replace(/\s+/g, ' ').trim();
    
    return title;
  }

  /**
   * Convert text file to EPUB 3.0
   * @param {string} textFilePath - Path to text file
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Buffer>} - EPUB file as buffer
   */
  async convertToEpub(textFilePath, metadata = {}) {
    const textContent = fs.readFileSync(textFilePath, 'utf8');
    
    // Extract title from parent folder name
    if (!metadata.title) {
      const parentDir = path.dirname(textFilePath);
      const folderName = path.basename(parentDir);
      metadata.title = this.formatFolderNameAsTitle(folderName);
    }

    const bookMeta = { ...this.defaultMetadata, ...metadata };
    
    console.log(`Converting to EPUB 3.0: ${textFilePath}`);
    console.log(`Folder: ${path.basename(path.dirname(textFilePath))}`);
    console.log(`Title: ${bookMeta.title}`);
    console.log(`Author: ${bookMeta.author}`);
    
    const chapters = this.parseStoryGrindText(textContent);
    console.log(`Found ${chapters.length} chapters`);
    
    const epub = await this.createEpub3Structure(chapters, bookMeta);
    
    return epub;
  }

  /**
   * Parse StoryGrind text into chapters
   * @param {string} text - Raw text content
   * @returns {Array} - Array of chapter objects
   */
  parseStoryGrindText(text) {
    const chapters = [];
    
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // StoryGrind chapter patterns
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
        console.log(`Using StoryGrind pattern (found ${matches.length} chapters)`);
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
      
      if (this.isStoryGrindChapterTitle(firstLine)) {
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
        console.log(`  Chapter: "${title}" (${paragraphs.length} paragraphs)`);
      }
    });

    // If still no chapters, create one big chapter
    if (chapters.length === 0) {
      console.log('Creating single chapter from entire text...');
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
   * Check if a line looks like a StoryGrind chapter title
   * @param {string} line - Line to check
   * @returns {boolean} - True if likely a chapter title
   */
  isStoryGrindChapterTitle(line) {
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

  /**
   * Create EPUB 3.0 structure
   * @param {Array} chapters - Parsed chapters
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Buffer>} - EPUB file as buffer
   */
  async createEpub3Structure(chapters, metadata) {
    const zip = new JSZip();

    // 1. Add mimetype (uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. Create META-INF/container.xml
    const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.file('META-INF/container.xml', containerXML);

    // 3. Create chapter HTML files
    chapters.forEach(chapter => {
      const chapterHTML = this.createChapterHTML(chapter, metadata);
      zip.file(`OEBPS/${chapter.id}.xhtml`, chapterHTML);
    });

    // 4. Create content.opf (EPUB 3.0 format)
    const contentOPF = this.createEpub3ContentOPF(chapters, metadata);
    zip.file('OEBPS/content.opf', contentOPF);

    // 5. Create nav.xhtml (EPUB 3.0 navigation)
    const navXHTML = this.createNavXHTML(chapters, metadata);
    zip.file('OEBPS/nav.xhtml', navXHTML);

    // 6. Create CSS file - FULL WIDTH like Vellum
    const styleCSS = this.createFullWidthCSS();
    zip.file('OEBPS/style.css', styleCSS);

    // Generate and return the EPUB
    const epubBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return epubBuffer;
  }

  /**
   * Create HTML for a chapter
   * @param {Object} chapter - Chapter data
   * @param {Object} metadata - Book metadata
   * @returns {string} - Chapter HTML
   */
  createChapterHTML(chapter, metadata) {
    const paragraphs = chapter.content
      .map(p => `    <p>${this.escapeHTML(p)}</p>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeHTML(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section class="chapter" epub:type="chapter">
    <h1>${this.escapeHTML(chapter.title)}</h1>
${paragraphs}
  </section>
</body>
</html>`;
  }

  /**
   * Create EPUB 3.0 content.opf file
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - OPF content
   */
  createEpub3ContentOPF(chapters, metadata) {
    const uuid = this.generateUUID();
    const date = new Date().toISOString().split('T')[0];

    const manifest = chapters
      .map(ch => `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('\n');

    const spine = chapters
      .map(ch => `    <itemref idref="${ch.id}"/>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" prefix="cc: http://creativecommons.org/ns#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${this.escapeHTML(metadata.title)}</dc:title>
    <dc:creator>${this.escapeHTML(metadata.author)}</dc:creator>
    <dc:language>${metadata.language}</dc:language>
    <dc:publisher>${this.escapeHTML(metadata.publisher)}</dc:publisher>
    <dc:description>${this.escapeHTML(metadata.description)}</dc:description>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
  }

  /**
   * Create EPUB 3.0 navigation document
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - Navigation HTML
   */
  createNavXHTML(chapters, metadata) {
    const navItems = chapters
      .map(ch => `      <li><a href="${ch.id}.xhtml">${this.escapeHTML(ch.title)}</a></li>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Navigation</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
  }

  /**
   * Create FULL WIDTH CSS like Vellum
   * @returns {string} - CSS content
   */
  createFullWidthCSS() {
    return `/* StoryGrind EPUB 3.0 Styles - Full Width */
html {
  font-size: 100%;
}

body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.6;
  margin: 0;
  padding: 2em 1.5em;
  color: #333333;
  background: #ffffff;
  text-align: justify;
  /* NO max-width - use full screen like Vellum */
}

.chapter {
  margin-bottom: 3em;
  page-break-before: always;
}

h1 {
  font-size: 1.8em;
  font-weight: normal;
  margin: 0 0 2em 0;
  text-align: center;
  color: #444444;
  border-bottom: 1px solid #cccccc;
  padding-bottom: 0.5em;
}

p {
  margin: 0 0 1.2em 0;
  text-indent: 2em;
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
}

p:first-of-type {
  text-indent: 0;
}

p:first-of-type::first-letter {
  font-size: 3.5em;
  line-height: 0.8;
  float: left;
  margin: 0.1em 0.1em 0 0;
  font-weight: bold;
}

/* Navigation styles */
nav[epub|type~="toc"] h1 {
  text-align: center;
  margin-bottom: 1em;
}

nav[epub|type~="toc"] ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

nav[epub|type~="toc"] li {
  margin: 0.5em 0;
  text-align: center;
}

nav[epub|type~="toc"] a {
  text-decoration: none;
  color: #333;
}

/* Responsive - maintain full width but adjust padding */
@media screen and (max-width: 600px) {
  body {
    padding: 1.5em 1em;
  }
  
  h1 {
    font-size: 1.5em;
  }
  
  p {
    text-indent: 1.5em;
  }
}`;
  }

  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate a simple UUID
   * @returns {string} - UUID string
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Save EPUB file to disk
   * @param {Buffer} epubBuffer - EPUB file as buffer
   * @param {string} filename - Filename for output
   */
  saveEpub(epubBuffer, filename) {
    const outputPath = filename.endsWith('.epub') ? filename : filename + '.epub';
    fs.writeFileSync(outputPath, epubBuffer);
    console.log(`✅ EPUB 3.0 saved: ${outputPath}`);
    console.log(`📊 File size: ${(epubBuffer.length / 1024).toFixed(1)} KB`);
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('StoryGrind EPUB 3.0 Converter - Full Width');
    console.log('=========================================');
    console.log('Usage: node epub3-converter.js <path/to/manuscript.txt> [output.epub]');
    console.log('');
    console.log('Features:');
    console.log('• EPUB 3.0 format (like Vellum)');
    console.log('• Full-width layout (no max-width constraint)');
    console.log('• Uses folder name as book title');
    console.log('• StoryGrind chapter format support');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    const converter = new StoryGrindEpub3Converter();
    
    const parentDir = path.dirname(inputFile);
    const folderName = path.basename(parentDir);
    const bookTitle = converter.formatFolderNameAsTitle(folderName);
    
    const defaultOutput = bookTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '') + '.epub';
    const finalOutput = outputFile || defaultOutput;
    
    const metadata = {
      title: bookTitle,
      author: 'StoryGrind Author',
      description: `Generated from StoryGrind project: ${folderName}`
    };

    console.log('StoryGrind EPUB 3.0 Converter');
    console.log('=============================');
    
    const epubBuffer = await converter.convertToEpub(inputFile, metadata);
    converter.saveEpub(epubBuffer, finalOutput);
    
    console.log('=============================');
    console.log('✅ EPUB 3.0 conversion complete!');
    console.log('📱 Full-width layout like Vellum');
    
  } catch (error) {
    console.error('❌ Error creating EPUB:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StoryGrindEpub3Converter;