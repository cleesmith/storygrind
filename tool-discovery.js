// tool-discovery.js
// Discovers user-created tools by scanning tool-prompts folders

const fs = require('fs/promises');
const path = require('path');
const appState = require('./state.js');

class ToolDiscovery {
  constructor() {
    this.promptsDir = path.join(appState.PROJECTS_DIR, 'tool-prompts');
  }

  /**
   * Convert filename to tool ID (hyphenated to underscore)
   * @param {string} filename - e.g., "my-custom-analyzer.txt"
   * @returns {string} - e.g., "my_custom_analyzer"
   */
  filenameToToolId(filename) {
    return filename.replace('.txt', '').replace(/-/g, '_');
  }

  /**
   * Convert filename to display title (smart formatting)
   * @param {string} filename - e.g., "my-custom-analyzer.txt"
   * @returns {string} - e.g., "My Custom Analyzer"
   */
  filenameToTitle(filename) {
    return filename
      .replace('.txt', '')
      .split(/[-_]/)  // Split on both hyphens and underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert folder name to category display name
   * @param {string} folderName - e.g., "MyCustomTools"
   * @returns {string} - e.g., "My Custom Tools"
   */
  folderToCategory(folderName) {
    // Insert space before capital letters (except the first one)
    return folderName.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * Generate standard manuscript_file option for all tools
   * @returns {object} - Standard file input configuration
   */
  getStandardManuscriptOption() {
    return {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": ["txt"]
        }
      ],
      "group": "Input Files"
    };
  }

  /**
   * Check if a folder should be ignored during discovery
   * @param {string} folderName - Name of the folder
   * @returns {boolean} - True if folder should be ignored
   */
  shouldIgnoreFolder(folderName) {
    // Only scan the 3 main subfolders, ignore everything else
    const allowedFolders = ['Core Editing Tools', 'Other Editing Tools', 'User Tools'];
    return !allowedFolders.includes(folderName);
  }

  /**
   * Check if a file should be ignored during discovery
   * @param {string} filename - Name of the file
   * @returns {boolean} - True if file should be ignored
   */
  shouldIgnoreFile(filename) {
    const ignoreFiles = ['.DS_Store'];
    const ignoreExtensions = ['.json', '.md', '.backup'];
    
    if (ignoreFiles.includes(filename)) return true;
    if (ignoreExtensions.some(ext => filename.endsWith(ext))) return true;
    if (!filename.endsWith('.txt')) return true;
    if (filename.startsWith('.')) return true;
    
    return false;
  }

  /**
   * Discover all user-created tools from categorized folders
   * @returns {Promise<Array>} - Array of tool definitions
   */
  async discoverUserTools() {
    const userTools = [];

    try {
      // Check if prompts directory exists
      await fs.access(this.promptsDir);
    } catch (error) {
      // No prompts directory, no user tools
      return userTools;
    }

    try {
      // Get all entries in the prompts directory
      const entries = await fs.readdir(this.promptsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (this.shouldIgnoreFolder(entry.name)) continue;

        const categoryPath = path.join(this.promptsDir, entry.name);
        const category = this.folderToCategory(entry.name);

        try {
          // Get all .txt files in this category folder
          const files = await fs.readdir(categoryPath);
          
          // For User Tools folder, limit to 10 files
          const isUserToolsFolder = entry.name === 'User Tools';
          let userToolCount = 0;

          for (const filename of files) {
            if (this.shouldIgnoreFile(filename)) continue;
            
            // Limit User Tools to maximum of 10 files
            if (isUserToolsFolder && userToolCount >= 10) {
              console.warn(`User Tools folder limited to 10 tools. Ignoring additional file: ${filename}`);
              continue;
            }

            const toolId = this.filenameToToolId(filename);
            const title = this.filenameToTitle(filename);
            const promptPath = path.join(categoryPath, filename);

            // Check if file has content before creating tool
            try {
              const content = await fs.readFile(promptPath, 'utf8');
              if (!content.trim()) {
                // Check if we have a default prompt for this tool
                const { toolPrompts } = require('./tool-prompts');
                if (!toolPrompts[toolId] || !toolPrompts[toolId].trim()) {
                  // Skip empty files without defaults
                  continue;
                }
                // Allow empty files that have defaults (they'll be restored when run)
              }
            } catch (error) {
              // Skip files that can't be read
              continue;
            }

            // Create tool definition
            const toolDef = {
              id: toolId,
              title: title,
              description: title, // Use title as description for simplicity
              category: category,
              promptPath: promptPath,
              isUserCreated: true,
              options: [this.getStandardManuscriptOption()]
            };

            userTools.push(toolDef);
            
            if (isUserToolsFolder) {
              userToolCount++;
            }
          }
        } catch (error) {
          console.warn(`Error reading category folder ${entry.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error discovering user tools:', error.message);
    }

    return userTools;
  }

  /**
   * Filter out user tools that conflict with built-in tool IDs
   * @param {Array} userTools - Array of discovered user tools
   * @param {Array} builtInToolIds - Array of built-in tool IDs
   * @returns {Array} - Filtered user tools
   */
  filterConflictingTools(userTools, builtInToolIds) {
    return userTools.filter(tool => {
      if (builtInToolIds.includes(tool.id)) {
        console.warn(`User tool "${tool.title}" (${tool.id}) conflicts with built-in tool. Skipping.`);
        return false;
      }
      return true;
    });
  }
}

module.exports = new ToolDiscovery();