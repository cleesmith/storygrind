// copy-editing.js
const ToolBase = require('./tool-base');

/**
 * Copy Editing Tool
 */
class CopyEditing extends ToolBase {
  constructor(apiService, config = {}) {
    super('copy_editing', config);
    this.apiService = apiService;
  }
}

module.exports = CopyEditing;
