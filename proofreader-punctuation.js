// punctuation-auditor.js
const ToolBase = require('./tool-base');

/**
 * Punctuation Punctuation Tool
 * Analyzes manuscript for punctuation effectiveness using the Claude API.
 * Identifies issues like run-on sentences, missing commas, and odd punctuation patterns
 * that might hinder clarity and flow, following Ursula K. Le Guin's writing principles.
 */
class ProofreaderPunctuation extends ToolBase {
  constructor(apiService, config = {}) {
    super('proofreader_punctuation', config);
    this.apiService = apiService;
  }
}

module.exports = ProofreaderPunctuation;
