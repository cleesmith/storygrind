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

      this.emitOutput(`Found ${manuscriptFiles.length} manuscript file(s):\n`);
      manuscriptFiles.forEach(file => {
        this.emitOutput(`  - ${path.basename(file)}\n`);
      });

      // Extract project name from path
      const projectName = path.basename(projectPath);
      const displayTitle = this.formatProjectName(projectName);
      
      // Get manuscript base name from options
      const selectedFile = options.manuscript_file;
      const manuscriptBaseName = selectedFile ? path.basename(selectedFile, path.extname(selectedFile)) : 'manuscript';
      
      this.emitOutput(`\nPublishing project: ${displayTitle}\n`);

      // Generate SVG cover
      const svgOutputPath = await this.generateSVGCover(projectName, displayTitle, options.author || this.authorName);
      
      // Update book index
      await this.updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile);

      this.emitOutput(`\nPublication complete!\n`);
      
      return {
        success: true,
        message: `Published ${displayTitle} successfully`,
        outputFiles: [svgOutputPath],
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
   * Update book_index.html with new project entry
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @returns {Promise<void>}
   */
  async updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile) {
    const bookIndexPath = path.join(appState.PROJECTS_DIR, 'book_index.html');
    const templatePath = path.join(__dirname, 'book_index.html');
    const projectDir = path.join(appState.PROJECTS_DIR, projectName);

    this.emitOutput(`Updating book index: ${bookIndexPath}\n`);

    // If book_index.html doesn't exist in projects dir, copy from template
    if (!fs.existsSync(bookIndexPath)) {
      this.emitOutput(`Creating book_index.html from template\n`);
      await fsPromises.copyFile(templatePath, bookIndexPath);
    }

    // Read current book index
    let indexContent = await fsPromises.readFile(bookIndexPath, 'utf8');

    // Check if this project already exists in the index
    const projectPattern = new RegExp(`<a href="${projectName}/`, 'i');
    if (projectPattern.test(indexContent)) {
      this.emitOutput(`Project ${projectName} already exists in book index\n`);
      return;
    }

    // Use the selected file directly as link target
    let linkTarget = 'index.html'; // fallback
    
    if (selectedFile) {
      // Use the selected file directly - get just the filename
      linkTarget = path.basename(selectedFile);
console.dir(linkTarget);

    } else {
      // Find the latest HTML file to link to
      const projectFiles = await fsPromises.readdir(projectDir);
      const htmlFiles = projectFiles.filter(file => file.endsWith('.html'));
      
      if (htmlFiles.length > 0) {
        // Sort by modification time (newest first) or use the manuscript file if it exists
        const manuscriptHtml = htmlFiles.find(file => file.startsWith(manuscriptBaseName + '_') || file === manuscriptBaseName + '.html');
        if (manuscriptHtml) {
          linkTarget = manuscriptHtml;
        } else {
          // Use the most recent HTML file
          const stats = await Promise.all(htmlFiles.map(async file => ({
            file,
            mtime: (await fsPromises.stat(path.join(projectDir, file))).mtime
          })));
          stats.sort((a, b) => b.mtime - a.mtime);
          linkTarget = stats[0].file;
        }
      }
    }
console.dir(linkTarget);

    // Create new project entry
    const newProjectEntry = `
  <div class="project">
    <a href="${projectName}/${linkTarget}" style="text-decoration: none;" title="Read: ${displayTitle}">
      <img src="images/${projectName}.svg" alt="${displayTitle} Cover" style="border-radius: 4px;">
      <div class="project-title">${displayTitle}</div>
    </a>
  </div>
`;

    // Find insertion point (after <div class="book-grid">)
    const gridStartTag = '<div class="book-grid">';
    const insertionIndex = indexContent.indexOf(gridStartTag);
    
    if (insertionIndex === -1) {
      throw new Error('Could not find book-grid div in book_index.html');
    }

    // Insert after the opening tag
    const insertAfter = insertionIndex + gridStartTag.length;
    indexContent = indexContent.slice(0, insertAfter) + newProjectEntry + indexContent.slice(insertAfter);

    // Write updated index
    await fsPromises.writeFile(bookIndexPath, indexContent, 'utf8');
    
    this.emitOutput(`Added ${displayTitle} to book index\n`);
  }
}

module.exports = PublishManuscript;
