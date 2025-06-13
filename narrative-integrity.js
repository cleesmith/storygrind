// narrative-integrity.js
const ToolBase = require('./tool-base');

/**
 * Narrative Integrity Tool
 * Supports different types of consistency/integrity checks: 
 *    internal and unresolved
 */
class NarrativeIntegrity extends ToolBase {
  constructor(apiService, config = {}) {
    super('narrative_integrity', config);
    this.apiService = apiService;
  }

  async execute(options) {
    // Store special instructions in the config so getPrompt can access them
    if (options.special_instructions) {
      this.config.special_instructions = options.special_instructions;
    }
    
    // Call the parent execute method
    return await super.execute(options);
  }

  async getPrompt() {
    try {
      // Get the base prompt from the parent class
      const basePrompt = await super.getPrompt();
      
      if (!basePrompt) {
        return null; // Let the parent class handle the error
      }

      // Check if special instructions were provided in the options
      const specialInstructions = this.config.special_instructions;
      
      if (specialInstructions && specialInstructions.trim()) {
        // Add special instructions to the end of the prompt
        const enhancedPrompt = basePrompt + '\n\n' +
          '=== SPECIAL INSTRUCTIONS ===\n' +
          'In addition to the standard analysis above, pay special attention to the following:\n\n' +
          specialInstructions.trim() + '\n\n' +
          'Incorporate these special focus areas into your analysis where relevant, ensuring they are addressed alongside the standard narrative integrity review.';
        
        this.emitOutput(`\nUsing special instructions:\n${specialInstructions.trim()}\n\n`);
        
        return enhancedPrompt;
      }
      
      // No special instructions, return the base prompt
      return basePrompt;
      
    } catch (error) {
      console.error(`Error getting prompt for ${this.name}:`, error);
      return null;
    }
  }
}

module.exports = NarrativeIntegrity;

// You've identified exactly what makes the Narrative Integrity tool so
// valuable in a comprehensive editing toolkit. Let me expand on why its
// focus on consistency issues specifically makes it worth keeping in
// the lineup:

// Why Consistency Checking Deserves Its Own Tool

// The focus on consistency issues rather than general improvement suggestions gives this tool unique value because:

// 1. Objectivity vs. Subjectivity
//    Most developmental editing is inherently subjective—suggestions about making characters more compelling or plots more engaging involve personal judgment. Consistency issues, however, are largely objective problems with clear right/wrong answers (either something contradicts established facts or it doesn't).

// 2. The Cognitive Blind Spot Problem
//    Writers and even human editors are notoriously bad at catching their own consistency errors. Our brains tend to "fill in" what we expect to see rather than what's actually on the page. This is why we miss when a character's car changes from blue to red between chapters.

// 3. Scale and Complexity Challenge
//    In longer works (novels, series), the sheer volume of details to track becomes overwhelming. No human editor can realistically hold hundreds of character traits, world rules, and previously established facts in working memory while reading.

// 4. Different Mental Process
//    Looking for inconsistencies requires a different mental approach than improving story elements. It's systematic cross-referencing rather than creative enhancement. Having a dedicated tool for this prevents this critical task from getting lost in broader revision processes.

// 5. Foundational to Other Editing
//    Consistency issues undermine reader trust and engagement. If these fundamental problems aren't addressed first, more advanced stylistic improvements may be built on shaky ground.

// The tool fills a crucial gap between developmental editing
// (which focuses on making the story better) and copy editing
// (which focuses on correctness and style). Without it, consistency
// checking often falls between the cracks or is handled incompletely
// during these other phases.

// What makes this particularly valuable is that consistency errors are
// both the most damaging to reader experience and among the hardest for
// writers to self-identify without technological assistance.
