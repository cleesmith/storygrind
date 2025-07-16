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
      if (options.author && options.author.trim() !== appState.AUTHOR_NAME) {
        appState.setAuthorName(options.author.trim());
      }

      // Read manuscript content
      const manuscriptContent = fs.readFileSync(manuscriptFile, 'utf8');
      
      // Set max chapters based on option
      const maxChapters = options.max_chapters === 'all' ? 999 : parseInt(options.max_chapters || '1');
      this.setMaxChapters(maxChapters);
      
      // Convert to HTML
      const htmlContent = this.processStory(manuscriptFile, manuscriptContent, options.title);
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(manuscriptFile, path.extname(manuscriptFile));
      const outputFilename = `${baseFileName}_${timestamp}.html`;
      const outputPath = path.join(saveDir, outputFilename);

      // Remove all .html files in the output directory before writing the new one
      const dir = path.dirname(outputPath);
      const files = await fsPromises.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          await fsPromises.unlink(path.join(dir, file));
        }
      }

      // Write the HTML file
      await fsPromises.writeFile(outputPath, htmlContent, 'utf8');
      
      this.emitOutput(`\nHTML saved to: ${outputPath}\n`);
      outputFiles.push(outputPath);
      
      // Get chapter count
      const chapters = this.parseManuscript(manuscriptContent);
      this.emitOutput(`\nChapters in HTML: ${chapters.length}\n`);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: chapters.length
        }
      };
    } catch (error) {
      console.error('Error in Manuscript to HTML Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Convert folder name to proper case
   * @param {string} name - Raw name
   * @returns {string} - Formatted case
   */
  formatProperCase(name) {
    let title = name;
    
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

    // Handle apostrophies
    title = title.toLowerCase().replace(/^.|(?<=\s)\w/g, l => l.toUpperCase());
    
    return title;
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
    return title.toLowerCase().replace(/^.|(?<=\s)\w/g, l => l.toUpperCase());
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
   * @param {string} storyTitle - Title of the story
   * @param {Array} chapters - Array of chapter objects
   * @returns {string} Complete HTML document
   */
  generateHTML(titleAuthor, titleAuthorDisplay, chapters) {
    const chaptersHTML = chapters.map(chapter => `
<div class="chapter-container">
  <div class="chapter-title">${chapter.title}</div>
  <div class="chapter-text">${chapter.content}</div>
</div>`).join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${titleAuthor}</title>
  <style>
    :root {
      --button-bg-color: #4CAF50;
      --button-text-color: #ffffff;
      --border-color: #444;
      --background-light: #f5f5f5;
      --text-light: #333333;
      --background-dark: #2c3035;
      --text-dark: #ffffff;
    }
    
    body {
      font-family: Arial, sans-serif;
      background-color: var(--background-dark);
      color: var(--text-dark);
      transition: background-color 0.3s, color 0.3s;
      padding: 20px;
      min-height: 100vh;
      margin: 0;
      line-height: 1.5;
    }
    
    body.light-mode {
      background-color: var(--background-light);
      color: var(--text-light);
    }
    
    h1 {
      color: inherit;
    }
    
    /* Dark mode: dark container with white text */
    .chapter-container {
      border: 2px solid #ff9800;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 15px;
      background: rgba(0, 0, 0, 0.3); /* Darker than body background */
      color: var(--text-dark); /* White text */
    }
    
    /* Light mode: light container with dark text */
    body.light-mode .chapter-container {
      background: #fff7e6; /* Light cream background */
      color: var(--text-light); /* Dark text */
    }
    
    .chapter-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 1.2em;
    }
    
    .chapter-text p {
      margin-bottom: 1em;
    }
    
    /* Footer styling */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: #000;
      color: #9e9e9e;
      padding: 10px 20px;
      text-align: center;
      font-size: 15px;
      transition: background-color 0.3s;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    body.light-mode .footer {
      background-color: #333;
    }
    
    /* Dark mode toggle */
    #darkModeToggle {
      font-size: 16px;
      background-color: transparent;
      color: inherit;
      border: none;
      cursor: pointer;
      text-align: center;
      transition: all 0.3s ease;
      margin-left: 10px;
      padding: 0;
    }
    
    #darkModeToggle:hover {
      transform: scale(1.1);
    }
    
    .footer-spacer {
      height: 60px;
    }
  </style>
</head>
<body>

<h2>${titleAuthorDisplay}</h2>
${chaptersHTML}

<div class="footer-spacer"></div>
<div class="footer">
  <div>© &nbsp;2025 &nbsp;&nbsp;${titleAuthorDisplay} &nbsp;&nbsp;<button id="darkModeToggle" title="Switch dark and light mode">☀️</button></div>
</div>

<script>
  // toggle dark/light mode
  document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('light-mode');
    // Change the icon based on the current mode
    this.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
    
    // optionally save the user's preference in localStorage
    localStorage.setItem('lightMode', document.body.classList.contains('light-mode'));
  });
  
  // check for saved preference on page load
  window.addEventListener('DOMContentLoaded', function() {
    // default is dark mode (no class needed)
    const lightMode = localStorage.getItem('lightMode') === 'true';
    if (lightMode) {
      document.body.classList.add('light-mode');
      document.getElementById('darkModeToggle').textContent = '🌙';
    }
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
    return this.formatProperCase(folderName);
  }

  /**
   * Main function to process a story and generate HTML
   * @param {string} title - user entered story title
   * @param {string} manuscriptPath - Path to manuscript file (to extract title)
   * @param {string} manuscriptText - The manuscript text content
   * @returns {string} Complete HTML document
   */
  processStory(manuscriptPath, manuscriptText, storyTitle=options.title) {
    if (storyTitle.trim().length <= 0) {
      storyTitle = this.extractStoryTitle(manuscriptPath);
    } else {
      storyTitle = this.formatProperCase(storyTitle);
    }
    const chapters = this.parseManuscript(manuscriptText);
    const titleAuthor = `${storyTitle} by ${this.formatProperCase(appState.AUTHOR_NAME)}`;
    const titleAuthorDisplay = `${storyTitle} &nbsp;<small><em>by ${this.formatProperCase(appState.AUTHOR_NAME)}</em></small>`;
    return this.generateHTML(titleAuthor, titleAuthorDisplay, chapters);
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
}

module.exports = ManuscriptTextToHtml;
