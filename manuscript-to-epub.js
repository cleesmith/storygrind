// manuscript-to-epub.js
// Updated with toc.ncx, title page, contents page, and font support for Vellum compatibility
const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const JSZip = require('jszip');
const appState = require('./state.js');

/**
 * ManuscriptToEpub Tool
 * Converts manuscript text files to EPUB format
 */
class ManuscriptToEpub extends ToolBase {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {Object} config - Tool configuration
   */
  constructor(name, config = {}) {
    super(name, config);
    this.defaultMetadata = {
      title: 'Unknown',
      author: 'Unknown',
      language: 'en',
      publisher: 'StoryGrind',
      description: 'Created with StoryGrind EPUB Converter'
    };
  }

  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    let errorMsg = "";
    
    // Extract options
    let textFile = options.text_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    // Ensure file paths are absolute
    textFile = this.ensureAbsolutePath(textFile, saveDir);

    const outputFiles = [];
    
    try {
      // Read the input file
      this.emitOutput(`Reading text file: ${textFile}\n`);
      
      // Check if file exists
      if (!fs.existsSync(textFile)) {
        throw new Error(`File not found: ${textFile}`);
      }
      
      this.emitOutput(`Converting text to EPUB 3.0 (Vellum-compatible)...\n`);
      
      if (errorMsg) {
        this.emitOutput(errorMsg + '\n');
        return {
          success: false,
          message: errorMsg,
          outputFiles: [],
          stats: {
            chapterCount: 0,
            wordCount: 0
          }
        };
      }

      // Extract metadata from options or use appState
      const metadata = {
        title: (options.title && options.title.trim()) ? options.title.trim() : undefined,
        author: options.author || appState.AUTHOR_NAME,
        language: options.language || this.defaultMetadata.language,
        publisher: options.publisher || this.defaultMetadata.publisher,
        description: options.description || this.defaultMetadata.description
      };

      // If user provided a new author name, persist it for future use
      if (options.author && options.author.trim() && options.author.trim() !== appState.AUTHOR_NAME) {
        appState.setAuthorName(options.author.trim());
      }

      // Convert to EPUB and get chapter info
      const result = await this.convertToEpub(textFile, metadata);
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(textFile, path.extname(textFile));
      const outputFilename = `${baseFileName}_${timestamp}.epub`;
      const outputPath = path.join(saveDir, outputFilename);

      let dir = path.dirname(outputPath);
      let files = await fsPromises.readdir(dir);

      // Remove all .epub files in the output directory before writing the new one
      for (const file of files) {
        if (file.endsWith('.epub')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }

      // Remove all cover.* (.svg/.jpg) files in the output directory before writing the new one
      for (const file of files) {
        if (file.startsWith('cover.')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }
      
      // Write the EPUB file
      await fsPromises.writeFile(outputPath, result.epubBuffer);
      
      this.emitOutput(`\nEPUB with Vellum-Kindle-compatible structure saved to: ${outputPath}\n`);
      
      // Final check - do the cover files still exist?
      const finalSvgPath = path.join(saveDir, 'cover.svg');
      const finalJpgPath = path.join(saveDir, 'cover.jpg');
      const finalSvgExists = fs.existsSync(finalSvgPath);
      const finalJpgExists = fs.existsSync(finalJpgPath);
      this.emitOutput(`Final check - SVG exists: ${finalSvgExists}, JPG exists: ${finalJpgExists}\n`);
      
      // Get word count from the text file
      const textContent = fs.readFileSync(textFile, 'utf8');
      const chapters = result.chapters;
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: chapters.length,
          wordCount: this.countWords(textContent)
        }
      };
    } catch (error) {
      console.error('Error in Manuscript to EPUB Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
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

    // Handle apostrophes
    title = title.toLowerCase().replace(/^.|(?<=\s)\w/g, l => l.toUpperCase());
    
    return title;
  }

  /**
   * Convert text file to EPUB 3.0
   * @param {string} textFilePath - Path to text file
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} - Object with epubBuffer and chapters
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
    
    const chapters = this.parseManuscriptText(textContent);
    
    const epubBuffer = await this.createEpub3Structure(chapters, bookMeta);
    
    return {
      epubBuffer,
      chapters
    };
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

  /**
   * Create NCX file for EPUB 2 compatibility (NEW)
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - NCX content
   */
  createTocNCX(chapters, metadata) {
    const uuid = this.generateUUID();
    
    // Build navMap entries for each chapter
    const navPoints = [];
    let playOrder = 1;
    
    // Add title page
    navPoints.push(`    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>Title Page</text>
      </navLabel>
      <content src="title-page.xhtml"/>
    </navPoint>`);
    playOrder++;
    
    // Add contents
    navPoints.push(`    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>Contents</text>
      </navLabel>
      <content src="contents.xhtml"/>
    </navPoint>`);
    playOrder++;
    
    // Add chapters
    chapters.forEach(chapter => {
      navPoints.push(`    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>${this.escapeHTML(chapter.title)}</text>
      </navLabel>
      <content src="${chapter.id}.xhtml"/>
    </navPoint>`);
      playOrder++;
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${this.escapeHTML(metadata.title)}</text>
  </docTitle>
  <docAuthor>
    <text>${this.escapeHTML(metadata.author)}</text>
  </docAuthor>
  <navMap>
${navPoints.join('\n')}
  </navMap>
</ncx>`;
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
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
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
   * Create EPUB 3.0 content.opf file with all Vellum-compatible components
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @param {string} coverImageId - Cover image ID
   * @returns {string} - OPF content
   */
  createEpub3ContentOPF(chapters, metadata, coverImageId = null) {
    const uuid = this.generateUUID();
    const date = new Date().toISOString().split('T')[0];

    // Cover metadata and manifest
    let coverMeta = '';
    let coverManifest = '';
    
    if (coverImageId) {
      coverMeta = `    <meta name="cover" content="${coverImageId}"/>`;
      coverManifest = `    <item id="${coverImageId}" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
    }

    const manifest = chapters
      .map(ch => `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('\n');

    // Update spine to include title page and contents
    const spineItems = [
      '    <itemref idref="title-page"/>',
      '    <itemref idref="contents"/>',
      ...chapters.map(ch => `    <itemref idref="${ch.id}"/>`)
    ].join('\n');

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
${coverMeta}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="title-page" href="title-page.xhtml" media-type="application/xhtml+xml"/>
    <item id="contents" href="contents.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="css/style.css" media-type="text/css"/>
    <item id="media-css" href="css/media.css" media-type="text/css"/>
${coverManifest}
${manifest}
  </manifest>
  <spine toc="toc">
${spineItems}
  </spine>
</package>`;
  }

  /**
    <item id="font-license" href="fonts/SIL-Open-Font-License-1.1.txt" media-type="text/plain"/>

   * Create EPUB 3.0 navigation document (updated for new pages)
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - Navigation HTML
   */
  createNavXHTML(chapters, metadata) {
    const navItems = [
      '      <li><a href="title-page.xhtml">Title Page</a></li>',
      '      <li><a href="contents.xhtml">Contents</a></li>',
      ...chapters.map(ch => `      <li><a href="${ch.id}.xhtml">${this.escapeHTML(ch.title)}</a></li>`)
    ].join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Navigation</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
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
/*
@font-face {
  font-family: 'Atkinson Hyperlegible';
  src: url('../fonts/AtkinsonHyperlegible-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Atkinson Hyperlegible';
  src: url('../fonts/AtkinsonHyperlegible-Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}
*/

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

/* Title page styles */
.title-page {
  text-align: center;
  padding: 20% 0;
  page-break-after: always;
}

.book-title {
  font-size: 3em;
  font-weight: bold;
  margin: 0 0 0.5em 0;
  color: #222;
  font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
}

.book-author {
  font-size: 1.5em;
  margin: 0 0 2em 0;
  color: #555;
  font-style: italic;
}

.publisher-info {
  position: absolute;
  bottom: 3em;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.9em;
  color: #777;
}

/* Contents page styles */
.contents-page {
  page-break-after: always;
}

.contents-page h1 {
  text-align: center;
  font-size: 2em;
  margin: 2em 0 1.5em 0;
  font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
}

.book-toc ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.book-toc li {
  margin: 0.8em 0;
  text-align: left;
  font-size: 1.1em;
}

.book-toc a {
  text-decoration: none;
  color: #333;
  display: block;
  border-bottom: 1px dotted #ccc;
  padding-bottom: 0.3em;
}

.book-toc a:hover {
  color: #000;
  border-bottom-color: #666;
}

/* Chapter styles */
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
  font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
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
  font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
}

/* Navigation styles */
nav[epub|type~="toc"] h1 {
  text-align: center;
  margin-bottom: 1em;
  font-family: 'Atkinson Hyperlegible', Arial, sans-serif;
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
  
  .book-title {
    font-size: 2em;
  }
  
  .book-author {
    font-size: 1.2em;
  }
}`;
  }

  /**
   * Create media-specific CSS (NEW)
   * @returns {string} - Media CSS content
   */
  createMediaCSS() {
    return `/* Media-specific styles for EPUB readers */
@media amzn-kf8 {
  /* Kindle-specific styles */
  body {
    font-family: Georgia, serif;
  }
  
  p:first-of-type::first-letter {
    font-size: 3em; /* Slightly smaller for Kindle */
  }
}

@media amzn-mobi {
  /* Legacy Kindle styles */
  body {
    font-family: serif;
  }
  
  p:first-of-type::first-letter {
    font-size: 1em; /* Disable drop caps for old Kindles */
    float: none;
    margin: 0;
  }
}

/* Apple Books specific */
@media (-webkit-min-device-pixel-ratio: 1.0) {
  body {
    -webkit-text-size-adjust: 100%;
  }
}

/* Print styles */
@media print {
  body {
    font-size: 11pt;
    line-height: 1.5;
  }
  
  .chapter {
    page-break-before: always;
  }
  
  h1 {
    page-break-after: avoid;
  }
}`;
  }

  /**
   * Create font license text (NEW)
   * @returns {string} - License text
   */
  createFontLicense() {
    return `Copyright 2020 Braille Institute of America, Inc.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.`;
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
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
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
   * Generate advanced SVG cover content (no file save)
   * @param {Object} metadata - Book metadata
   * @returns {string} - SVG content as string
   */
  async generateSVGCover(metadata) {
    const projectName = metadata.title || 'Unknown';
    const displayTitle = metadata.title || 'Unknown';
    const authorName = metadata.author || 'Anonymous';

    // Gradient logic
    const getRandomGradient = () => {
      const gradientPresets = [
        { start: '#CC4444', end: '#3AA399' }, { start: '#C48829', end: '#4A5CC8' },
        { start: '#C94A64', end: '#5566C9' }, { start: '#C85A7A', end: '#CCB030' },
        { start: '#4455B8', end: '#5A3B7A' }, { start: '#1A77C1', end: '#C23629' },
        { start: '#3444A8', end: '#A040A0' }, { start: '#0077B7', end: '#66A8A5' },
        { start: '#0D7766', end: '#2BBD5D' }, { start: '#448925', end: '#88B851' },
        { start: '#CC7844', end: '#CC5566' }, { start: '#9B2951', end: '#1A1F59' },
        { start: '#6E25B2', end: '#3800B0' }, { start: '#CC0077', end: '#392A38' },
        { start: '#903772', end: '#C14B61' }, { start: '#2D2F36', end: '#3466C2' },
        { start: '#2A0029', end: '#096B71' }, { start: '#1A1724', end: '#746B83' },
        { start: '#4F356D', end: '#414F7D' }, { start: '#24313C', end: '#2A76A9' }
      ];
      const gradient = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];
      if (Math.random() < 0.2) return { start: gradient.end, end: gradient.start };
      return gradient;
    };

    // Advanced Abstract Art Generator: adds stars, blobs, zigzags
    function getAbstractArt(innerX, innerY, innerWidth, innerHeight) {
      const shapes = [];
      const colors = [
        '#ffffff', '#ededed', '#c9f1fa', '#ffa5b0', '#ffd6a5', '#f3f0ff', '#b9fbc0', '#c0b6f7', '#fff5c8',
        '#a9def9', '#e4c1f9', '#f694c1', '#f6c6ea', '#b8bedd', '#d0f4de', '#fed6bc', '#c7ceea', '#e2f0cb'
      ];
      const numShapes = 50 + Math.floor(Math.random() * 9);
      for (let i = 0; i < numShapes; i++) {
        const shapeTypeRand = Math.random();
        const color = colors[Math.floor(Math.random() * colors.length)];
        const opacity = 0.08 + Math.random() * 0.19; // 0.08–0.27
        if (shapeTypeRand < 0.15) {
          // Circles
          const maxR = Math.min(innerWidth, innerHeight) / 5.5;
          const r = 22 + Math.random() * (maxR - 22);
          const cx = innerX + r + Math.random() * (innerWidth - 2*r);
          const cy = innerY + r + Math.random() * (innerHeight - 2*r);
          shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.26) {
          // Stars (5 or 6 points)
          const cx = innerX + 40 + Math.random() * (innerWidth - 80);
          const cy = innerY + 40 + Math.random() * (innerHeight - 80);
          const points = Math.random() < 0.7 ? 5 : 6;
          const outer = 32 + Math.random() * 55;
          const innerR = outer * (0.38 + Math.random()*0.22);
          let starPts = [];
          for (let j = 0; j < points * 2; j++) {
            const ang = Math.PI * j / points;
            const r = (j % 2 === 0) ? outer : innerR;
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            starPts.push(`${Math.max(innerX, Math.min(innerX+innerWidth, x)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, y)).toFixed(1)}`);
          }
          shapes.push(`<polygon points="${starPts.join(' ')}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.38) {
          // Blobs: SVG path, 7–9 points, random radii
          const cx = innerX + 60 + Math.random() * (innerWidth - 120);
          const cy = innerY + 60 + Math.random() * (innerHeight - 120);
          const pts = 7 + Math.floor(Math.random()*3);
          const baseR = 38 + Math.random() * 36;
          let d = '';
          for (let k = 0; k < pts; k++) {
            const ang = Math.PI * 2 * k / pts;
            const r = baseR * (0.8 + Math.random()*0.5);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            d += (k === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
          }
          d += ` Z`;
          shapes.push(`<path d="${d}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.53) {
          // Zigzags (polyline)
          const zigX = innerX + 20 + Math.random() * (innerWidth - 40);
          const zigY = innerY + 20 + Math.random() * (innerHeight - 40);
          const zigLen = 6 + Math.floor(Math.random()*3);
          let pts = [];
          let lastX = zigX, lastY = zigY;
          const segment = 28 + Math.random() * 22;
          for (let z = 0; z < zigLen; z++) {
            lastX += segment * (z%2 === 0 ? 1 : -1);
            lastY += 22 + Math.random()*22;
            pts.push(`${Math.max(innerX, Math.min(innerX+innerWidth, lastX)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, lastY)).toFixed(1)}`);
          }
          shapes.push(`<polyline points="${zigX.toFixed(1)},${zigY.toFixed(1)} ${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${7 + Math.random()*6}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.65) {
          // Triangles/Quads
          const px = [];
          const baseX = innerX + 20 + Math.random() * (innerWidth - 40);
          const baseY = innerY + 20 + Math.random() * (innerHeight - 40);
          const pts = (Math.random() < 0.7 ? 3 : 4);
          for (let p = 0; p < pts; p++) {
            const angle = (Math.PI * 2 / pts) * p + Math.random() * 0.65;
            const radius = 36 + Math.random() * 95;
            const x = baseX + Math.cos(angle) * radius;
            const y = baseY + Math.sin(angle) * radius;
            px.push(`${Math.max(innerX, Math.min(innerX+innerWidth, x)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, y)).toFixed(1)}`);
          }
          shapes.push(`<polygon points="${px.join(' ')}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.80) {
          // Ellipses
          const rx = 18 + Math.random() * 80;
          const ry = 12 + Math.random() * 65;
          const cx = innerX + rx + Math.random() * (innerWidth - 2*rx);
          const cy = innerY + ry + Math.random() * (innerHeight - 2*ry);
          shapes.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.95) {
          // Bars (rectangles)
          const w = 30 + Math.random() * 60;
          const h = 8 + Math.random() * 42;
          const x = innerX + Math.random() * (innerWidth - w);
          const y = innerY + Math.random() * (innerHeight - h);
          const angle = Math.random() * 360;
          shapes.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${angle.toFixed(1)},${(x+w/2).toFixed(1)},${(y+h/2).toFixed(1)})" rx="${(h/3).toFixed(1)}" />`);
        } else {
          // Wavy Paths
          const startX = innerX + 14 + Math.random() * (innerWidth - 28);
          const startY = innerY + 14 + Math.random() * (innerHeight - 28);
          const curveX = innerX + 14 + Math.random() * (innerWidth - 28);
          const curveY = innerY + 14 + Math.random() * (innerHeight - 28);
          const endX = innerX + 14 + Math.random() * (innerWidth - 28);
          const endY = innerY + 14 + Math.random() * (innerHeight - 28);
          shapes.push(`<path d="M${startX},${startY} Q${curveX},${curveY} ${endX},${endY}" stroke="${color}" stroke-width="${7 + Math.random()*12}" fill="none" opacity="${opacity.toFixed(2)}" />`);
        }
      }
      return shapes.join('\n    ');
    }

    // Semicolon newlines (user control), up to 20 lines
    const splitTitle = (title) => {
      const maxLines = 20;
      let rawLines = title.toUpperCase().split(';').map(l => l.trim()).filter(l => l);
      if (rawLines.length > maxLines) {
        rawLines = rawLines.slice(0, maxLines - 1).concat([
          rawLines.slice(maxLines - 1).join(' ')
        ]);
      }
      return rawLines.map(line => {
        const maxWordLen = 20;
        const words = line.split(' ');
        let safeLine = '';
        for (let word of words) {
          if (word.length > maxWordLen) {
            let chunks = word.match(new RegExp(`.{1,${maxWordLen}}`, 'g'));
            safeLine += (safeLine ? ' ' : '') + chunks.join(' ');
          } else {
            safeLine += (safeLine ? ' ' : '') + word;
          }
        }
        return safeLine;
      });
    };

    const testSVGTextWidth = (text, size) => {
      return text.length * size * 0.56;
    };

    // Inner rectangle config
    const innerX = 120, innerY = 120, innerWidth = 1360, innerHeight = 2320;
    const topPadding = 90, bottomPadding = 180;
    const sidePadding = 48;
    const usableWidth = innerWidth - 2 * sidePadding;
    const usableHeight = innerHeight - topPadding - bottomPadding;

    // Gradient and abstract art
    const gradient = getRandomGradient();
    const artSVG = getAbstractArt(innerX, innerY, innerWidth, innerHeight);
    const titleLines = splitTitle(displayTitle);
    const numLines = titleLines.length;

    // Fit font size so all lines fit horizontally and vertically
    let fontSize = 180;
    let lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
    const minFontSize = 44;
    while (fontSize > minFontSize) {
      lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
      let fits = true;
      for (const line of titleLines) {
        if (testSVGTextWidth(line, fontSize) > usableWidth) {
          fits = false;
          break;
        }
      }
      const totalTitleHeight = fontSize * numLines + lineSpacing * (numLines - 1);
      if (totalTitleHeight > usableHeight) fits = false;
      if (fits) break;
      fontSize -= 2;
    }
    if (fontSize < minFontSize) fontSize = minFontSize;
    lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
    const firstLineY = innerY + topPadding + fontSize;

    const titleSVG = titleLines.map((line, index) => {
      const y = firstLineY + index * (fontSize + lineSpacing);
      return `<text x="${innerX + innerWidth/2}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${this.escapeHTML(line)}</text>`;
    }).join('\n  ');

    // Author name near bottom
    const authorY = innerY + innerHeight - bottomPadding/2;
    const authorText = (authorName || '').toUpperCase();

    // SVG template
    const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2560" width="1600" height="2560">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradient.start}" />
      <stop offset="100%" stop-color="${gradient.end}" />
    </linearGradient>
    <linearGradient id="spineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.3" />
      <stop offset="30%" stop-color="#000000" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.5" />
    </filter>
    <filter id="bookShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="10" dy="10" result="offsetblur"/>
      <feFlood flood-color="#000000" flood-opacity="0.3"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="1600" height="2560" fill="url(#bgGradient)"/>
  <rect x="50" y="50" width="1500" height="2460" fill="#000000" opacity="0.2" rx="15" ry="15" />
  <rect x="40" y="40" width="1520" height="2480" fill="url(#bgGradient)" rx="12" ry="12" filter="url(#bookShadow)" />
  <rect x="40" y="40" width="80" height="2480" fill="url(#spineGradient)" rx="12" ry="12" />
  <rect x="40" y="40" width="1520" height="3" fill="url(#edgeHighlight)" />
  <rect x="1540" y="40" width="20" height="2480" fill="#000000" opacity="0.1" rx="12" ry="12" />
  <rect x="40" y="2510" width="1520" height="10" fill="#000000" opacity="0.15" rx="12" ry="12" />
  <rect x="120" y="120" width="1360" height="2320" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.1" rx="8" ry="8" />
  <!-- Abstract Art Shapes -->
  <g>
    ${artSVG}
  </g>
  <!-- Title -->
  ${titleSVG}
  <!-- Author name -->
  <text x="${innerX + innerWidth/2}" y="${authorY}" font-family="Arial, sans-serif" font-size="90" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${this.escapeHTML(authorText)}</text>
</svg>`;

    return svgTemplate;
  }

  /**
   * Create EPUB 3.0 structure with Vellum-compatible components
   * @param {Array} chapters - Parsed chapters
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Buffer>} - EPUB file as buffer
   */
  async createEpub3Structure(chapters, metadata) {
    const zip = new JSZip();

    // 1. Add mimetype (uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.file('META-INF/container.xml', containerXML);

    // 3. Create advanced SVG cover and save to project directory
    const svgCover = await this.generateSVGCover(metadata);
    // const svgFilePath = path.join(appState.CURRENT_PROJECT_PATH, 'cover.svg');
    const svgFilePath = path.resolve(appState.CURRENT_PROJECT_PATH, 'cover.svg');

    console.dir(typeof svgCover);

    try {
      console.dir(svgFilePath);
      console.dir(typeof svgCover);
      
      fs.writeFileSync(svgFilePath, svgCover);
      console.dir({
          afterWrite_exists: fs.existsSync(svgFilePath),
          fileSize: fs.existsSync(svgFilePath) ? fs.statSync(svgFilePath).size : 'NOT FOUND'
      });
    } catch (err) {
        console.error('Write failed:', err.message);
        console.dir('Write failed:', err.message);
    }
    
    // 4. Convert SVG to JPG and wait for completion
    const { spawn } = require('child_process');
    const svgConverterPath = path.join(__dirname, 'svg-to-jpg-standalone.js');
    
    this.emitOutput(`Converting SVG to JPG...\n`);
    
    await new Promise((resolve, reject) => {
      const converterProcess = spawn('npx', ['electron', svgConverterPath, appState.CURRENT_PROJECT_PATH], {
        stdio: 'pipe'
      });
      
      converterProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Converter process exited with code ${code}`));
        }
      });
      
      converterProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    // Verify both files exist after conversion
    let jpgCoverPath = path.join(appState.CURRENT_PROJECT_PATH, 'cover.jpg');
    const svgExists = fs.existsSync(svgFilePath);
    const jpgExists = fs.existsSync(jpgCoverPath);
    this.emitOutput(`After conversion - SVG exists: ${svgExists}, JPG exists: ${jpgExists}\n`);
    this.emitOutput(`SVG path: ${svgFilePath}\n`);
    this.emitOutput(`JPG path: ${jpgCoverPath}\n`);
    
    // 5. Add images to EPUB
    jpgCoverPath = path.join(appState.CURRENT_PROJECT_PATH, 'cover.jpg');
    if (fs.existsSync(jpgCoverPath)) {
      const jpgCoverBuffer = fs.readFileSync(jpgCoverPath);
      zip.file('OEBPS/images/cover.jpg', jpgCoverBuffer);
      this.emitOutput(`JPG cover added to EPUB\n`);
    } else {
      this.emitOutput(`Warning: JPG cover not found, using SVG fallback\n`);
      zip.file('OEBPS/images/cover.svg', svgCover);
    }

    // 6. Create title page (NEW)
    const titlePageHTML = this.createTitlePage(metadata);
    zip.file('OEBPS/title-page.xhtml', titlePageHTML);

    // 7. Create contents page (NEW)
    const contentsHTML = this.createContentsPage(chapters, metadata);
    zip.file('OEBPS/contents.xhtml', contentsHTML);

    // 8. Create chapter HTML files
    chapters.forEach(chapter => {
      const chapterHTML = this.createChapterHTML(chapter, metadata);
      zip.file(`OEBPS/${chapter.id}.xhtml`, chapterHTML);
    });

    // 9. Create content.opf (EPUB 3.0 format) with all new items
    const contentOPF = this.createEpub3ContentOPF(chapters, metadata, 'cover-image');
    zip.file('OEBPS/content.opf', contentOPF);

    // 10. Create nav.xhtml (EPUB 3.0 navigation)
    const navXHTML = this.createNavXHTML(chapters, metadata);
    zip.file('OEBPS/nav.xhtml', navXHTML);

    // 11. Create toc.ncx for EPUB 2 compatibility (NEW)
    const tocNCX = this.createTocNCX(chapters, metadata);
    zip.file('OEBPS/toc.ncx', tocNCX);

    // 12. Create CSS files in css/ subfolder (NEW structure)
    const styleCSS = this.createFullWidthCSS();
    const mediaCSS = this.createMediaCSS();
    zip.file('OEBPS/css/style.css', styleCSS);
    zip.file('OEBPS/css/media.css', mediaCSS);

    // 13. Add font license (fonts would need to be added separately)
    // const fontLicense = this.createFontLicense();
    // zip.file('OEBPS/fonts/SIL-Open-Font-License-1.1.txt', fontLicense);

    // Generate and return the EPUB
    const epubBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return epubBuffer;
  }

  /**
   * Create title page HTML (NEW)
   * @param {Object} metadata - Book metadata
   * @returns {string} - Title page HTML
   */
  createTitlePage(metadata) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Title Page</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <section class="title-page" epub:type="titlepage">
    <h1 class="book-title">${this.escapeHTML(metadata.title)}</h1>
    <p class="book-author">by ${this.escapeHTML(metadata.author)}</p>
    <div class="publisher-info">
      <p>${this.escapeHTML(metadata.publisher)}</p>
    </div>
  </section>
</body>
</html>`;
  }

  /**
   * Create contents page HTML (NEW)
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - Contents page HTML
   */
  createContentsPage(chapters, metadata) {
    const tocItems = chapters
      .map(ch => `    <li><a href="${ch.id}.xhtml">${this.escapeHTML(ch.title)}</a></li>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Contents</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <section class="contents-page" epub:type="toc">
    <h1>Contents</h1>
    <nav class="book-toc">
      <ol>
${tocItems}
      </ol>
    </nav>
  </section>
</body>
</html>`;
  }
}

module.exports = ManuscriptToEpub;
