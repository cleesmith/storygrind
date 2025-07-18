// tool-prompts-manager.js
// Handles creation, retrieval, and management of prompts for tools

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const appState = require('./state.js');
const { toolPrompts } = require('./tool-prompts');

class PromptManager {
  constructor() {
    this.promptsDir = path.join(appState.PROJECTS_DIR, 'tool-prompts');
    
    // Define the main subfolders
    this.coreToolsDir = path.join(this.promptsDir, 'Core Editing Tools');
    this.otherToolsDir = path.join(this.promptsDir, 'Other Editing Tools');
    this.userToolsDir = path.join(this.promptsDir, 'User Tools');
    this.aiWritingToolsDir = path.join(this.promptsDir, 'AI Writing Tools');
    
    // Category mapping for tools in proper editing workflow order
    this.coreEditingTools = [
      'developmental_editing',
      'line_editing', 
      'copy_editing',
      'proofreader_spelling',
      'proofreader_punctuation',
      'proofreader_plot_consistency',
      'narrative_integrity'
    ];
    
    // User Tools (demo tools)
    this.userTools = [
      'anything_goes',
      'nonfiction_SelfHelp_editing',
      'nonfiction_creative_editing', 
      'nonfiction_integrity_editing',
      'nonfiction_sourcing_audit'
    ];
    
    // AI Writing Tools
    this.aiWritingTools = [
      'brainstorm',
      'outline_writer',
      'world_writer',
      'chapter_writer'
    ];
    
    // Tools that should NOT have prompt files created (they have JS implementations)
    this.builtInToolsToSkip = [
      'tokens_words_counter',
      'proofreader_spelling', 
      'docx_comments',
      'epub_converter'
    ];
  }

  /**
   * Ensures the tool-prompts directory and subfolders exist
   * @returns {Promise<boolean>} - True if directories exist or were created
   */
  async ensurePromptsDirectory() {
    try {
      // Create the main prompts directory and all three subfolders
      await fs.mkdir(this.promptsDir, { recursive: true });
      await fs.mkdir(this.coreToolsDir, { recursive: true });
      await fs.mkdir(this.otherToolsDir, { recursive: true });
      await fs.mkdir(this.userToolsDir, { recursive: true });
      await fs.mkdir(this.aiWritingToolsDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error creating prompts directories:', error);
      return false;
    }
  }

  /**
   * Determines which category/folder a tool belongs to
   * @param {string} toolName - Name of the tool
   * @returns {string} - Path to the appropriate subfolder
   */
  getToolCategoryPath(toolName) {
    if (this.coreEditingTools.includes(toolName)) {
      return this.coreToolsDir;
    } else if (this.userTools.includes(toolName)) {
      return this.userToolsDir;
    } else if (this.aiWritingTools.includes(toolName)) {
      return this.aiWritingToolsDir;
    } else {
      return this.otherToolsDir;
    }
  }

  /**
   * Check if this tool exists in User Tools directory
   * @param {string} toolName - Name of the tool
   * @returns {Promise<boolean>} - True if tool exists in User Tools
   */
  async isUserTool(toolName) {
    const userToolPath = path.join(this.userToolsDir, `${toolName}.txt`);
    try {
      await fs.access(userToolPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a default prompt file for a tool if it doesn't exist
   * @param {string} toolName - Name of the tool
   * @returns {Promise<boolean>} - True if prompt was created or already exists
   */
  async createDefaultPrompt(toolName) {
    // Skip tools that have JS implementations (built-in tools)
    if (this.builtInToolsToSkip.includes(toolName)) {
      return false;
    }
    
    // Check if we have a default prompt for this tool
    if (!toolPrompts[toolName] || toolPrompts[toolName] === '') {
      return false;
    }

    // Make sure the directories exist
    await this.ensurePromptsDirectory();
    
    // Determine the correct subfolder and create the prompt file there
    const categoryPath = this.getToolCategoryPath(toolName);
    const promptPath = path.join(categoryPath, `${toolName}.txt`);
    
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
   * Gets the categorized prompt path for tools
   * @param {string} toolName - Name of the tool
   * @returns {string|null} - Categorized path if tool supports it, null otherwise
   */
  getCategorizedPromptPath(toolName) {
    const categoryPath = this.getToolCategoryPath(toolName);
    return path.join(categoryPath, `${toolName}.txt`);
  }

  /**
   * Gets the prompt for a tool, creating it if it doesn't exist
   * @param {string} toolName - Name of the tool
   * @returns {Promise<string|null>} - Prompt content or null if not available
   */
  async getPrompt(toolName) {
    // First check if this is a User Tool
    if (await this.isUserTool(toolName)) {
      const userToolPath = path.join(this.userToolsDir, `${toolName}.txt`);
      try {
        const content = await fs.readFile(userToolPath, 'utf8');
        if (content.trim()) {
          return content;
        }
      } catch (error) {
        console.error(`Error reading user tool prompt for ${toolName}:`, error);
      }
      return null;
    }
    
    // Check if this tool has a categorized path (pilot implementation)
    const categorizedPath = this.getCategorizedPromptPath(toolName);
    
    let promptPath;
    if (categorizedPath) {
      // Use categorized path for supported tools
      promptPath = categorizedPath;
    } else {
      // Use traditional flat path for other tools
      promptPath = path.join(this.promptsDir, `${toolName}.txt`);
    }
    
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
      // If file doesn't exist, handle based on whether it's categorized or not
      if (error.code === 'ENOENT') {
        if (categorizedPath) {
          // For categorized tools, fall back to built-in prompt directly
          // This is the pilot behavior - user file takes precedence, built-in as fallback
          if (toolPrompts[toolName] && toolPrompts[toolName].trim()) {
            // console.log(`Categorized prompt file not found for ${toolName}, using built-in prompt`);
            return toolPrompts[toolName];
          }
        } else {
          // For traditional tools, try to create default prompt
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
        }
      } else {
        console.error(`Error reading prompt for ${toolName}:`, error);
      }
      // If we couldn't create or read the file, return null
      return null;
    }
  }

  /**
   * Gets the file path for a tool's prompt file (synchronous)
   * @param {string} toolName - Name of the tool  
   * @returns {string} - File path to the prompt file
   */
  getPromptFilePath(toolName) {
    // First check if this could be a User Tool (synchronous check)
    const userToolPath = path.join(this.userToolsDir, `${toolName}.txt`);
    try {
      if (fsSync.existsSync(userToolPath)) {
        return userToolPath;
      }
    } catch (error) {
      // If we can't check, continue with normal logic
    }
    
    // Check if this tool has a categorized path (pilot implementation)
    const categorizedPath = this.getCategorizedPromptPath(toolName);
    
    if (categorizedPath) {
      // Use categorized path for supported tools
      return categorizedPath;
    } else {
      // Determine the correct subfolder and create the path
      const categoryPath = this.getToolCategoryPath(toolName);
      return path.join(categoryPath, `${toolName}.txt`);
    }
  }

  /**
   * Initializes all available tool prompts
   * @returns {Promise<void>}
   */
  async initializeAllPrompts() {
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

module.exports = new PromptManager();
