// brainstorm.js
const ToolBase = require('./tool-base');
const path = require('path');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * Brainstorm Tool
 * Helps generate initial story ideas, prompts, and creative angles.
 * Appends more ideas to the existing 'ideas.txt' file.
 */
class BrainstormTool extends ToolBase {
  constructor(apiService, config = {}) {
    super('brainstorm', config);
    this.apiService = apiService;
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    
    // Extract options
    const ideasFile = options.ideas_file;
    const outputFiles = [];
    const conceptOnly = false;
    const charactersOnly = false;
    let saveDir = appState.CURRENT_PROJECT_PATH;
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    const absoluteIdeasFile = this.ensureAbsolutePath(ideasFile, saveDir);
    
    try {
      this.emitOutput(`Reading ideas file: ${absoluteIdeasFile}\n`);
      const ideasContent = await this.readIdeasFile(absoluteIdeasFile);

      // Generate concept and characters based on options
      this.emitOutput("\nUsing ideas file to generate both concept and characters...\n");
      const conceptFile = await this.generateAndAppend(ideasContent, absoluteIdeasFile, saveDir, options);
      outputFiles.push(conceptFile);
      
      this.emitOutput("\nGeneration complete!\n");
      
      return {
        success: true,
        outputFiles,
        stats: {
          ideasFile: absoluteIdeasFile
        }
      };
      
    } catch (error) {
      console.error('Error in Brainstorm Tool:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Read ideas file
   * @param {string} filepath - Path to ideas file
   * @returns {Promise<string>} - File content
   */
  async readIdeasFile(filepath) {
    try {
      const content = await this.readInputFile(filepath);
      return content.trim();
    } catch (error) {
      this.emitOutput(`Error: Ideas file '${filepath}' not found or couldn't be read.\n`);
      this.emitOutput(`Please specify an existing ideas file with the ideas_file parameter.\n`);
      throw error;
    }
  }
  
  /**
   * Generate content and append to ideas file
   * @param {string} ideasContent - Content of ideas file
   * @param {string} ideasFile - Path to ideas file
   * @param {string} saveDir - Directory to save output
   * @param {Object} options - Tool options
   * @returns {Promise<string>} - Path to saved file
   */
  async generateAndAppend(ideasContent, ideasFile, saveDir, options) {
    const basePrompt = await this.getPrompt();
    if (!basePrompt) {
      throw new Error('Could not load prompt for brainstorm tool');
    }
    const prompt = `=== IDEAS CONTENT ===\n${ideasContent}\n=== END IDEAS CONTENT ===\n\n${basePrompt}`;

    const promptTokens = await this.apiService.countTokens(prompt);
    
    this.emitOutput(`\nSending request to AI API . . .\n`);
    this.emitOutput(`\n`);
    
    const startTime = Date.now();
    let fullResponse = "";
    let thinkingContent = "";

    try {
      // july 2025 fix for "no manuscript" error:
      this.apiService.prompt = " "; 

      await this.apiService.streamWithThinking(
        prompt,
        (textDelta) => {
          fullResponse += textDelta;
          this.emitOutput(textDelta);
        },
      );
    } catch (error) {
      this.emitOutput(`\nAPI Error: ${error.message}\n`);
      throw error;
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    this.emitOutput(`\nCompleted in ${minutes}m ${seconds.toFixed(2)}s.\n`);
    
    const wordCount = this.countWords(fullResponse);
    this.emitOutput(`Generated brainstorm has approximately ${wordCount} words.\n`);
    
    const responseTokens = await this.apiService.countTokens(fullResponse);
    this.emitOutput(`Response token count: ${responseTokens}\n`);
      
    // Save the brainstorm to a file
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
    const brainstormFilename = `brainstorm_${timestamp}.txt`;
    const brainstormPath = path.join(saveDir, brainstormFilename);
    
    await this.writeOutputFile(fullResponse, saveDir, brainstormFilename);
    this.emitOutput(`Brainstorm saved to: ${brainstormPath}\n`);
    
    
    return brainstormPath;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.replace(/(\r\n|\r|\n)/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    
    // Check if the path is already absolute
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Make the path absolute by joining with the base path
    return path.join(basePath, filePath);
  }
}

module.exports = BrainstormTool;
