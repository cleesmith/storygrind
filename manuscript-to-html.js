/**
 * StoryGrind Converter - Convert manuscript.txt to HTML
 * Creates HTML files from manuscript text following the established pattern
 */

class StoryGrindConverter {
  constructor() {
    this.maxChapters = 3; // For testing, limit to first 3 chapters
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
}

// Node.js usage example
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StoryGrindConverter;
}

// Browser usage example
if (typeof window !== 'undefined') {
  window.StoryGrindConverter = StoryGrindConverter;
}

// Example usage:
const fs = require('fs');
const converter = new StoryGrindConverter();

// Read manuscript file
const manuscriptText = fs.readFileSync('/Users/cleesmith/writing/Tsu/manuscript.txt', 'utf8');

// Convert to HTML
const html = converter.processStory('/Users/cleesmith/writing/Tsu/manuscript.txt', manuscriptText);
// OR if you know the title:
// const html = converter.processStoryWithTitle('Story Title', manuscriptText);

// Write HTML file
fs.writeFileSync('./output.html', html);
