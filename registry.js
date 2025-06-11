// registry.js

/**
 * Registry for all tool implementations
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    // console.log('ToolRegistry initialized');
  }
  
  /**
   * Register a tool
   * @param {string} toolId - Tool ID
   * @param {object} toolInstance - Tool instance
   */
  registerTool(toolId, toolInstance) {
    // console.log(`Registering tool: ${toolId}`);
    this.tools.set(toolId, toolInstance);
  }
  
  /**
   * Get a tool by ID
   * @param {string} toolId - Tool ID
   * @returns {object|null} - Tool instance or null if not found
   */
  getTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      console.warn(`Tool not found: ${toolId}. Available tools: ${Array.from(this.tools.keys())}`);
    }
    return tool;
  }
  
  /**
   * Get all tool IDs
   * @returns {string[]} - Array of tool IDs
   */
  getAllToolIds() {
    const ids = Array.from(this.tools.keys());
    // console.log('All registered tool IDs:', ids);
    return ids;
  }
}

// Export a singleton instance
module.exports = new ToolRegistry();
