// manuscript-to-characters.js
const ToolBase = require('./tool-base');

/**
 * Manuscript to Characters Tool
 * Analyzes a manuscript file and generates a comprehensive character list
 * Creates: manuscript_to_characters_[timestamp].txt
 */
class ManuscriptToCharacters extends ToolBase {
  constructor(apiService, config = {}) {
    super('manuscript_to_characters', config);
    this.apiService = apiService;
  }
}

module.exports = ManuscriptToCharacters;