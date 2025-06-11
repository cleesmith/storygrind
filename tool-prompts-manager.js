// tool-prompts-manager.js
// Handles creation, retrieval, and management of prompts for tools

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const appState = require('./state.js');
const { toolPrompts } = require('./tool-prompts');

class PromptManager {
  constructor() {
    this.promptsDir = path.join(appState.PROJECTS_DIR, 'tool-prompts');
  }

  /**
   * Ensures the tool-prompts directory exists
   * @returns {Promise<boolean>} - True if directory exists or was created
   */
  async ensurePromptsDirectory() {
    try {
      await fs.mkdir(this.promptsDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error creating prompts directory:', error);
      return false;
    }
  }

  /**
   * Creates a default prompt file for a tool if it doesn't exist
   * @param {string} toolName - Name of the tool
   * @returns {Promise<boolean>} - True if prompt was created or already exists
   */
  async createDefaultPrompt(toolName) {
    // Check if we have a default prompt for this tool
    if (!toolPrompts[toolName] || toolPrompts[toolName] === '') {
      // console.log(`No default prompt content found for ${toolName}`);
      return false;
    }

    // Make sure the directory exists
    await this.ensurePromptsDirectory();
    
    // Create the prompt file
    const promptPath = path.join(this.promptsDir, `${toolName}.txt`);
    
    try {
      // Check if the file already exists
      await fs.access(promptPath);
      // console.log(`Prompt file already exists for ${toolName} at ${promptPath}`);
      return true;
    } catch (error) {
      // File doesn't exist, create it
      if (error.code === 'ENOENT') {
        try {
          await fs.writeFile(promptPath, toolPrompts[toolName], 'utf8');
          // console.log(`Default prompt created for ${toolName} at ${promptPath}`);
          return true;
        } catch (writeError) {
          console.error(`Error creating default prompt for ${toolName}:`, writeError);
          return false;
        }
      } else {
        console.error(`Unexpected error checking prompt file for ${toolName}:`, error);
        return false;
      }
    }
  }

  /**
   * Gets the prompt for a tool, creating it if it doesn't exist
   * @param {string} toolName - Name of the tool
   * @returns {Promise<string|null>} - Prompt content or null if not available
   */
  async getPrompt(toolName) {
    const promptPath = path.join(this.promptsDir, `${toolName}.txt`);
    
    try {
      // Try to read existing prompt file
      const content = await fs.readFile(promptPath, 'utf8');
      
      // Check if the content is empty (or just whitespace)
      if (!content.trim()) {
        // console.log(`Prompt file for ${toolName} exists but is empty`);
        
        // Check if we have a default to restore
        if (toolPrompts[toolName] && toolPrompts[toolName].trim()) {
          // console.log(`Restoring default prompt for ${toolName}`);
          
          // Write the default prompt directly (no backup)
          await fs.writeFile(promptPath, toolPrompts[toolName], 'utf8');
          return toolPrompts[toolName];
        }
        
        // If we don't have a default, return null to trigger the error message
        return null;
      }
      
      // console.log(`Retrieved existing prompt for ${toolName}`);
      return content;
    } catch (error) {
      // If file doesn't exist, create default prompt
      if (error.code === 'ENOENT') {
        // console.log(`Prompt file not found for ${toolName}, creating default...`);
        const created = await this.createDefaultPrompt(toolName);
        if (created && toolPrompts[toolName] !== '') {
          // Read the newly created file
          try {
            const content = await fs.readFile(promptPath, 'utf8');
            return content;
          } catch (readError) {
            console.error(`Error reading newly created prompt for ${toolName}:`, readError);
            return null;
          }
        }
      } else {
        console.error(`Error reading prompt for ${toolName}:`, error);
      }
      // If we couldn't create or read the file, return null
      return null;
    }
  }

  /**
   * Initializes all available tool prompts
   * @returns {Promise<void>}
   */
  async initializeAllPrompts() {
    // console.log('Initializing all tool prompts...');
    await this.ensurePromptsDirectory();
    
    // Get all tool names from the prompts object
    const toolNames = Object.keys(toolPrompts);
    
    // Create all prompts in parallel
    const results = await Promise.all(
      toolNames.map(async (toolName) => {
        // Only create if we have content
        if (toolPrompts[toolName] !== '') {
          const success = await this.createDefaultPrompt(toolName);
          return { toolName, success };
        }
        return { toolName, success: false };
      })
    );
    
    // Log results
    const succeeded = results.filter(r => r.success).map(r => r.toolName);
    if (succeeded.length > 0) {
      // console.log(`Created default prompts for: ${succeeded.join(', ')}`);
    }
  }
}

// Export a singleton instance
module.exports = new PromptManager();
