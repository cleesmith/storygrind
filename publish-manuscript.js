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
    this.authorName = config.authorName || 'AUTHOR NAME';
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
        const errorMsg = 'No manuscript_*.html or manuscript_*.epub files found in current project.';
        this.emitOutput(errorMsg);
        return {
          success: false,
          message: errorMsg,
          outputFiles: []
        };
      }

      // Show only the selected file
      const selectedFile = options.manuscript_file;
      const selectedFileName = path.basename(selectedFile);
      
      this.emitOutput(`Using manuscript file: ${selectedFileName}\n`);

      // Extract project name from path
      const projectName = path.basename(projectPath);
      
      // Use user-provided title or fall back to formatted project name
      const displayTitle = options.title || this.formatProjectName(projectName);
      
      // Get manuscript base name from options
      const manuscriptBaseName = selectedFile ? path.basename(selectedFile, path.extname(selectedFile)) : 'manuscript';
      
      this.emitOutput(`\nPublishing project: ${displayTitle}\n`);

      // Generate SVG cover with user-provided title and author
      const svgOutputPath = await this.generateSVGCover(projectName, displayTitle, options.author || this.authorName);
      
      // Update book index and get the HTML file used
      const htmlFile = await this.updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, options.purchase_url || '');

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
   * Generate SVG cover from book.svg template
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} authorName - Author name
   * @returns {Promise<string>} - Path to generated SVG file
   */
  async generateSVGCover(projectName, displayTitle, authorName) {
    const templatePath = path.join(__dirname, 'book.svg');
    const imagesDir = path.join(appState.PROJECTS_DIR, 'images');
    const outputPath = path.join(imagesDir, `${projectName}.svg`);

    this.emitOutput(`Reading SVG template: ${templatePath}\n`);
    
    // Ensure images directory exists
    await fsPromises.mkdir(imagesDir, { recursive: true });

    // Read template
    const templateContent = await fsPromises.readFile(templatePath, 'utf8');
    
    // Replace placeholders
    let svgContent = templateContent;
    
    // Replace book title (handle the "BOOK" placeholder)
    const titleUpper = displayTitle.toUpperCase();
    svgContent = svgContent.replace(/BOOK/g, titleUpper);
    
    // Replace author name
    const authorUpper = (authorName || 'AUTHOR NAME').toUpperCase();
    svgContent = svgContent.replace(/AUTHOR NAME/g, authorUpper);

    // Write the customized SVG
    await fsPromises.writeFile(outputPath, svgContent, 'utf8');
    
    this.emitOutput(`Generated SVG cover: ${outputPath}\n`);
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
    const templatePath = path.join(__dirname, 'book_index.html');
    const projectDir = path.join(appState.PROJECTS_DIR, projectName);

    this.emitOutput(`Updating book index: ${bookIndexPath}\n`);

    // If index.html doesn't exist in projects dir, copy from book_index.html template
    if (!fs.existsSync(bookIndexPath)) {
      this.emitOutput(`Creating index.html from book_index.html template\n`);
      await fsPromises.copyFile(templatePath, bookIndexPath);
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
    const newProjectEntry = `
<!-- BOOK_START:${projectName} -->
  <div class="project">
    <img src="images/${projectName}.svg" alt="${displayTitle} Book Cover" style="border-radius: 4px;">
    <div class="button-container">
      <a href="${projectName}/${htmlFile || 'index.html'}" class="book-button html-button" title="Read '${displayTitle}' online">HTML</a>
      <a href="${projectName}/${epubFile || projectName + '.epub'}" class="book-button ebook-button" title="Download '${displayTitle}' EPUB" download>EBOOK</a>
      <a href="${purchaseUrl || 'https://www.amazon.com/'}" target="_blank" class="book-button buy-button" title="Purchase '${displayTitle}'">BUY</a>
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
