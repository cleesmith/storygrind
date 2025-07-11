// manuscript-to-epub.js
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
      
      // Check file size first to prevent memory issues
      const stats = fs.statSync(textFile);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 10) {
        errorMsg = `\nFile too large (${fileSizeInMB.toFixed(1)}MB). Please use files smaller than 10MB.`;
      }
      
      this.emitOutput(`Converting text to EPUB 3.0...\n`);
      
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
      
      // Write the EPUB file
      await fsPromises.writeFile(outputPath, result.epubBuffer);
      
      this.emitOutput(`\nEPUB saved to: ${outputPath}\n`);
      // do NOT do this for .epub's = errors:
      // outputFiles.push(outputPath);
      
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
}

module.exports = ManuscriptToEpub;
