// manuscript-to-world.js
const ToolBase = require('./tool-base');

/**
 * Manuscript to World Tool
 * Analyzes a manuscript file and generates a comprehensive world description
 * Creates: manuscript_to_world_[timestamp].txt
 */
class ManuscriptToWorld extends ToolBase {
  constructor(apiService, config = {}) {
    super('manuscript_to_world', config);
    this.apiService = apiService;
  }
}

module.exports = ManuscriptToWorld;