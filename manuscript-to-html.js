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
    let manuscriptFile = options.manuscript_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    // Read and validate project metadata
    const metadata = await this.readProjectMetadata(saveDir);

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

      // Set author name from metadata
      if (metadata.author && metadata.author.trim() !== appState.AUTHOR_NAME) {
        appState.setAuthorName(metadata.author.trim());
      }

      // Read manuscript content
      const manuscriptContent = fs.readFileSync(manuscriptFile, 'utf8');
      
      // Set max chapters based on option
      const maxChapters = options.max_chapters === 'all' ? 999 : parseInt(options.max_chapters || '1');
      this.setMaxChapters(maxChapters);
      
      // Convert to HTML - processStory expects title as array of strings
      const titleArray = metadata.title ? [metadata.title] : ['Untitled'];
      const htmlContent = this.processStory(manuscriptFile, manuscriptContent, titleArray);
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(manuscriptFile, path.extname(manuscriptFile));
      const outputFilename = `${baseFileName}_${timestamp}.html`;
      const outputPath = path.join(saveDir, outputFilename);

      // Remove all .html files in the output directory 
      // before writing the new one
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
      
      // Get chapter count from the parsing
      const chapters = this.parseManuscriptText(manuscriptContent);
      this.emitOutput(`\nChapters in HTML: ${Math.min(chapters.length, this.maxChapters)}\n`);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: Math.min(chapters.length, this.maxChapters),
          wordCount: this.countWords(manuscriptContent)
        }
      };
    } catch (error) {
      console.error('Error in Manuscript to HTML Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Parse Manuscript text into chapters
   * Supports various title formats with:
   *  ==============                  ==============
   *  DOUBLE NEWLINE before title and SINGLE NEWLINE after title
   *  ==============                  ==============
   * @param {string} text - Raw text content
   * @returns {Array} - Array of chapter objects
   */
  parseManuscriptText(text) {
    const chapters = [];
    
    // Normalize line endings and trim
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
    // Split by double (or more) newlines - this gives us potential chapter boundaries
    const sections = text.split(/\n\s*\n\s*\n+/);
    
    let chapterCount = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.length < 50) continue;
      
      // Split section into lines
      const lines = section.split('\n');
      if (lines.length < 2) continue;
      
      // First line could be a title
      const firstLine = lines[0].trim();
      const remainingContent = lines.slice(1).join('\n').trim();
      
      // Check if first line looks like a title (not too long, has content after it)
      if (firstLine && firstLine.length <= 120 && remainingContent.length > 50) {
        chapterCount++;
        
        // Format the title appropriately
        const formattedTitle = this.formatChapterTitle(firstLine, chapterCount);
        
        // Split remaining content into paragraphs
        const paragraphs = remainingContent
          .split(/\n\s*\n/)
          .map(p => p.replace(/\n/g, ' ').trim())
          .filter(p => p.length > 0);
        
        if (paragraphs.length > 0) {
          chapters.push({
            id: `chapter${chapterCount}`,
            number: chapterCount,
            title: formattedTitle,
            content: paragraphs
          });
          
          // Stop if we've reached max chapters
          if (chapters.length >= this.maxChapters) {
            break;
          }
        }
      } else {
        // Whole section is content without clear title
        chapterCount++;
        
        const paragraphs = section
          .split(/\n\s*\n/)
          .map(p => p.replace(/\n/g, ' ').trim())
          .filter(p => p.length > 0);
        
        if (paragraphs.length > 0) {
          chapters.push({
            id: `chapter${chapterCount}`,
            number: chapterCount,
            title: `Chapter ${chapterCount}`,
            content: paragraphs
          });
          
          // Stop if we've reached max chapters
          if (chapters.length >= this.maxChapters) {
            break;
          }
        }
      }
    }
    
    // If no chapters found, treat whole text as one chapter
    if (chapters.length === 0) {
      const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 0);
      
      if (paragraphs.length > 0) {
        chapters.push({
          id: 'chapter1',
          number: 1,
          title: 'Chapter 1',
          content: paragraphs
        });
      }
    }
    
    return chapters;
  }

  /**
   * Format a chapter title, preserving existing formats or adding "Chapter N" if needed
   * @param {string} title - Raw title text
   * @param {number} chapterNum - Chapter number for fallback
   * @returns {string} - Formatted title
   */
  formatChapterTitle(title, chapterNum) {
    // Already has "Chapter N" format
    const chapterMatch = title.match(/^Chapter\s+(\d+|[IVXLCDM]+)[\.:]?\s*(.*)$/i);
    if (chapterMatch) {
      const num = chapterMatch[1];
      const subtitle = chapterMatch[2].trim();
      return subtitle ? `Chapter ${num}: ${subtitle}` : `Chapter ${num}`;
    }
    
    // Numbered format like "1. Title"
    const numberedMatch = title.match(/^(\d+)\.\s*(.*)$/);
    if (numberedMatch) {
      const subtitle = numberedMatch[2].trim();
      return subtitle ? `Chapter ${numberedMatch[1]}: ${subtitle}` : `Chapter ${numberedMatch[1]}`;
    }
    
    // Markdown heading
    const markdownMatch = title.match(/^#+\s+(.+)$/);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }
    
    // Scene break markers
    if (/^\*\s*\*\s*\*$/.test(title)) {
      return `Chapter ${chapterNum}`;
    }
    
    // Plain text title - if it's short and looks like a title, keep it as is
    if (title.length <= 80 && !title.includes('.') && !title.includes('?')) {
      // Check if it's all caps or title case - likely a real title
      if (title === title.toUpperCase() || /^[A-Z]/.test(title)) {
        return title;
      }
    }
    
    // Default: add Chapter prefix
    return `Chapter ${chapterNum}: ${title}`;
  }

  /**
   * Format content array into HTML paragraphs
   * @param {Array} contentArray - Array of paragraph strings
   * @returns {string} HTML formatted content
   */
  formatContent(contentArray) {
    return contentArray
      .map(paragraph => `<p>${this.escapeHtml(paragraph)}</p>`)
      .join('\n    ');
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

    // Handle apostrophes
    title = title.toLowerCase().replace(/^.|(?<=\s)\w/g, l => l.toUpperCase());
    
    return title;
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
   * @param {string} titleAuthor - Title and author for page title
   * @param {string} titleAuthorDisplay - Title and author for display
   * @param {Array} chapters - Array of chapter objects
   * @returns {string} Complete HTML document
   */
  generateHTML(titleAuthor, titleAuthorDisplay, chapters) {
    const chaptersHTML = chapters.map(chapter => `
<div class="chapter-container">
  <div class="chapter-title">${chapter.title}</div>
  <div class="chapter-text">
    ${chapter.content}
  </div>
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
   * @param {string} manuscriptPath - Path to manuscript file (to extract title)
   * @param {string} manuscriptText - The manuscript text content
   * @param {Array} storyTitle - Array containing story title
   * @returns {string} Complete HTML document
   */
  processStory(manuscriptPath, manuscriptText, storyTitle) {
    const chapters = this.parseManuscriptText(manuscriptText);
    
    // Limit chapters to maxChapters
    const limitedChapters = chapters.slice(0, this.maxChapters);
    
    // Format content for each chapter
    const formattedChapters = limitedChapters.map(chapter => ({
      ...chapter,
      content: this.formatContent(chapter.content)
    }));
    
    const titleAuthor = `${storyTitle.join(' ').replace(/;/g, '')} by ${this.formatProperCase(appState.AUTHOR_NAME)}`;
    const titleAuthorDisplay = `${storyTitle.join(' ').replace(/;/g, '')} &nbsp;<small><em>by ${this.formatProperCase(appState.AUTHOR_NAME)}</em></small>`;
    
    return this.generateHTML(titleAuthor, titleAuthorDisplay, formattedChapters);
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
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
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

module.exports = ManuscriptTextToHtml;