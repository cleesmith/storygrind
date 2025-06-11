// drunken.js
const ToolBase = require('./tool-base');

/**
 * Drunken AI Tool
 * Reads a manuscript file and gives a brutally honest critique while pretending to be drunk.
 */
class Drunken extends ToolBase {
  constructor(apiService, config = {}) {
    super('drunken', config);
    this.apiService = apiService;
  }
}

module.exports = Drunken;
