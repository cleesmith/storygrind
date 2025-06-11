// tense-consistency-checker.js
const ToolBase = require('./tool-base');

/**
 * Tense Consistency Checker Tool
 * Analyzes a single manuscript file for verb tense consistency issues using the Claude API.
 * Identifies shifts between past/present tense that might confuse readers.
 */
class TenseConsistencyChecker extends ToolBase {
  constructor(apiService, config = {}) {
    super('tense_consistency_checker', config);
    this.apiService = apiService;
  }
}

module.exports = TenseConsistencyChecker;