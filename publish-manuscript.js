/**
 * PublishManuscript - Publish completed manuscripts to book collection
 * Creates SVG covers and updates book index for projects with existing manuscript files
 */

const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const appState = require('./state.js');

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
      // Check if this is an unpublish operation
      if (options.unpublish === 'yes') {
        return await this.unpublishBook(projectPath, options);
      }

      // Check if manuscript files exist
      const manuscriptFiles = await this.findManuscriptFiles(projectPath);
      
      if (manuscriptFiles.length === 0) {
        let errorMsg = `\nError: can not find: manuscript_*.html and/or manuscript_*.epub files.\n`;
        errorMsg += `                          note: * refers to the file's timestamp\n`;
        errorMsg += '\nBefore publishing, you must run either or both:\n\n';
        errorMsg += 'Manuscript to HTML Converter\n\n';
        errorMsg += 'Manuscript to EPUB Converter\n\n';
        errorMsg += `... see both converters in: "Run a non-AI tool:" on the main screen.`;
        this.emitOutput(errorMsg);
        return {
          success: false,
          message: errorMsg,
          outputFiles: []
        };
      }

      this.emitOutput(`Project: ${appState.CURRENT_PROJECT}\n`);

      // Show only the selected file
      const selectedFile = options.manuscript_file;
      const selectedFileName = path.basename(selectedFile);
      
      this.emitOutput(`\nUsing manuscript file: ${selectedFileName}\n`);

      // Extract project name from path
      const projectName = path.basename(projectPath);
      
      // Use user-provided title or fall back to formatted project name
      const displayTitle = options.title || this.formatProjectName(projectName);
      
      // Get manuscript base name from options
      const manuscriptBaseName = selectedFile ? path.basename(selectedFile, path.extname(selectedFile)) : 'manuscript';
      
      this.emitOutput(`\nTitle: ${displayTitle}\n`);

      appState.setAuthorName(options.author);

      // Generate SVG cover with user-provided title and author
      const svgOutputPath = await this.generateSVGCover(projectName, displayTitle, appState.AUTHOR_NAME);
      
      // Update book index and get the HTML file used
      const htmlFile = await this.updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, options.purchase_url || '#');

      this.emitOutput(`\nPublication complete!\n`);
      
      // Only return HTML files for editing (no SVG files)
      const editableFiles = [];
      if (htmlFile) {
        const projectDir = path.join(appState.PROJECTS_DIR, projectName);
        const htmlPath = path.join(projectDir, htmlFile);
        if (fs.existsSync(htmlPath)) {
          editableFiles.push(htmlPath);
        }
      }

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
   * Format project name for display
   * @param {string} projectName - Raw project name
   * @returns {string} - Formatted display title
   */
  formatProjectName(projectName) {
    let title = projectName;
    
    // Handle camelCase and underscores
    title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
    title = title.replace(/_/g, ' ');
    
    // Convert to Title Case
    title = title.replace(/\b\w+/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    return title.trim();
  }

  /**
   * Generate SVG cover from embedded template
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} authorName - Author name
   * @returns {Promise<string>} - Path to generated SVG file
   */
  async generateSVGCover(projectName, displayTitle, authorName) {
    const imagesDir = path.join(appState.PROJECTS_DIR, 'images');
    const outputPath = path.join(imagesDir, `${projectName}.svg`);
    
    // Ensure images directory exists
    await fsPromises.mkdir(imagesDir, { recursive: true });

    // Embedded SVG template
    const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2560" width="1600" height="2560">

  <!-- xattr -c some.svg = can open with an app! -->

  <!-- Background with elegant gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a2a2a" />
      <stop offset="100%" stop-color="#121212" />
    </linearGradient>
    <!-- Text shadow filter for better readability -->
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3" />
    </filter>
  </defs>
  
  <!-- Main background covering the entire area -->
  <rect width="1600" height="2560" fill="url(#bgGradient)" />
  
  <!-- Title areas with proper width constraints -->
  <!-- 
    TEMPLATE STRUCTURE:
    - Each title format (1, 2, or 3 lines) has its own group
    - Comment/uncomment the appropriate group based on your title needs
    - Each text element has appropriate font sizing for its position
    - Width is controlled through font size adjustments
  -->
  
  <!-- OPTION 1: Single-line title format (best for short titles like "Liz", "Tsu", "Delta") -->
  <!--   
  -->  
  <g id="single-line-title">
    <text x="800" y="700" font-family="Arial, sans-serif" font-size="150" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">BOOK</text>
  </g>

  <!-- OPTION 2: Two-line title format (best for medium titles like "A DARKER ROAST", "THE MUNDANE SPEAKS") -->
  <!-- 
  <g id="two-line-title">
    <text x="800" y="600" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">BOOK</text>
    <text x="800" y="780" font-family="Arial, sans-serif" font-size="130" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">TITLE</text>
  </g>
  -->
  
  <!-- OPTION 3: Three-line title format (best for longer titles like "Something From Nothing") -->
  <!-- 
  <g id="three-line-title">
    <text x="800" y="500" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">A</text>
    <text x="800" y="680" font-family="Arial, sans-serif" font-size="110" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">BOOK</text>
    <text x="800" y="860" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">TITLE</text>
  </g>
  -->
  
  <!-- Author name - consistent across all formats -->
  <text x="800" y="2300" font-family="Arial, sans-serif" font-size="90" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">AUTHOR NAME</text>
</svg>`;
    
    // Replace placeholders
    let svgContent = svgTemplate;
    
    // Replace book title (handle the "BOOK" placeholder)
    const titleUpper = displayTitle.toUpperCase();
    svgContent = svgContent.replace(/BOOK/g, titleUpper);
    
    // Replace author name
    const authorUpper = (authorName || this.authorName).toUpperCase();
    svgContent = svgContent.replace(/AUTHOR NAME/g, authorUpper);

    // Write the customized SVG
    await fsPromises.writeFile(outputPath, svgContent, 'utf8');
    
    this.emitOutput(`\nGenerated SVG cover: ${outputPath}\n`);
    return outputPath;
  }

  /**
   * Update index.html with new project entry
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} manuscriptBaseName - Base name of manuscript file
   * @param {string} selectedFile - Selected manuscript file
   * @param {string} purchaseUrl - Purchase URL for the BUY button
   * @returns {Promise<void>}
   */
  async updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, purchaseUrl) {
    const bookIndexPath = path.join(appState.PROJECTS_DIR, 'index.html');
    const projectDir = path.join(appState.PROJECTS_DIR, projectName);

    this.emitOutput(`Updating book index: ${bookIndexPath}\n`);

    // If index.html doesn't exist in projects dir, create from embedded template
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
    
    body, h1, h2, h3, h4, h5, h6  {
      font-family: Helvetica, Arial, sans-serif;
    }
    body {
      background-color: var(--background-dark);
      color: var(--text-dark);
      transition: background-color 0.3s, color 0.3s;
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
      grid-gap: 20px;
      margin: 0 auto;
      max-width: 1200px;
    }

    .project {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
      height: 110px;
      justify-content: space-between;
    }

    .project img {
      width: 170px;
      height: auto;
      object-fit: cover;
      transition: all 0.3s ease;
    }

    .project img:hover {
      filter: sepia(90%);
    }

    .project-title {
      height: 40px;
      line-height: 20px;
      margin: 10px 0 5px 0;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--project-title-dark);
      text-align: center;
      transition: color 0.3s;
      cursor: pointer;
      flex-shrink: 0;
      overflow: hidden;
    }
    
    body.light-mode .project-title {
      color: var(--project-title-light);
    }

    .w3-bar {
      display: flex;
      justify-content: center;
    }

    /* Button container styling */
    .button-container {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      justify-content: center;
      flex-shrink: 0;
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

    /* Original read button (keeping for compatibility) */
    .read-button {
      border: none;
      padding: 8px 16px;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      font-size: 10px;
      letter-spacing: 4px;
      border-radius: 32px;
      background-color: #4CAF50;
      color: white;
      opacity: 0.6;
      transition: all 0.3s ease;
    }

    .read-button:hover {
      opacity: 1;
    }

    /* Footer styling */
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      background-color: #000;
      color: #9e9e9e;
      padding: 10px 0;
      text-align: center;
      font-size: 15px;
      transition: background-color 0.3s;
      display: flex;
      justify-content: center;
      align-items: center;
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

    /* Spacing for footer */
    .footer-spacer {
      height: 60px;
    }

    /* Media queries for different screen sizes */
    @media (max-width: 600px) {
      .book-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (min-width: 601px) and (max-width: 900px) {
      .book-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 901px) and (max-width: 1200px) {
      .book-grid {
        grid-template-columns: repeat(3, 1fr);
    }
    
    @media (min-width: 1201px) {
      .book-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    /* Extra large screens */
    @media (min-width: 1600px) {
      .book-grid {
        grid-template-columns: repeat(5, 1fr);
      }
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
    
    // Find HTML file
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
    
    // Find EPUB file
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
    <img src="images/${projectName}.svg" alt="${displayTitle} Book Cover" style="border-radius: 4px;">
    <div class="button-container">
`;
    
    // Only add HTML button if HTML file exists
    if (htmlFile) {
      newProjectEntry += `      <a href="${projectName}/${htmlFile}" class="book-button html-button" title="Read '${displayTitle}' online">HTML</a>
`;
    }
    
    // Only add EPUB button if EPUB file exists
    if (epubFile) {
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
    
    this.emitOutput(`Added ${displayTitle} to book index\n`);
    
    // Return the HTML file for editing
    return htmlFile;
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
      this.emitOutput(`Removed book entry from index.html\n`);
    }
    
    // Remove SVG file if it exists
    const svgPath = path.join(appState.PROJECTS_DIR, 'images', `${projectName}.svg`);
    if (fs.existsSync(svgPath)) {
      await fsPromises.unlink(svgPath);
      this.emitOutput(`Removed SVG cover: ${svgPath}\n`);
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
