/**
 * PublishManuscript - publish completed manuscript
 *  to book collection as: 
 *    cover images, HTML, EPUB, BUY
 */

const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const appState = require('./state.js');
const ManuscriptTextToHtml = require('./manuscript-to-html');
const ManuscriptToEpub = require('./manuscript-to-epub');

class PublishManuscript extends ToolBase {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {Object} config - Tool configuration
   */
  constructor(name, config = {}) {
    super(name, config);
    this.authorName = config.authorName || 'Anonymous';
  }

  /**
   * Format title lines
   * @param {string} name - Raw title
   * @returns {string} - Formatted title
   */
  splitTitle(title) {
    // Semicolon newlines (user control), up to 20 lines
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
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    const projectPath = appState.CURRENT_PROJECT_PATH;
    
    if (!projectPath) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    try {
      // Unpublish this book
      if (options.unpublish === 'yes') {
        return await this.unpublishBook(projectPath, options);
      }

      // Show only the selected file
      const selectedFile = options.manuscript_file;
      const selectedFileName = path.basename(selectedFile);

      // Extract project name from path
      const projectName = path.basename(projectPath);
      
      // Use user-provided title or do formatted project name
      const caseTitle = this.formatProperCase(options.title) || this.formatProperCase(projectName);
      const displayTitle = this.splitTitle(caseTitle);
      const showTitle = this.splitTitle(caseTitle).join(' ');
      
      // Get manuscript base name from options
      const manuscriptBaseName = selectedFile ? path.basename(selectedFile, path.extname(selectedFile)) : 'manuscript';

      appState.setAuthorName(options.author);

      // Generate fresh manuscript files (HTML, cover.jpg, EPUB) from source text
      await this.generateManuscriptFiles(projectPath, appState.AUTHOR_NAME, displayTitle, options);

      // Now find the newly created manuscript files
      const manuscriptFiles = await this.findManuscriptFiles(projectPath);
      
      // Update book index and get the HTML file used
      const htmlFile = await this.updateBookIndex(projectName, showTitle, manuscriptBaseName, selectedFile, options.purchase_url || '#', options.show_what);
      
      // Only return HTML file for editing
      const editableFiles = [];
      if (htmlFile) {
        const projectDir = path.join(appState.PROJECTS_DIR, projectName);
        const htmlPath = path.join(projectDir, htmlFile);
        if (fs.existsSync(htmlPath)) {
          editableFiles.push(htmlPath);
        }
      }

      this.emitOutput(`Project: ${appState.CURRENT_PROJECT}\n`);
      this.emitOutput(`\nUsing manuscript file: ${selectedFileName}\n`);
      this.emitOutput(`\nTitle: ${showTitle}\n`);

      const filePath = path.join(appState.PROJECTS_DIR, 'index.html');
      this.emitOutput(`\n\t***************************************************************\n`);
      this.emitOutput(`\t*                 PUBLISHING COMPLETED\n`);
      this.emitOutput(`\t*\n`);
      this.emitOutput(`\t* \tSTANDBY, your web browser will open in:\n`);
      this.emitOutput(`\t*\n`);
      this.emitOutput(`\t* \t\t-->>>  6 seconds  <<<--\n`);
      this.emitOutput(`\t*\n`);
      this.emitOutput(`\t* \tto show your book entry with cover, HTML, EPUB at:\n`);
      this.emitOutput(`\t*\n`);
      this.emitOutput(`\t* \t\t${filePath}\n`);
      this.emitOutput(`\t*\n`);
      this.emitOutput(`\t***************************************************************\n`);

      setTimeout(() => {
        try {
          let child;
          if (process.platform === 'darwin') {
            // macOS - open command uses default browser
            child = spawn('open', [filePath], {
              detached: true,
              stdio: 'ignore'
            });
          } else if (process.platform === 'win32') {
            // Windows - start command opens with default program
            child = spawn('start', [filePath], {
              detached: true,
              stdio: 'ignore',
              shell: true
            });
          } else {
            // Linux/Unix - xdg-open uses default application
            child = spawn('xdg-open', [filePath], {
              detached: true,
              stdio: 'ignore'
            });
          }
          
          if (child) {
            child.unref();
          }
        } catch (error) {
          // Fail silently as requested
        }
      }, 6000);

      return {
        success: true,
        message: `Published ${displayTitle} successfully`,
        outputFiles: editableFiles,
        stats: {
          manuscriptFiles: manuscriptFiles.length,
          projectName: projectName,
          displayTitle: displayTitle
        }
      };

    } catch (error) {
      console.error('Error in Publish Manuscript:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Find manuscript HTML or EPUB files in the project directory
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Array>} - Array of manuscript file paths
   */
  async findManuscriptFiles(projectPath) {
    const files = await fsPromises.readdir(projectPath);
    const manuscriptFiles = files.filter(file => {
      const fileName = file.toLowerCase();
      return (fileName.startsWith('manuscript_') && 
              (fileName.endsWith('.html') || fileName.endsWith('.epub')));
    });
    
    return manuscriptFiles.map(file => path.join(projectPath, file));
  }

  /**
   * Update index.html with new project entry
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} manuscriptBaseName - Base name of manuscript file
   * @param {string} selectedFile - Selected manuscript file
   * @param {string} purchaseUrl - Purchase URL for the BUY button
   * @param {string} showWhat - Controls which files to show: 'both', 'html_only', 'epub_only'
   * @returns {Promise<void>}
   */
  async updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, purchaseUrl, showWhat) {
    const bookIndexPath = path.join(appState.PROJECTS_DIR, 'index.html');
    const projectDir = path.join(appState.PROJECTS_DIR, projectName);

    this.emitOutput(`Updating book index: ${bookIndexPath}\n`);

    // If manuscript_*.html doesn't exist in projects dir, 
    // create from embedded template
    if (!fs.existsSync(bookIndexPath)) {
      this.emitOutput(`Creating index.html from embedded template\n`);
      
      // Embedded HTML template - exact verbatim copy from book_index.html
      const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Books</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="shortcut icon" href="images/icon.png" type="image/x-icon">
  <meta name="description" content="books and writing projects">

  <style>
    :root {
      --button-bg-color: #4CAF50;
      --button-text-color: #ffffff;
      --border-color: #444;
      --background-light: #f5f5f5;
      --text-light: #333333;
      --title-light: #2c3035;
      --project-title-light: #3a5875;
      --background-dark: #2c3035;
      --text-dark: #ffffff;
      --title-dark: #444;
      --project-title-dark: #607d8b;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body, h1, h2, h3, h4, h5, h6  {
      font-family: Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--background-dark);
      color: var(--text-dark);
      transition: background-color 0.3s, color 0.3s;
      padding: 20px;
      min-height: 100vh;
    }
    
    body.light-mode {
      background-color: var(--background-light);
      color: var(--text-light);
    }

    .title-box {
      background-color: var(--title-dark);
      padding: 5px;
      font-size: 24px;
      margin-bottom: 20px;
      transition: background-color 0.3s;
    }
    
    body.light-mode .title-box {
      background-color: var(--title-light);
    }

    .title-box img {
      width: 90px;
      height: auto;
      object-fit: cover;
    }
    
    /* Responsive book grid */
    .book-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin: 0 auto;
      max-width: 1200px;
      padding-bottom: 80px; /* Space for footer */
    }

    .project {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .project img {
      width: 100%;
      max-width: 170px;
      height: auto;
      object-fit: cover;
      transition: all 0.3s ease;
      border-radius: 4px;
      aspect-ratio: 2/3; /* Maintain book cover aspect ratio */
    }

    .project img:hover {
      filter: sepia(90%);
      transform: translateY(-2px);
    }

    .project-title {
      margin: 10px 0 5px 0;
      color: var(--project-title-dark);
      font-size: 14px;
      line-height: 1.4;
      transition: color 0.3s;
      cursor: pointer;
      word-wrap: break-word;
      hyphens: auto;
    }
    
    body.light-mode .project-title {
      color: var(--project-title-light);
    }

    /* Button container styling */
    .button-container {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Small button styling */
    .book-button {
      border: none;
      padding: 4px 8px;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      font-size: 9px;
      letter-spacing: 1px;
      border-radius: 12px;
      color: white;
      opacity: 0.7;
      transition: all 0.3s ease;
      min-width: 35px;
      white-space: nowrap;
    }

    .book-button:hover {
      opacity: 1;
      transform: translateY(-1px);
    }

    .html-button {
      background-color: #2196F3;
    }

    .ebook-button {
      background-color: #FF9800;
    }

    .buy-button {
      background-color: #4CAF50;
    }

    .no-buy-button {
      background-color: red;
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

    /* Mobile-specific adjustments */
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      
      .book-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .project img {
        max-width: 200px;
      }
      
      .project-title {
        font-size: 13px;
      }
      
      .book-button {
        font-size: 9px;
        padding: 4px 8px;
      }
    }
    
    /* Tablet screens */
    @media (min-width: 601px) and (max-width: 768px) {
      .book-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    /* Larger tablets */
    @media (min-width: 769px) and (max-width: 900px) {
      .book-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    /* Desktop screens */
    @media (min-width: 901px) and (max-width: 1200px) {
      .book-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    /* Large desktop screens */
    @media (min-width: 1201px) and (max-width: 1600px) {
      .book-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    
    /* Extra large screens */
    @media (min-width: 1601px) {
      .book-grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }

    /* Spacing for footer */
    .footer-spacer {
      height: 60px;
    }
  </style>
</head>

<body>
<div class="book-grid">
<!-- BOOKS_START -->



<!-- BOOKS_END -->
</div>

<div class="footer-spacer"></div>
<div class="footer">
  <div>© &nbsp;2025 &nbsp;&nbsp;Books &nbsp;&nbsp;<button id="darkModeToggle" title="Switch dark and light mode">☀️</button></div>
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
      
      await fsPromises.writeFile(bookIndexPath, htmlTemplate, 'utf8');
    }

    // Read current book index
    let indexContent = await fsPromises.readFile(bookIndexPath, 'utf8');

    // Check if this project already exists and remove it for replacement
    const projectStartPattern = new RegExp(`<!-- BOOK_START:${projectName} -->`, 'i');
    const projectEndPattern = new RegExp(`<!-- BOOK_END:${projectName} -->`, 'i');
    
    if (projectStartPattern.test(indexContent) && projectEndPattern.test(indexContent)) {
      this.emitOutput(`Project ${projectName} already exists - replacing entry\n`);
      
      // Remove existing entry
      const startMatch = indexContent.match(projectStartPattern);
      const endMatch = indexContent.match(projectEndPattern);
      
      if (startMatch && endMatch) {
        const startIndex = indexContent.indexOf(startMatch[0]);
        const endIndex = indexContent.indexOf(endMatch[0]) + endMatch[0].length;
        
        // Remove the existing entry including the newline after it
        indexContent = indexContent.slice(0, startIndex) + indexContent.slice(endIndex + 1);
      }
    }

    // Find HTML and EPUB files for the buttons
    const projectFiles = await fsPromises.readdir(projectDir);
    
    // Find HTML file: there should only be 1 .html file!
    let htmlFile = null;
    if (selectedFile && selectedFile.endsWith('.html')) {
      htmlFile = path.basename(selectedFile);
    } else {
      const htmlFiles = projectFiles.filter(file => file.endsWith('.html'));
      if (htmlFiles.length > 0) {
        const manuscriptHtml = htmlFiles.find(file => file.startsWith(manuscriptBaseName + '_') || file === manuscriptBaseName + '.html');
        if (manuscriptHtml) {
          htmlFile = manuscriptHtml;
        }
      }
    }
    
    // Find EPUB file: there should only be 1 .epub file!
    let epubFile = null;
    if (selectedFile && selectedFile.endsWith('.epub')) {
      epubFile = path.basename(selectedFile);
    } else {
      const epubFiles = projectFiles.filter(file => file.endsWith('.epub'));
      if (epubFiles.length > 0) {
        const manuscriptEpub = epubFiles.find(file => file.startsWith(manuscriptBaseName + '_') || file === manuscriptBaseName + '.epub');
        if (manuscriptEpub) {
          epubFile = manuscriptEpub;
        }
      }
    }

    // Create new project entry with 3-button layout
    let newProjectEntry = `
<!-- BOOK_START:${projectName} -->
  <div class="project">
    <img src="${projectName}/cover.jpg" alt="${displayTitle} Book Cover" style="border-radius: 4px;">
    <div class="button-container">
`;
    
    // Only add HTML button if HTML file exists and visibility allows it
    if (htmlFile && (showWhat === 'both' || showWhat === 'html')) {
      newProjectEntry += `      <a href="${projectName}/${htmlFile}" class="book-button html-button" title="Read '${displayTitle}' online">HTML</a>
`;
    }
    
    // Only add EPUB button if EPUB file exists and visibility allows it
    if (epubFile && (showWhat === 'both' || showWhat === 'epub')) {
      newProjectEntry += `      <a href="${projectName}/${epubFile}" class="book-button ebook-button" title="Download '${displayTitle}' EPUB" download>EBOOK</a>
`;
    }

    // Only add BUY button if there's a valid purchase URL
    if (purchaseUrl && purchaseUrl !== '#') {
      newProjectEntry += `      <a href="${purchaseUrl}" target="_blank" class="book-button buy-button" title="Purchase '${displayTitle}'">BUY</a>
`;
    }

    newProjectEntry += `
    </div>
  </div>
<!-- BOOK_END:${projectName} -->
`;

    // Find insertion point (after <!-- BOOKS_START --> comment)
    const booksStartTag = '<!-- BOOKS_START -->';
    const insertionIndex = indexContent.indexOf(booksStartTag);
    
    if (insertionIndex === -1) {
      throw new Error('Could not find BOOKS_START comment marker in index.html');
    }

    // Insert after the BOOKS_START comment
    const insertAfter = insertionIndex + booksStartTag.length;
    indexContent = indexContent.slice(0, insertAfter) + newProjectEntry + indexContent.slice(insertAfter);

    // Write updated index
    await fsPromises.writeFile(bookIndexPath, indexContent, 'utf8');
    
    // Return the HTML file for editing
    return htmlFile;
  }

  /**
   * Generate manuscript files (HTML, cover.jpg, EPUB) from source text
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Tool options
   * @returns {Promise<void>}
   */
  async generateManuscriptFiles(projectPath, displayAuthor, displayTitle, options) {
    // Find the source manuscript text file
    const files = await fsPromises.readdir(projectPath);
    const textFiles = files.filter(file => {
      const fileName = file.toLowerCase();
      return fileName.endsWith('.txt') && (fileName.includes('manuscript') || fileName === 'manuscript.txt');
    });
    
    if (textFiles.length === 0) {
      throw new Error('No manuscript text file found. Please ensure you have a manuscript.txt file in your project.');
    }
    
    // Use the first manuscript text file found
    const manuscriptTextFile = path.join(projectPath, textFiles[0]);
    
    this.emitOutput(`Found manuscript text file: ${textFiles[0]}\n`);
    this.emitOutput(`Generating HTML and EPUB files...\n`);
    
    // Create HTML converter and run it
    const htmlConverter = new ManuscriptTextToHtml('manuscript-to-html');
    const htmlOptions = {
      manuscript_file: manuscriptTextFile,
      title: displayTitle,
      author: displayAuthor,
      max_chapters: 'all'
    };
    
    this.emitOutput(`Converting to HTML...\n`);
    await htmlConverter.execute(htmlOptions);

    // Create EPUB converter and run it
    const epubConverter = new ManuscriptToEpub('manuscript-to-epub');
    const epubOptions = {
      text_file: manuscriptTextFile,
      displayTitle: displayTitle.join(' '),
      title: options.title,
      author: displayAuthor,
      language: 'en',
      publisher: 'StoryGrind',
      description: 'Created with StoryGrind'
    };
    
    this.emitOutput(`Converting to EPUB with cover image cover.jpg...\n`);
    await epubConverter.execute(epubOptions);
    
    this.emitOutput(`Manuscript files generated successfully!\n\n`);
  }

  /**
   * Unpublish a book from the index.html file
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Unpublish result
   */
  async unpublishBook(projectPath, options) {
    const projectName = path.basename(projectPath);
    const indexPath = path.join(appState.PROJECTS_DIR, 'index.html');
    
    this.emitOutput(`Unpublishing project: ${projectName}\n`);
    
    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      const errorMsg = 'No published books found (index.html does not exist)';
      this.emitOutput(errorMsg);
      return {
        success: false,
        message: errorMsg,
        outputFiles: []
      };
    }
    
    // Read current index content
    let indexContent = await fsPromises.readFile(indexPath, 'utf8');
    
    // Reuse the existing removal logic from updateBookIndex
    const projectStartPattern = new RegExp(`<!-- BOOK_START:${projectName} -->`, 'i');
    const projectEndPattern = new RegExp(`<!-- BOOK_END:${projectName} -->`, 'i');
    
    if (!projectStartPattern.test(indexContent) || !projectEndPattern.test(indexContent)) {
      const errorMsg = `Book "${projectName}" not found in published index`;
      this.emitOutput(errorMsg);
      return {
        success: false,
        message: errorMsg,
        outputFiles: []
      };
    }
    
    // Remove existing entry (same logic as updateBookIndex)
    const startMatch = indexContent.match(projectStartPattern);
    const endMatch = indexContent.match(projectEndPattern);
    
    if (startMatch && endMatch) {
      const startIndex = indexContent.indexOf(startMatch[0]);
      const endIndex = indexContent.indexOf(endMatch[0]) + endMatch[0].length;
      
      // Remove the existing entry including the newline after it
      indexContent = indexContent.slice(0, startIndex) + indexContent.slice(endIndex + 1);
      
      // Write updated index (but don't add anything new)
      await fsPromises.writeFile(indexPath, indexContent, 'utf8');
      this.emitOutput(`Removed book entry from books in: index.html\n`);
    }
    
    this.emitOutput(`\nBook "${projectName}" unpublished successfully!\n`);
    
    return {
      success: true,
      message: `Book "${projectName}" unpublished successfully`,
      outputFiles: []
    };
  }
}

module.exports = PublishManuscript;
