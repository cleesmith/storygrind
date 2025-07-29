// manuscript-to-epub.js
// Updated with toc.ncx, title page, contents page, 
// and font support for Vellum simularity - Kindle Compatible
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

    // Read and validate project metadata
    const projectMetadata = await this.readProjectMetadata(saveDir);

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
      
      this.emitOutput(`Converting text to EPUB 3.0 (Kindle-compatible)...\n`);
      
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

      // Extract metadata from project metadata files
      const metadata = {
        title: projectMetadata.title,
        displayTitle: options.displayTitle || projectMetadata.title,
        author: projectMetadata.author,
        language: options.language || this.defaultMetadata.language,
        publisher: projectMetadata.publisher || this.defaultMetadata.publisher,
        description: options.description || this.defaultMetadata.description,
        copyright: projectMetadata.copyright,
        aboutAuthor: projectMetadata.aboutAuthor
      };

      // persist author name it for future use
      appState.setAuthorName(projectMetadata.author);

      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(textFile, path.extname(textFile));
      const outputFilename = `${baseFileName}_${timestamp}.epub`;
      const outputPath = path.join(saveDir, outputFilename);

      let dir = path.dirname(outputPath);
      let files = await fsPromises.readdir(dir);

      // Remove all .epub files in the output directory 
      // before writing the new one
      for (const file of files) {
        if (file.endsWith('.epub')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }

      // Convert to EPUB and get chapter info
      const result = await this.convertToEpub(textFile, metadata);
      
      // Write the EPUB file
      await fsPromises.writeFile(outputPath, result.epubBuffer);
      
      this.emitOutput(`\nKindle-compatible EPUB saved to: ${outputPath}\n`);
      
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
      
      if (this.formatChapterTitle(firstLine)) {
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
  formatChapterTitle(line) {
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
    
    // Add copyright page
    navPoints.push(`    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>Copyright</text>
      </navLabel>
      <content src="copyright.xhtml"/>
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
    
    // Add about author page (only if metadata exists)
    if (metadata.aboutAuthor && metadata.aboutAuthor.trim()) {
      navPoints.push(`    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
        <navLabel>
          <text>About the Author</text>
        </navLabel>
        <content src="about-author.xhtml"/>
      </navPoint>`);
    }
    
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
    <text>${metadata.displayTitle}</text>
  </docTitle>
  <docAuthor>
    <text>${metadata.author}</text>
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

    // Update spine to include all pages
    const spineItems = [
      '    <itemref idref="title-page"/>',
      '    <itemref idref="copyright"/>',
      '    <itemref idref="contents"/>',
      ...chapters.map(ch => `    <itemref idref="${ch.id}"/>`),
      ...(metadata.aboutAuthor && metadata.aboutAuthor.trim() ? ['    <itemref idref="about-author"/>'] : [])
    ].join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" prefix="cc: http://creativecommons.org/ns#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${metadata.displayTitle}</dc:title>
    <dc:creator>${metadata.author}</dc:creator>
    <dc:language>${metadata.language}</dc:language>
    <dc:publisher>${metadata.publisher}</dc:publisher>
    <dc:description>${this.escapeHTML(metadata.description)}</dc:description>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
${coverMeta}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="title-page" href="title-page.xhtml" media-type="application/xhtml+xml"/>
    <item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>
    <item id="contents" href="contents.xhtml" media-type="application/xhtml+xml"/>
    ${metadata.aboutAuthor && metadata.aboutAuthor.trim() ? '<item id="about-author" href="about-author.xhtml" media-type="application/xhtml+xml"/>' : ''}
    <item id="style" href="css/style.css" media-type="text/css"/>
${coverManifest}
${manifest}
  </manifest>
  <spine toc="toc">
${spineItems}
  </spine>
</package>`;
  }

  /**
   * Create EPUB 3.0 navigation document (updated for new pages)
   * @param {Array} chapters - Chapters array
   * @param {Object} metadata - Book metadata
   * @returns {string} - Navigation HTML
   */
  createNavXHTML(chapters, metadata) {
    const navItems = [
      '      <li><a href="title-page.xhtml">Title Page</a></li>',
      '      <li><a href="copyright.xhtml">Copyright</a></li>',
      '      <li><a href="contents.xhtml">Contents</a></li>',
      ...chapters.map(ch => `      <li><a href="${ch.id}.xhtml">${this.escapeHTML(ch.title)}</a></li>`),
      ...(metadata.aboutAuthor && metadata.aboutAuthor.trim() ? ['      <li><a href="about-author.xhtml">About the Author</a></li>'] : [])
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
   * Create Kindle-compatible CSS
   * @returns {string} - CSS content
   */
  createFullWidthCSS() {
    return `/* StoryGrind EPUB - Kindle-Compatible CSS */

/* Reset and base styles */
html {
  font-size: 100%;
}

body {
  font-family: serif;
  line-height: 1.6;
  margin: 1em;
  padding: 0;
  text-align: left;
}

/* Title page - Simple and clean */
.title-page {
  text-align: center;
  page-break-after: always;
  margin: 3em 0;
  padding: 2em 0;
}

.book-title {
  font-size: 1.8em;
  font-weight: bold;
  margin: 2em 0 1em 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.book-author {
  font-size: 1.3em;
  margin: 1.5em 0;
  font-weight: normal;
}

.book-publisher {
  font-size: 1em;
  margin: 2em 0;
  font-weight: normal;
}

/* Copyright page */
.copyright-page {
  page-break-after: always;
  margin: 2em 0;
}

.copyright-page p {
  text-align: left;
  margin: 0.8em 0;
  text-indent: 0;
  font-size: 0.9em;
}

/* Contents page */
.contents-page {
  page-break-after: always;
  margin: 2em 0;
}

.contents-page h1 {
  text-align: center;
  font-size: 1.5em;
  margin: 2em 0;
  font-weight: bold;
}

.book-toc ol {
  list-style: none;
  margin: 1em 0;
  padding: 0;
}

.book-toc li {
  margin: 1em 0;
  text-align: left;
}

.book-toc a {
  text-decoration: none;
  color: inherit;
}

/* Chapter styles */
.chapter {
  page-break-before: always;
  margin: 0;
}

h1 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 3em 0 2em 0;
  text-align: center;
  page-break-after: avoid;
}

p {
  margin: 0 0 1em 0;
  text-indent: 1.5em;
  text-align: justify;
  line-height: 1.6;
}

/* First paragraph after chapter heading */
.chapter p:first-of-type {
  text-indent: 0;
  margin-top: 1.5em;
}

/* About author page */
.about-author-page {
  page-break-before: always;
  margin: 2em 0;
}

.about-author-page h1 {
  text-align: center;
  font-size: 1.5em;
  margin: 2em 0;
  font-weight: bold;
}

.about-author-page p {
  text-align: left;
  text-indent: 1.5em;
  margin: 0 0 1em 0;
}

.about-author-page p:first-of-type {
  text-indent: 0;
}

/* Navigation styles */
nav h1 {
  text-align: center;
  font-size: 1.5em;
  margin: 2em 0;
  font-weight: bold;
}

nav ol {
  list-style: none;
  margin: 1em 0;
  padding: 0;
}

nav li {
  margin: 1em 0;
  text-align: left;
}

nav a {
  text-decoration: none;
  color: inherit;
}

/* Basic responsive adjustments */
@media screen and (max-width: 600px) {
  body {
    margin: 0.5em;
  }
  
  .book-title {
    font-size: 1.5em;
  }
  
  h1 {
    font-size: 1.3em;
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
    
    // 3. Add images to EPUB
    const jpgCoverPath = path.join(appState.CURRENT_PROJECT_PATH, 'cover.jpg');
    if (fs.existsSync(jpgCoverPath)) {
      const jpgCoverBuffer = fs.readFileSync(jpgCoverPath);
      zip.file('OEBPS/images/cover.jpg', jpgCoverBuffer);
      this.emitOutput(`JPG cover added to EPUB\n`);
    } else {
      this.emitOutput(`Warning: JPG cover not found!\n`);
    }

    // 4. Create title page
    const titlePageHTML = this.createTitlePage(metadata);
    zip.file('OEBPS/title-page.xhtml', titlePageHTML);

    // 5. Create copyright page
    const copyrightHTML = this.createCopyrightPage(metadata);
    zip.file('OEBPS/copyright.xhtml', copyrightHTML);

    // 6. Create contents page
    const contentsHTML = this.createContentsPage(chapters, metadata);
    zip.file('OEBPS/contents.xhtml', contentsHTML);

    // 7. Create chapter HTML files
    chapters.forEach(chapter => {
      const chapterHTML = this.createChapterHTML(chapter, metadata);
      zip.file(`OEBPS/${chapter.id}.xhtml`, chapterHTML);
    });

    // 8. Create about author page (only if metadata exists)
    if (metadata.aboutAuthor && metadata.aboutAuthor.trim()) {
      const aboutAuthorHTML = this.createAboutAuthorPage(metadata);
      zip.file('OEBPS/about-author.xhtml', aboutAuthorHTML);
    }

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
    zip.file('OEBPS/css/style.css', styleCSS);

    // Generate and return the EPUB
    const epubBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return epubBuffer;
  }

  /**
   * Create title page HTML - Simple Vellum style
   * @param {Object} metadata - Book metadata
   * @returns {string} - Title page HTML
   */
  createTitlePage(metadata) {
    // Convert title to uppercase to match Vellum style
    const upperTitle = metadata.displayTitle.toUpperCase();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Title Page</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <section class="title-page" epub:type="titlepage">
    <h1 class="book-title">${this.escapeHTML(upperTitle)}</h1>
    <p class="book-author">${this.escapeHTML(metadata.author)}</p>
    <p class="book-publisher">${this.escapeHTML(metadata.publisher)}</p>
  </section>
</body>
</html>`;
  }

  /**
   * Create copyright page HTML
   * @param {Object} metadata - Book metadata
   * @returns {string} - Copyright page HTML
   */
  createCopyrightPage(metadata) {
    const year = new Date().getFullYear();
    
    let copyrightContent;
    
    if (metadata.copyright && metadata.copyright.trim()) {
      // Use custom copyright text from metadata
      copyrightContent = metadata.copyright.split('\n').map(line => 
        line.trim() ? `    <p>${this.escapeHTML(line.trim())}</p>` : '    <p></p>'
      ).join('\n');
    } else {
      // Use default copyright text
      copyrightContent = `    <p>Copyright © ${year} ${this.escapeHTML(metadata.author)}</p>
    <p></p>
    <p>All rights reserved.</p>
    <p></p>
    <p>Published by ${this.escapeHTML(metadata.publisher)}</p>
    <p></p>
    <p>This is a work of fiction. Names, characters, places, and incidents either are the product of the author's imagination or are used fictitiously. Any resemblance to actual persons, living or dead, events, or locales is entirely coincidental.</p>
    <p></p>
    <p>First Edition: ${year}</p>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Copyright</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <section class="copyright-page" epub:type="copyright-page">
${copyrightContent}
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
    const chapterItems = chapters
      .map(ch => `    <li><a href="${ch.id}.xhtml">${this.escapeHTML(ch.title)}</a></li>`)
      .join('\n');
    
    const tocItems = [
      chapterItems,
      ...(metadata.aboutAuthor && metadata.aboutAuthor.trim() ? ['    <li><a href="about-author.xhtml">About the Author</a></li>'] : [])
    ].join('\n');

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

  /**
   * Create about the author page HTML
   * @param {Object} metadata - Book metadata
   * @returns {string} - About the author page HTML
   */
  createAboutAuthorPage(metadata) {
    let aboutContent;
    
    if (metadata.aboutAuthor && metadata.aboutAuthor.trim()) {
      // Use custom about text from metadata
      aboutContent = metadata.aboutAuthor.split('\n').map(line => 
        line.trim() ? `    <p>${this.escapeHTML(line.trim())}</p>` : '    <p></p>'
      ).join('\n');
    } else {
      // Use default about text
      aboutContent = `    <p>${this.escapeHTML(metadata.author)} is an author who creates compelling stories using StoryGrind for editing and publishing.</p>
    <p></p>
    <p>When not writing, they enjoy exploring new narrative possibilities and reading well edited books.</p>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>About the Author</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <section class="about-author-page" epub:type="appendix">
    <h1>About the Author</h1>
${aboutContent}
  </section>
</body>
</html>`;
  }

}

module.exports = ManuscriptToEpub;
