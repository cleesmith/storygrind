// generic-ai-tool.js
const ToolBase = require('./tool-base');

/**
 * Generic AI Tool
 * A dynamic tool class that can work with any prompt file.
 * Used for user-created tools that are discovered at runtime.
 */
class GenericAITool extends ToolBase {
  constructor(apiService, config = {}) {
    // toolId is passed in config
    super(config.toolId, config);
    this.apiService = apiService;
    
    // Store additional metadata for dynamic tools
    this.category = config.category || 'Custom Tools';
    this.promptPath = config.promptPath; // Full path to the prompt file
  }

  /**
   * Override getPrompt to read directly from the user's prompt file
   * This bypasses the normal prompt manager for dynamic tools
   */
  async getPrompt() {
    if (!this.promptPath) {
      this.emitOutput(`Error: No prompt path specified for tool ${this.name}\n`);
      return null;
    }

    try {
      const fs = require('fs/promises');
      const content = await fs.readFile(this.promptPath, 'utf8');
      
      if (!content.trim()) {
        // Check if we have a default prompt for this tool
        const { toolPrompts } = require('./tool-prompts');
        if (toolPrompts[this.name] && toolPrompts[this.name].trim()) {
          // Restore the default prompt
          const fs = require('fs/promises');
          await fs.writeFile(this.promptPath, toolPrompts[this.name], 'utf8');
          this.emitOutput(`Restored default prompt for ${this.name}\n`);
          this.emitOutput(`Using default prompt for: ${this.name}\n`);
          this.emitOutput(`${toolPrompts[this.name]}\n`);
          return toolPrompts[this.name];
        }
        
        this.emitOutput(`Error: Prompt file is empty: ${this.promptPath}\n`);
        return null;
      }
      
      this.emitOutput(`Using custom prompt from: ${this.promptPath}\n`);
      this.emitOutput(`${content}\n`);
      return content;
      
    } catch (error) {
      this.emitOutput(`Error reading prompt file ${this.promptPath}: ${error.message}\n`);
      return null;
    }
  }
}

module.exports = GenericAITool;
