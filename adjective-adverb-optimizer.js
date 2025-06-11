// adjective-adverb-optimizer.js
const ToolBase = require('./tool-base');

/**
 * Adjective Adverb Optimizer Tool
 * Analyzes manuscript for adjective and adverb usage using the Claude API.
 * Identifies unnecessary modifiers, overused qualifiers, and suggests stronger verbs/nouns
 * to replace adjective-heavy descriptions, following Ursula K. Le Guin's writing advice.
 */
class AdjectiveAdverbOptimizer extends ToolBase {
  constructor(apiService, config = {}) {
    super('adjective_adverb_optimizer', config);
    this.apiService = apiService;
  }
}

module.exports = AdjectiveAdverbOptimizer;
