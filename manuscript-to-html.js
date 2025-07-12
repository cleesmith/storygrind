/**
 * ManuscriptTextToHtml - Convert manuscript.txt to HTML
 * Creates HTML files from manuscript text following the established pattern
 */

const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const appState = require('./state.js');

class ManuscriptTextToHtml extends ToolBase {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {Object} config - Tool configuration
   */
  constructor(name, config = {}) {
    super(name, config);
    this.maxChapters = config.maxChapters || 1;
    this.basePath = null;
  }

  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    let errorMsg = "";
    
    // Extract options
    let manuscriptFile = options.manuscript_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    // Ensure file paths are absolute
    manuscriptFile = this.ensureAbsolutePath(manuscriptFile, saveDir);

    const outputFiles = [];
    
    try {
      // Read the input file
      this.emitOutput(`Reading manuscript file: ${manuscriptFile}\n`);
      
      // Check if file exists
      if (!fs.existsSync(manuscriptFile)) {
        throw new Error(`File not found: ${manuscriptFile}`);
      }
      
      // Check file size first to prevent memory issues
      const stats = fs.statSync(manuscriptFile);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 10) {
        errorMsg = `\nFile too large (${fileSizeInMB.toFixed(1)}MB). Please use files smaller than 10MB.`;
      }
      
      this.emitOutput(`Converting manuscript to HTML...\n`);
      
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

      // If user provided a new author name, persist it for future use
      if (options.author && options.author.trim() && options.author.trim() !== appState.AUTHOR_NAME) {
        appState.setAuthorName(options.author.trim());
      }

      // Read manuscript content
      const manuscriptContent = fs.readFileSync(manuscriptFile, 'utf8');
      
      // Set max chapters based on option
      const maxChapters = options.max_chapters === 'all' ? 999 : parseInt(options.max_chapters || '1');
      this.setMaxChapters(maxChapters);
      
      // Convert to HTML
      const htmlContent = this.processStory(manuscriptFile, manuscriptContent);
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(manuscriptFile, path.extname(manuscriptFile));
      const outputFilename = `${baseFileName}_${timestamp}.html`;
      const outputPath = path.join(saveDir, outputFilename);
      
      // Write the HTML file
      await fsPromises.writeFile(outputPath, htmlContent, 'utf8');
      
      this.emitOutput(`\nHTML saved to: ${outputPath}\n`);
      outputFiles.push(outputPath);
      
      // Get chapter count and word count
      const chapters = this.parseManuscript(manuscriptContent);
      const wordCount = this.countWords(manuscriptContent);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: chapters.length,
          wordCount: wordCount
        }
      };
    } catch (error) {
      console.error('Error in Manuscript to HTML Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Parse manuscript text and extract chapters
   * @param {string} manuscriptText - The full manuscript text
   * @returns {Array} Array of chapter objects {title, content}
   */
  parseManuscript(manuscriptText) {
    const lines = manuscriptText.split('\n');
    const chapters = [];
    let currentChapter = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a chapter heading
      const chapterMatch = line.match(/^Chapter\s+(\d+)[:.]\s*(.+)$/i);
      
      if (chapterMatch) {
        // Save previous chapter if it exists
        if (currentChapter && currentContent.length > 0) {
          currentChapter.content = this.formatContent(currentContent);
          chapters.push(currentChapter);
          
          // Stop if we've reached the maximum chapters for testing
          if (chapters.length >= this.maxChapters) {
            break;
          }
        }
        
        // Start new chapter - normalize format to "Chapter X: Title" with proper case
        currentChapter = {
          number: parseInt(chapterMatch[1]),
          title: `Chapter ${chapterMatch[1]}: ${this.toProperCase(chapterMatch[2])}`,
          content: ''
        };
        currentContent = [];
      } else if (currentChapter && line.length > 0) {
        // Add non-empty lines to current chapter content
        currentContent.push(line);
      }
    }
    
    // Add the last chapter if it exists and we haven't reached the limit
    if (currentChapter && currentContent.length > 0 && chapters.length < this.maxChapters) {
      currentChapter.content = this.formatContent(currentContent);
      chapters.push(currentChapter);
    }
    
    return chapters;
  }

  /**
   * Format content lines into HTML paragraphs
   * @param {Array} contentLines - Array of content lines
   * @returns {string} HTML formatted content
   */
  formatContent(contentLines) {
    return contentLines
      .map(line => `<p>${this.escapeHtml(line)}</p>`)
      .join('');
  }

  /**
   * Convert title to proper case (first letter of each word capitalized)
   * @param {string} title - Title to convert
   * @returns {string} Title in proper case
   */
  toProperCase(title) {
    return title.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate HTML from chapters using the established pattern
   * @param {string} storyTitle - Title of the story (folder name)
   * @param {Array} chapters - Array of chapter objects
   * @returns {string} Complete HTML document
   */
  generateHTML(storyTitle, chapters) {
    const chaptersHTML = chapters.map(chapter => `
<div class="chapter-container">
  <div class="chapter-title">${chapter.title}</div>
  <div class="chapter-text">${chapter.content}</div>
</div>`).join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${storyTitle}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      background: #ffffff; 
      color: #000000; 
      transition: background 0.3s, color 0.3s; 
      line-height: 1.5;
    }
    .chapter-container { 
      border: 2px solid #ff9800; 
      border-radius: 4px; 
      padding: 10px; 
      margin-bottom: 15px; 
      background: #fff7e6; 
    }
    .chapter-title { 
      font-weight: bold; 
      margin-bottom: 8px; 
      font-size: 1.2em; 
    }
    .chapter-text p {
      margin-bottom: 1em;
    }
    /* Dark mode styles */
    body.dark-mode { 
      background: #121212; 
      color: #e0e0e0; 
    }
    body.dark-mode .chapter-container { 
      background: #1e1e1e; 
      border-color: #ff9800; 
    }
    /* Dark mode toggle button (small circular button) */
    #darkModeToggle {
      font-size: 20px;
      background-color: transparent;
      color: inherit;
      border: 1px solid currentColor;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      text-align: center;
      position: fixed;
      top: 20px;
      right: 20px;
    }
    #darkModeToggle:hover {
      filter: brightness(1.2);
    }
  </style>
</head>
<body class="dark-mode">
  <button id="darkModeToggle" title="Switch dark and light mode">☀️</button>
<h2>${storyTitle}</h2>
${chaptersHTML}
  <script>
    document.getElementById('darkModeToggle').addEventListener('click', function(){
      document.body.classList.toggle('dark-mode');
      this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
  </script>
</body>
</html>`;
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
   * Extract story title from manuscript file path
   * @param {string} manuscriptPath - Path to manuscript file
   * @returns {string} Story title from folder name
   */
  extractStoryTitle(manuscriptPath) {
    const pathParts = manuscriptPath.replace(/\\/g, '/').split('/');
    // Get the folder name that contains the manuscript
    const folderName = pathParts[pathParts.length - 2] || 'Story';
    return this.formatFolderNameAsTitle(folderName);
  }

  /**
   * Main function to process a story and generate HTML
   * @param {string} manuscriptPath - Path to manuscript file (to extract title)
   * @param {string} manuscriptText - The manuscript text content
   * @returns {string} Complete HTML document
   */
  processStory(manuscriptPath, manuscriptText) {
    const storyTitle = this.extractStoryTitle(manuscriptPath);
    const chapters = this.parseManuscript(manuscriptText);
    return this.generateHTML(storyTitle, chapters);
  }

  /**
   * Alternative function if you already know the story title
   * @param {string} storyTitle - Title of the story
   * @param {string} manuscriptText - The manuscript text content
   * @returns {string} Complete HTML document
   */
  processStoryWithTitle(storyTitle, manuscriptText) {
    const chapters = this.parseManuscript(manuscriptText);
    return this.generateHTML(storyTitle, chapters);
  }

  /**
   * Set the base path for the book collection folder
   * @param {string} basePath - Path to folder containing book subdirectories
   */
  setBasePath(basePath) {
    this.basePath = path.resolve(basePath);
  }

  /**
   * Set the maximum number of chapters to process
   * @param {number} maxChapters - Maximum chapters to include
   */
  setMaxChapters(maxChapters) {
    this.maxChapters = maxChapters;
  }

  /**
   * Choose the best title format based on title length
   * @param {string} title - The book title
   * @returns {string} Format type: 'single', 'two', or 'three'
   */
  chooseTitleFormat(title) {
    const titleLength = title.length;
    
    if (titleLength <= 8) {
      return 'single';
    } else if (titleLength <= 16) {
      return 'two';
    } else {
      return 'three';
    }
  }

  /**
   * Generate SVG cover from template
   * @param {string} bookTitle - Title of the book
   * @param {string} authorName - Author name
   * @param {string} outputPath - Path to save the SVG file
   */
  generateSVGCover(bookTitle, authorName, outputPath) {
    const fs = require('fs');
    
    // Read the SVG template
    const templatePath = path.join(this.basePath, '123_black_ebook_cover.svg');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`SVG template not found: ${templatePath}`);
    }
    
    let svgContent = fs.readFileSync(templatePath, 'utf8');
    
    // Convert to uppercase
    const titleUpper = bookTitle.toUpperCase();
    const authorUpper = authorName.toUpperCase();
    
    // Choose format and prepare title lines
    const format = this.chooseTitleFormat(titleUpper);
    
    if (format === 'single') {
      // Activate single-line format
      svgContent = svgContent.replace(
        /<g id="single-line-title">[\s\S]*?<\/g>/,
        `<g id="single-line-title">
    <text x="800" y="700" font-family="Arial, sans-serif" font-size="150" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${titleUpper}</text>
  </g>`
      );
      
      // Comment out other formats
      svgContent = svgContent.replace(
        /<!-- OPTION 2[\s\S]*?-->/,
        `<!-- OPTION 2: Two-line title format (best for medium titles like "A DARKER ROAST", "THE MUNDANE SPEAKS") -->
  <!-- 
  <g id="two-line-title">
    <text x="800" y="600" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">DIRE</text>
    <text x="800" y="780" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">CONSEQUENCES</text>
  </g>
  -->`
      );
      
    } else if (format === 'two') {
      // Split title into two parts
      const words = titleUpper.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      const line1 = words.slice(0, midPoint).join(' ');
      const line2 = words.slice(midPoint).join(' ');
      
      // Comment out single-line format
      svgContent = svgContent.replace(
        /<g id="single-line-title">[\s\S]*?<\/g>/,
        `<!-- 
  <g id="single-line-title">
    <text x="800" y="700" font-family="Arial, sans-serif" font-size="150" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">DELTA</text>
  </g>
  -->`
      );
      
      // Activate two-line format
      svgContent = svgContent.replace(
        /<!-- OPTION 2[\s\S]*?-->/,
        `<!-- OPTION 2: Two-line title format (best for medium titles like "A DARKER ROAST", "THE MUNDANE SPEAKS") -->
  <g id="two-line-title">
    <text x="800" y="600" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line1}</text>
    <text x="800" y="780" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line2}</text>
  </g>`
      );
      
    } else { // three lines
      // Split title into three parts
      const words = titleUpper.split(' ');
      const perLine = Math.ceil(words.length / 3);
      const line1 = words.slice(0, perLine).join(' ');
      const line2 = words.slice(perLine, perLine * 2).join(' ');
      const line3 = words.slice(perLine * 2).join(' ');
      
      // Comment out single-line format
      svgContent = svgContent.replace(
        /<g id="single-line-title">[\s\S]*?<\/g>/,
        `<!-- 
  <g id="single-line-title">
    <text x="800" y="700" font-family="Arial, sans-serif" font-size="150" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">DELTA</text>
  </g>
  -->`
      );
      
      // Activate three-line format
      svgContent = svgContent.replace(
        /<!-- OPTION 3[\s\S]*?-->/,
        `<!-- OPTION 3: Three-line title format (best for longer titles like "SOMETHING FROM NOTHING") -->
  <g id="three-line-title">
    <text x="800" y="500" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line1}</text>
    <text x="800" y="680" font-family="Arial, sans-serif" font-size="110" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line2}</text>
    <text x="800" y="860" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line3}</text>
  </g>`
      );
    }
    
    // Replace author name
    svgContent = svgContent.replace(
      /CLEE SMITH/g,
      authorUpper
    );
    
    // Write the customized SVG
    fs.writeFileSync(outputPath, svgContent);
    console.log(`Generated SVG cover: ${outputPath}`);
  }

  /**
   * Get the index.html path relative to base path
   * @returns {string} Path to index.html file
   */
  getIndexPath() {
    if (!this.basePath) {
      throw new Error('Base path not set. Call setBasePath() first.');
    }
    return path.join(this.basePath, 'index.html');
  }

  /**
   * Parse existing index.html file to extract book entries
   * @param {string} indexPath - Path to index.html file
   * @returns {Array} Array of existing book entries
   */
  parseIndexFile(indexPath) {
    const fs = require('fs');
    
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Remove HTML comments to avoid parsing commented-out entries
    indexContent = indexContent.replace(/<!--[\s\S]*?-->/g, '');
    
    const entries = [];
    
    // Find all project divs with links
    const projectRegex = /<div class="project">\s*<a href="([^"]+\/index\.html)"[^>]*title="Read: ([^"]*)"[^>]*>\s*<img src="([^"]*)"[^>]*>\s*<div class="project-title">([^<]*)<\/div>\s*<\/a>\s*<\/div>/g;
    
    let match;
    while ((match = projectRegex.exec(indexContent)) !== null) {
      entries.push({
        href: match[1],
        title: match[2],
        imageSrc: match[3],
        displayTitle: match[4],
        bookName: match[1].split('/')[0] // Extract folder name from href
      });
    }
    
    return entries;
  }

  /**
   * Find all book folders in the base directory
   * @returns {Array} Array of book folder names
   */
  findBookFolders() {
    if (!this.basePath) {
      throw new Error('Base path not set. Call setBasePath() first.');
    }

    const fs = require('fs');
    const items = fs.readdirSync(this.basePath, { withFileTypes: true });
    
    return items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .filter(name => !name.startsWith('.') && !['images', 'tools', 'assets'].includes(name));
  }

  /**
   * Generate HTML entry for a book following the exact pattern
   * @param {string} bookName - Name of the book folder
   * @param {string} displayTitle - Title to display (defaults to bookName)
   * @returns {string} HTML entry for the book
   */
  generateBookEntry(bookName, displayTitle = null) {
    if (!displayTitle) {
      displayTitle = bookName.replace(/_/g, ' ');
    }
    
    const href = `${bookName}/index.html`;
    const imageSrc = `images/${bookName}.svg`;
    const title = `Read: ${displayTitle}`;
    
    return `  <div class="project">
    <a href="${href}" style="text-decoration: none;" title="${title}">
      <img src="${imageSrc}" alt="book Cover" style="border-radius: 4px;">
      <div class="project-title">${displayTitle}</div>
    </a>
  </div>`;
  }

  /**
   * Update the index.html file with new book entries
   * @param {Array} newEntries - Array of new book entries to add
   */
  updateIndex(newEntries = []) {
    const fs = require('fs');
    const indexPath = this.getIndexPath();
    
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Index file not found: ${indexPath}`);
    }
    
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    const existingEntries = this.parseIndexFile(indexPath);
    const existingBookNames = existingEntries.map(entry => entry.bookName);
    
    // Find where to insert new entries (at the top, after book-grid opening)
    const insertionPoint = indexContent.indexOf('<div class="book-grid">\n');
    
    if (insertionPoint === -1) {
      throw new Error('Could not find book-grid div in index.html');
    }
    
    // Position after the opening div and any existing content
    const insertAfter = insertionPoint + '<div class="book-grid">\n'.length;
    
    // Add new entries that don't already exist
    let entriesToAdd = [];
    for (const entry of newEntries) {
      if (!existingBookNames.includes(entry.bookName)) {
        entriesToAdd.push(this.generateBookEntry(entry.bookName, entry.displayTitle));
      }
    }
    
    if (entriesToAdd.length > 0) {
      const newEntriesHTML = '\n' + entriesToAdd.join('\n\n') + '\n\n';
      indexContent = indexContent.slice(0, insertAfter) + newEntriesHTML + indexContent.slice(insertAfter);
      
      fs.writeFileSync(indexPath, indexContent);
      console.log(`Added ${entriesToAdd.length} new book entries to top of index.html`);
    } else {
      console.log('No new entries to add to index.html');
    }
  }

  /**
   * Main method to process a book and update the index
   * @param {string} basePath - Path to folder containing book subdirectories
   * @param {string} bookName - Name of the book folder to process
   * @param {number} maxChapters - Maximum chapters to include (optional)
   * @param {string} authorName - Author name for SVG cover generation (required)
   */
  processBookAndUpdateIndex(basePath, bookName, maxChapters = null, authorName) {
    const fs = require('fs');
    
    // Validate required parameters
    if (!authorName) {
      throw new Error('Author name is required for SVG cover generation');
    }
    
    // Set base path
    this.setBasePath(basePath);
    
    // Set max chapters if provided
    if (maxChapters !== null) {
      this.setMaxChapters(maxChapters);
    }
    
    // Build paths
    const bookFolder = path.join(this.basePath, bookName);
    const manuscriptPath = path.join(bookFolder, 'manuscript.txt');
    const outputPath = path.join(bookFolder, 'index.html');
    const svgPath = path.join(this.basePath, 'images', `${bookName}.svg`);
    
    // Check if manuscript exists
    if (!fs.existsSync(manuscriptPath)) {
      throw new Error(`Manuscript not found: ${manuscriptPath}`);
    }
    
    // Generate SVG cover (always)
    const displayTitle = bookName.replace(/_/g, ' ');
    this.generateSVGCover(displayTitle, authorName, svgPath);
    
    // Process manuscript
    const manuscriptText = fs.readFileSync(manuscriptPath, 'utf8');
    const html = this.processStoryWithTitle(bookName, manuscriptText);
    
    // Write book HTML
    fs.writeFileSync(outputPath, html);
    console.log(`Generated HTML for ${bookName}: ${outputPath}`);
    
    // Update main index
    this.updateIndex([{ bookName, displayTitle }]);
  }
}

module.exports = ManuscriptTextToHtml;
