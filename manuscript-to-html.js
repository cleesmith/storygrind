/**
 * ManuscriptTextToHtml - Convert manuscript.txt to HTML
 * Creates HTML files from manuscript text following the established pattern
 */

const path = require('path');

class ManuscriptTextToHtml {
  constructor(maxChapters = 1) {
    this.maxChapters = maxChapters;
    this.basePath = null;
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
   * Extract story title from manuscript file path
   * @param {string} manuscriptPath - Path to manuscript file
   * @returns {string} Story title from folder name
   */
  extractStoryTitle(manuscriptPath) {
    const pathParts = manuscriptPath.replace(/\\/g, '/').split('/');
    // Get the folder name that contains the manuscript
    const folderName = pathParts[pathParts.length - 2] || 'Story';
    return folderName;
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
    const imageSrc = `images/${bookName}.jpeg`;
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
   */
  processBookAndUpdateIndex(basePath, bookName, maxChapters = null) {
    const fs = require('fs');
    
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
    
    // Check if manuscript exists
    if (!fs.existsSync(manuscriptPath)) {
      throw new Error(`Manuscript not found: ${manuscriptPath}`);
    }
    
    // Process manuscript
    const manuscriptText = fs.readFileSync(manuscriptPath, 'utf8');
    const html = this.processStoryWithTitle(bookName, manuscriptText);
    
    // Write book HTML
    fs.writeFileSync(outputPath, html);
    console.log(`Generated HTML for ${bookName}: ${outputPath}`);
    
    // Update main index
    this.updateIndex([{ bookName, displayTitle: bookName.replace(/_/g, ' ') }]);
  }
}

// Example usage:
const fs = require('fs');
const converter = new ManuscriptTextToHtml();

// Method 1: Process single book and update index automatically
converter.processBookAndUpdateIndex('/Users/cleesmith/writing', 'Tsu');

// You can specify number of chapters (default is 1)
// converter.processBookAndUpdateIndex('/Users/cleesmith/writing', 'Tsu', 5);

/* 
Method 2: Manual processing (original functionality)
// Read manuscript file
const manuscriptText = fs.readFileSync('/Users/cleesmith/writing/Tsu/manuscript.txt', 'utf8');

// Convert to HTML
const html = converter.processStory('/Users/cleesmith/writing/Tsu/manuscript.txt', manuscriptText);
// OR if you know the title:
// const html = converter.processStoryWithTitle('Tsu', manuscriptText);

// Write HTML file
fs.writeFileSync('./output.html', html);
*/

// Method 3: Update index only
// converter.setBasePath('/Users/cleesmith/writing');
// converter.updateIndex([{ bookName: 'NewBook', displayTitle: 'New Book' }]);
