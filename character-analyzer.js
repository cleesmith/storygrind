// character-analyzer.js
const ToolBase = require('./tool-base');

/**
 * Character Analyzer Tool
 * Analyzes manuscript, outline, and world files to identify 
 * and compare character appearances across different story documents
 */
class CharacterAnalyzer extends ToolBase {
  constructor(apiService, config = {}) {
    super('character_analyzer', config);
    this.apiService = apiService;
  }
}

module.exports = CharacterAnalyzer;
