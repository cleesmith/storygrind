// tool-base.js
const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const appState = require('./state.js');
const promptManager = require('./tool-prompts-manager');

/**
 * Enhanced Base class for all tools
 * Provides common functionality for AI-based tools
 * Provides common functionality for AI-powered editing tools.
 */
class ToolBase {

  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {object} config - Tool configuration
   */
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    
    // Create title from name (capitalize words and replace underscores with spaces)
    this.title = this.name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async getPrompt() {
    try {
      //            ************************************************************
      // IMPORTANT: all prompts are in: ~/storygrind_projects/tool-prompts
      //            ************************************************************
      //            so double check they agree with: tool-prompts.js !!

      // Try to get prompt from the manager (it will create the prompt if needed)
      const prompt = await promptManager.getPrompt(this.name);
      
      if (prompt) {
        this.emitOutput(`Using this prompt for ${this.name}:\n`);
        this.emitOutput(`${prompt}\n`);
        return prompt;
      } else {
        // If we still couldn't get a prompt, show the error message
        const promptsDir = path.join(appState.PROJECTS_DIR, 'tool-prompts');
        const promptFilename = `${this.name}.txt`;
        const customPromptPath = path.join(promptsDir, promptFilename);
        
        let errorMessage = `\n`;
        errorMessage += `⛔️ PROMPT FILE NOT FOUND ⛔️\n\n`;
        errorMessage += `A custom prompt file is required to run this tool.\n\n`;
        errorMessage += `You need to create or edit the prompt file at:\n`;
        errorMessage += `${customPromptPath}\n\n`;
        errorMessage += `Here's how to fix this:\n`;
        errorMessage += `1. The application uses a folder called 'tool-prompts' in your writing directory.\n`;
        errorMessage += `2. Each tool needs its own text file with the AI instructions.\n`;
        errorMessage += `3. For the '${this.title}' tool, create: "${promptFilename}"\n\n`;
        errorMessage += `You can use the built-in editor to create this file.\n`;
        
        // Emit error to UI
        this.emitOutput(errorMessage);
        return null;
      }
    } catch (error) {
      console.error(`Error getting prompt for ${this.name}:`, error);
      return null;
    }
  }
  
  /**
   * Execute the tool - enhanced with common AI tool workflow
   * @param {object} options - Tool options
   * @returns {Promise<object>} - Tool execution result
   */
  async execute(options) {
    // console.log(`Executing ${this.title} with options:`, options);
    
    // Make sure we have an API service (required for AI tools)
    if (!this.apiService) {
      const errorMsg = `Error: ${this.title} requires an API service but none was provided.\n`;
      this.emitOutput(errorMsg);
      throw new Error('No API service available');
    }
    
    let manuscriptFile = options.manuscript_file;
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }

    manuscriptFile = this.ensureAbsolutePath(manuscriptFile, saveDir);

    const outputFiles = [];
    
    try {
      const manuscriptContent = await this.readInputFile(manuscriptFile);
      const manuscriptWordCount = this.countWords(manuscriptContent);
      const manuscriptTokens = await this.apiService.countTokens(manuscriptContent);

      // Load manuscript content into the API service
      if (this.apiService.manuscriptContent !== undefined) {
        // Gemini client uses manuscriptContent property
        this.apiService.manuscriptContent = manuscriptContent;
      } else {
        // OpenAI and OpenRouter clients use prompt property
        this.apiService.prompt = manuscriptContent;
      }
      
      // Get the tool-specific prompt - subclasses must implement this
      const prompt = await this.getPrompt();
      
      // Check if prompt was found
      if (prompt === null) {
        // Create helpful error message with dynamic paths
        const promptsDir = path.join(appState.PROJECTS_DIR, 'tool-prompts');
        const promptFilename = `${this.name}.txt`;
        const customPromptPath = path.join(promptsDir, promptFilename);
        
        let errorMessage = `\n`;
        errorMessage += `⛔️ PROMPT FILE NOT FOUND ⛔️\n\n`;
        errorMessage += `A custom prompt file is required to run this tool.\n\n`;
        errorMessage += `You need to create or edit the prompt file at:\n`;
        errorMessage += `${customPromptPath}\n\n`;
        errorMessage += `Here's how to fix this:\n`;
        errorMessage += `1. The application uses a folder called 'tool-prompts' in your writing directory.\n`;
        errorMessage += `2. Each tool needs its own text file with the AI instructions.\n`;
        errorMessage += `3. For the '${this.title}' tool, create: "${promptFilename}"\n\n`;
        errorMessage += `You can use the built-in editor to create this file.\n`;
        
        // Emit error to UI
        this.emitOutput(errorMessage);
        
        // Return with success=false but don't throw an error
        return {
          success: false,
          errorType: 'missing_prompt',
          outputFiles: []
        };
      }
      
      const promptTokens = await this.apiService.countTokens(prompt);
      
      this.emitOutput(`\nSending request to AI API . . .\n`);
      this.emitOutput(`\n`);
      this.emitOutput(`\n****************************************************************************\n`);
      this.emitOutput(`*  Standby, running ${this.title} . . .\n`);
      this.emitOutput(`*\n`);
      this.emitOutput(`*  This process typically takes several minutes.\n`);
      this.emitOutput(`*\n`);
      this.emitOutput(`*  It's recommended to keep this window the sole 'focus'                   \n`);
      this.emitOutput(`*  and to avoid browsing online or running other apps, as these API        \n`);
      this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers. \n`);
      this.emitOutput(`*\n`);
      this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
      this.emitOutput(`*\n`);
      this.emitOutput(`****************************************************************************\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";

      try {
        await this.apiService.streamWithThinking(
          prompt,
          (textDelta) => {
            fullResponse += textDelta;
            this.emitOutput(textDelta);
          }
        );
      } catch (error) {
        this.emitOutput(`\nAPI Error: ${error.message}\n`);
        throw error;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      this.emitOutput(`\nCompleted in: ⏰ ${minutes}m ${seconds.toFixed(2)}s.\n`);
      
      const wordCount = this.countWords(fullResponse);
      this.emitOutput(`Report has approximately ${wordCount} words.\n`);
      
      const responseTokens = await this.apiService.countTokens(fullResponse);
      this.emitOutput(`Response token count: ${responseTokens}\n`);

      const savedFiles = await this.saveReport(
        fullResponse,
        promptTokens,
        responseTokens,
        saveDir
      );
      
      // Add the output files to the result
      outputFiles.push(...savedFiles);
      
      // Files created successfully
      
      return {
        success: true,
        outputFiles
      };
    } catch (error) {
      console.error(`Error in ${this.title}: ${error.message}`);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Read a file
   * @param {string} filePath - Path to file
   * @param {string} encoding - File encoding
   * @returns {Promise<string>} - File content
   */
  async readInputFile(filePath, encoding = 'utf-8') {
    try {
      // Handle relative paths by resolving against the current project path
      let resolvedPath = filePath;
      
      // If path is not absolute and doesn't start with ~/ (which will be expanded by Node)
      if (!path.isAbsolute(filePath) && !filePath.startsWith('~/')) {
        // Get current project path from appState
        const projectPath = this.config.save_dir || appState.CURRENT_PROJECT_PATH;
        
        if (projectPath) {
          resolvedPath = path.join(projectPath, filePath);
          console.log(`Resolved relative path "${filePath}" to: "${resolvedPath}"`);
        }
      }
      
      // Read file with resolved path
      const content = await fs.readFile(resolvedPath, encoding);
      if (!content.trim()) {
        throw new Error(`File is empty: ${resolvedPath}`);
      }
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }  

  /**
   * Write content to a file
   * @param {string} content - Content to write
   * @param {string} saveDir - Directory to save to
   * @param {string} fileName - File name
   * @returns {Promise<string>} - Path to the saved file
   */
  async writeOutputFile(content, saveDir, fileName) {
    try {
      // Ensure the directory exists
      await fs.mkdir(saveDir, { recursive: true });
      
      // Path to the output file
      const outputPath = path.join(saveDir, fileName);
      
      // Write the file
      await fs.writeFile(outputPath, content, 'utf-8');
      
      // Return the absolute path to the file
      return path.resolve(outputPath);
    } catch (error) {
      console.error(`Error writing file ${fileName}:`, error);
      throw error;
    }
  }
  
  /**
   * Emit output to be displayed in the UI
   * This will be overridden by the tool runner
   * @param {string} text - Text to emit
   */
  emitOutput(text) {
    // console.log(text);
  }
  
  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
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
  
  /**
   * Save report to file
   * @param {string} content - Response content
   * @param {number} promptTokens - Prompt token count
   * @param {number} responseTokens - Response token count
   * @param {string} saveDir - Directory to save to
   * @returns {Promise<string[]>} - Array of paths to saved files
   */
  async saveReport(
    content,
    promptTokens,
    responseTokens,
    saveDir
  ) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const dateTimeStr = formatter.format(new Date());
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFilename = `${this.name.toLowerCase()}_${timestamp}`;
      
      // Array to collect all saved file paths
      const savedFilePaths = [];

      const reportWithStats = `=== ${this.title.toUpperCase()} REPORT ===
Date: ${dateTimeStr}
Prompt tokens: ${promptTokens}
Response tokens: ${responseTokens}

${content}\n`;
      
      // Save full response
      const reportFilename = `${baseFilename}.txt`;
      const reportPath = path.join(saveDir, reportFilename);
      await this.writeOutputFile(reportWithStats, saveDir, reportFilename);
      savedFilePaths.push(reportPath);
      this.emitOutput(`Report saved to: ${reportPath}\n`);
      return savedFilePaths;
    } catch (error) {
      console.error(`Error saving report:`, error);
      this.emitOutput(`Error saving report: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Remove Markdown formatting from text
   * @param {string} text - Text with Markdown formatting
   * @returns {string} - Plain text without Markdown
   */
  removeMarkdown(text) {
    const options = {
      listUnicodeChar: false,
      stripListLeaders: true,
      gfm: true,
      useImgAltText: true,
      preserveBlockSpacing: true
    };
    
    let output = text || '';
    // Remove horizontal rules
    output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, '');
    try {
      // Handle list markers
      if (options.stripListLeaders) {
        if (options.listUnicodeChar) {
          output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
        } else {
          output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
        }
      }
      // Handle GitHub Flavored Markdown features
      if (options.gfm) {
        output = output
          .replace(/\n={2,}/g, '\n')
          .replace(/~{3}.*\n/g, '')
          // Improved code block handling
          .replace(/(`{3,})([\s\S]*?)\1/gm, function(match, p1, p2) {
            return p2.trim() + '%%CODEBLOCK_END%%\n';
          })
          .replace(/~~/g, '');
      }
      // Process main markdown elements
      output = output
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove setext headers
        .replace(/^[=\-]{2,}\s*$/g, '')
        // Remove footnotes
        .replace(/\[\^.+?\](\: .*?$)?/g, '')
        .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
        // Handle images and links
        .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
        .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
        // Better blockquote handling with spacing
        .replace(/^\s*>+\s?/gm, function(match) {
          return options.preserveBlockSpacing ? '\n' : '';
        })
        // Remove list markers again (thorough cleanup)
        .replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1')
        // Remove reference links
        .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
        // Remove headers
        .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, '$1$2$3')
        // Remove emphasis
        .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
        .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
        // Remove code markers
        .replace(/`(.+?)`/g, '$1');
      // Final cleanup and spacing
      output = output
        // Replace code block markers with proper spacing
        .replace(/%%CODEBLOCK_END%%\n/g, '\n\n\n')
        // Normalize multiple newlines while preserving block spacing
        .replace(/\n{4,}/g, '\n\n\n')
        .replace(/\n{3}/g, '\n\n')
        // Clean up any trailing whitespace
        .trim();
    } catch(e) {
      console.error('Error removing Markdown:', e);
      return text;
    }
    return output;
  }

}

module.exports = ToolBase;
