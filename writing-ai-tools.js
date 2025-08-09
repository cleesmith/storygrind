// writing-ai-tools.js
const ToolBase = require('./tool-base');
const path = require('path');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * Unified Writing AI Tool
 * Handles brainstorm, outline_writer, and world_writer workflows
 * Uses external prompt files and maintains same functionality as original tools
 */
class WritingAITool extends ToolBase {
  constructor(apiService, config = {}) {
    super(config.toolId, config);
    this.apiService = apiService;
    this.workflow = config.toolId; // 'brainstorm', 'outline_writer', or 'world_writer'
  }
  
  /**
   * Execute the appropriate workflow based on tool ID
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    switch(this.workflow) {
      case 'brainstorm':
        return await this.executeBrainstorm(options);
      case 'outline_writer':
        return await this.executeOutline(options);
      case 'world_writer':
        return await this.executeWorld(options);
      default:
        throw new Error(`Unknown workflow: ${this.workflow}`);
    }
  }

  // ===========================================
  // BRAINSTORM WORKFLOW METHODS
  // ===========================================
  
  /**
   * Execute brainstorm workflow
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async executeBrainstorm(options) {
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
      const conceptFile = await this.generateBrainstormAndAppend(ideasContent, absoluteIdeasFile, saveDir, options);
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
   * Read ideas file for brainstorm workflow
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
   * Generate brainstorm content and append to ideas file
   * @param {string} ideasContent - Content of ideas file
   * @param {string} ideasFile - Path to ideas file
   * @param {string} saveDir - Directory to save output
   * @param {Object} options - Tool options
   * @returns {Promise<string>} - Path to saved file
   */
  async generateBrainstormAndAppend(ideasContent, ideasFile, saveDir, options) {
    const basePrompt = await this.getPrompt();
    if (!basePrompt) {
      throw new Error('Could not load prompt for brainstorm tool');
    }
    const prompt = `=== IDEAS CONTENT ===\n${ideasContent}\n=== END IDEAS CONTENT ===\n\n${basePrompt}`;

    // Aug 9, 2025: no reason to count tokens anymore
    // const promptTokens = await this.apiService.countTokens(prompt);
    
    this.emitOutput(`\nSending request to AI API: ${this.apiService.config.model_name}  . . .\n`);
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
    
    // const responseTokens = await this.apiService.countTokens(fullResponse);
    // this.emitOutput(`Response token count: ${responseTokens}\n`);
      
    // Save the brainstorm to a file
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
    const brainstormFilename = `brainstorm_${timestamp}.txt`;
    const brainstormPath = path.join(saveDir, brainstormFilename);
    
    await this.writeOutputFile(fullResponse, saveDir, brainstormFilename);
    this.emitOutput(`Brainstorm saved to: ${brainstormPath}\n`);
    
    return brainstormPath;
  }

  // ===========================================
  // OUTLINE WRITER WORKFLOW METHODS
  // ===========================================
  
  /**
   * Execute outline writer workflow
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async executeOutline(options) {
    const brainstormFile = options.brainstorm_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;

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
      
      // const promptTokens = await this.apiService.countTokens(prompt);

      this.emitOutput(`\nSending request to AI API: ${this.apiService.config.model_name}  . . .\n`);
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
      
      // const responseTokens = await this.apiService.countTokens(fullResponse);
      // this.emitOutput(`Outline token count: ${responseTokens}\n`);
      
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
          // tokenCount: responseTokens,
          elapsedTime: `${minutes}m ${seconds.toFixed(2)}s`
        }
      };
      
    } catch (error) {
      console.error('Error in Outline Writer:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  // ===========================================
  // WORLD WRITER WORKFLOW METHODS
  // ===========================================
  
  /**
   * Execute world writer workflow
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async executeWorld(options) {
    const title = options.title;
    const pov = options.pov;
    const brainstormFile = options.brainstorm_file;
    const outlineFile = options.outline_file;
    const language = appState.LANGUAGE.name;
    
    const saveDir = appState.CURRENT_PROJECT_PATH;
    const outputFiles = [];
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    // Validate required fields
    if (!title) {
      const errorMsg = 'Error: Title is required.\n';
      this.emitOutput(errorMsg);
      throw new Error('Title is required');
    }
    
    if (!pov) {
      const errorMsg = 'Error: Point of view (POV) is required.\n';
      this.emitOutput(errorMsg);
      throw new Error('Point of view is required');
    }
    
    try {
      // Read brainstorm file
      this.emitOutput(`Reading brainstorm file: ${brainstormFile}\n`);
      const brainstormContent = await this.readInputFile(this.ensureAbsolutePath(brainstormFile, saveDir));
      
      // Read outline file (required)
      this.emitOutput(`Reading outline file: ${outlineFile}\n`);
      const outlineContent = await this.readInputFile(this.ensureAbsolutePath(outlineFile, saveDir));
      
      // Create prompt
      const basePrompt = await this.getPrompt();
      if (!basePrompt) {
        throw new Error('Could not load prompt for world writer tool');
      }
      
      // Replace placeholders in the base prompt
      let prompt = basePrompt.replace(/\[TITLE\]/g, title);
      prompt = prompt.replace(/You are a skilled novelist, worldbuilder, and character developer helping to create a comprehensive world document in fluent, authentic English\./, 
        `You are a skilled novelist, worldbuilder, and character developer helping to create a comprehensive world document in fluent, authentic ${language}.`);
      prompt = prompt.replace(/- Write in \[POV\]/, `- Write in ${pov}`);
      
      // Add content sections
      prompt = `=== OUTLINE ===\n${outlineContent}\n=== END OUTLINE ===\n\n=== CHARACTERS ===\n${brainstormContent}\n=== END CHARACTERS ===\n\n${prompt}`;
      
      // const promptTokens = await this.apiService.countTokens(prompt);
      
      this.emitOutput(`\nGenerating world document for: ${title}\n`);

      this.emitOutput(`\nSending request to AI API: ${this.apiService.config.model_name}  . . .\n`);
      this.emitOutput(`\n`);
      
      this.emitOutput(`****************************************************************************\n`);
      this.emitOutput(`*  This process typically takes several minutes.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  It's recommended to keep this window the sole 'focus'\n`);
      this.emitOutput(`*  and to avoid browsing online or running other apps, as these API\n`);
      this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
      this.emitOutput(`****************************************************************************\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";
      let thinkingContent = "";
      
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
      
      this.emitOutput(`\nWorld document completed in: ${minutes}m ${seconds.toFixed(2)}s.\n`);
      
      const wordCount = this.countWords(fullResponse);
      this.emitOutput(`World document has approximately ${wordCount} words.\n`);
      
      // const responseTokens = await this.apiService.countTokens(fullResponse);
      // this.emitOutput(`World document token count: ${responseTokens}\n`);
      
      // Save the world document to a file
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const worldFilename = `world_${timestamp}.txt`;
      const worldPath = path.join(saveDir, worldFilename);
      
      await this.writeOutputFile(fullResponse, saveDir, worldFilename);
      this.emitOutput(`World document saved to: ${worldPath}\n`);
      
      // Add to output files list
      outputFiles.push(worldPath);
      
      this.emitOutput(`\nFiles saved to: ${saveDir}\n`);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          wordCount,
          // tokenCount: responseTokens,
          elapsedTime: `${minutes}m ${seconds.toFixed(2)}s`
        }
      };
      
    } catch (error) {
      console.error('Error in World Writer:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  // ===========================================
  // SHARED UTILITY METHODS
  // ===========================================
  
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

module.exports = WritingAITool;
