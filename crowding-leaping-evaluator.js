// crowding-leaping-evaluator.js
const ToolBase = require('./tool-base');

/**
 * CrowdingLeapingEvaluator Tool
 * Analyzes manuscript for pacing issues based on Ursula K. Le Guin's concepts of
 * "crowding" (intense detail) and "leaping" (jumping over time or events).
 * Identifies dense paragraphs, abrupt transitions, and visualizes pacing patterns.
 */
class CrowdingLeapingEvaluator extends ToolBase {
  constructor(apiService, config = {}) {
    super('crowding_leaping_evaluator', config);
    this.apiService = apiService;
  }
}

module.exports = CrowdingLeapingEvaluator;
