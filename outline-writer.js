// outline-writer.js
const ToolBase = require('./tool-base');
const path = require('path');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * Outline Writer Tool
 * Generates a plot outline from your brainstorming.
 */
class OutlineWriter extends ToolBase {
  constructor(apiService, config = {}) {
    super('outline_writer', config);
    this.apiService = apiService;
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    
    const brainstormFile = options.brainstorm_file;
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;

    const outputFiles = [];
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    try {
      let brainstormContent = "";
    
      // Ensure file paths are absolute
      const absoluteBrainstormFile = this.ensureAbsolutePath(brainstormFile, saveDir);

      try {
        brainstormContent = await this.readInputFile(absoluteBrainstormFile);
      } catch (error) {
        this.emitOutput(`Note: Brainstorm file not found or couldn't be read: ${error.message}\n`);
        throw new Error('Brainstorm file is required!');
      }
      
      const basePrompt = await this.getPrompt();
      if (!basePrompt) {
        throw new Error('Could not load prompt for outline writer tool');
      }
      const prompt = `=== BRAINSTORM CONTENT ===\n${brainstormContent}\n=== END BRAINSTORM CONTENT ===\n\n${basePrompt}`;
      
      const promptTokens = await this.apiService.countTokens(prompt);

      this.emitOutput(`\nSending request to AI API . . .\n`);
      this.emitOutput(`\n`);
      
      this.emitOutput(`****************************************************************************\n`);
      this.emitOutput(`*  This usually takes a few minutes...\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  It's recommended to keep this window the sole 'focus'\n`);
      this.emitOutput(`*  and to avoid browsing online or running other apps, as these API\n`);
      this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
      this.emitOutput(`****************************************************************************\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";
      
      try {
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
      
      // Calculate time elapsed
      const elapsed = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      this.emitOutput(`\nCompleted in ${minutes}m ${seconds.toFixed(2)}s.\n`);
      
      const wordCount = this.countWords(fullResponse);
      this.emitOutput(`Outline has approximately ${wordCount} words.\n`);
      
      const responseTokens = await this.apiService.countTokens(fullResponse);
      this.emitOutput(`Outline token count: ${responseTokens}\n`);
      
      // Save the outline to a file
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const outlineFilename = `outline_${timestamp}.txt`;
      const outlinePath = path.join(saveDir, outlineFilename);
      
      await this.writeOutputFile(fullResponse, saveDir, outlineFilename);
      this.emitOutput(`Outline saved to: ${outlinePath}\n`);
      
      // Add to output files list
      outputFiles.push(outlinePath);
      
      
      return {
        success: true,
        outputFiles,
        stats: {
          wordCount,
          tokenCount: responseTokens,
          elapsedTime: `${minutes}m ${seconds.toFixed(2)}s`
        }
      };
      
    } catch (error) {
      console.error('Error in Outline Writer:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
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

module.exports = OutlineWriter;
