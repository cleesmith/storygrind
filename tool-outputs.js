// tool-outputs.js
/**
 * Tracking output files created by tools
 * This is a singleton that can be imported by both tools and the main app
 */

const ToolOutputs = {
  // Store the most recent files for each tool
  _latestFiles: new Map(),
  
  /**
   * @param {string} toolName - Tool name/ID
   */
  clear(toolName) {
    this._latestFiles.set(toolName, []);
  },
  
  /**
   * Add a file to the list for a specific tool
   * @param {string} toolName - Tool name/ID
   * @param {string} filePath - Path to the created file
   */
  addFile(toolName, filePath) {
    if (!this._latestFiles.has(toolName)) {
      this._latestFiles.set(toolName, []);
    }
    
    // Add the file
    this._latestFiles.get(toolName).push(filePath);
    console.log(`Added file to Tool output list for ${toolName}: ${filePath}`);
  },
  
  /**
   * Get the most recent files for a specific tool
   * @param {string} toolName - Tool name/ID
   * @returns {Array} - Array of file objects with path and name properties
   */
  getFiles(toolName) {
    const files = this._latestFiles.get(toolName) || [];
    
    // Map full paths to objects with path and filename for UI display
    return files.map(filePath => {
      const path = require('path');
      return {
        path: filePath,
        name: path.basename(filePath)
      };
    });
  },
  
  /**
   * Get all tool names that have files
   * @returns {string[]} - Array of tool names
   */
  getToolsWithFiles() {
    return Array.from(this._latestFiles.keys()).filter(
      tool => this._latestFiles.get(tool).length > 0
    );
  }
};

module.exports = ToolOutputs;
