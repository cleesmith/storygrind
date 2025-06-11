// world-writer.js
const ToolBase = require('./tool-base');
const path = require('path');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * World Writer Tool
 * Extract and develop brainstorm and world elements from an outline.
 * Requires: title, POV, and brainstorm.txt and outline.txt.
 */
class WorldWriter extends ToolBase {
  constructor(apiService, config = {}) {
    super('world_writer', config);
    this.apiService = apiService;
  }
  
  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    // Clear the cache for this tool
    fileCache.clear(this.name);
    
    // Extract options
    const title = options.title;
    const pov = options.pov;
    const brainstormFile = options.brainstorm_file;
    const outlineFile = options.outline_file;
    const language = options.lang || 'English';
    
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
    const outputFiles = [];
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    // Validate required fields
    if (!title) {
      const errorMsg = 'Error: Title is required.\n';
      this.emitOutput(errorMsg);
      throw new Error('Title is required');
    }
    
    if (!pov) {
      const errorMsg = 'Error: Point of view (POV) is required.\n';
      this.emitOutput(errorMsg);
      throw new Error('Point of view is required');
    }
    
    try {
      // Read brainstorm file
      this.emitOutput(`Reading brainstorm file: ${brainstormFile}\n`);
      const brainstormContent = await this.readInputFile(this.ensureAbsolutePath(brainstormFile, saveDir));
      
      // Read outline file (required)
      this.emitOutput(`Reading outline file: ${outlineFile}\n`);
      const outlineContent = await this.readInputFile(this.ensureAbsolutePath(outlineFile, saveDir));
      
      // Create prompt
      const prompt = this.createPrompt(
        title,
        pov,
        brainstormContent,
        outlineContent,
        language
      );
      
      const promptTokens = await this.apiService.countTokens(prompt);
      
      this.emitOutput(`\nGenerating world document for: ${title}\n`);
      this.emitOutput(`\nSending request to AI API (streaming)...\n`);
      
      this.emitOutput(`****************************************************************************\n`);
      this.emitOutput(`*  This process typically takes several minutes.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  It's recommended to keep this window the sole 'focus'\n`);
      this.emitOutput(`*  and to avoid browsing online or running other apps, as these API\n`);
      this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
      this.emitOutput(`****************************************************************************\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";
      let thinkingContent = "";
      
      try {
        await this.apiService.streamWithThinking(
          prompt,
          (textDelta) => {
            fullResponse += textDelta;
            this.emitOutput(textDelta);
          },
          true // don't use cached file
        );
      } catch (error) {
        this.emitOutput(`\nAPI Error: ${error.message}\n`);
        throw error;
      }
      
      // Calculate time elapsed
      const elapsed = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      this.emitOutput(`\nWorld document completed in: ${minutes}m ${seconds.toFixed(2)}s.\n`);
      
      const wordCount = this.countWords(fullResponse);
      this.emitOutput(`World document has approximately ${wordCount} words.\n`);
      
      const responseTokens = await this.apiService.countTokens(fullResponse);
      this.emitOutput(`World document token count: ${responseTokens}\n`);
      
      // Save the world document to a file
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const worldFilename = `world_${timestamp}.txt`;
      const worldPath = path.join(saveDir, worldFilename);
      
      await this.writeOutputFile(fullResponse, saveDir, worldFilename);
      this.emitOutput(`World document saved to: ${worldPath}\n`);
      
      // Add to output files list
      outputFiles.push(worldPath);
      
      // Add to the file cache
      fileCache.addFile(this.name, worldPath);
      
      this.emitOutput(`\nFiles saved to: ${saveDir}\n`);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          wordCount,
          tokenCount: responseTokens,
          elapsedTime: `${minutes}m ${seconds.toFixed(2)}s`
        }
      };
      
    } catch (error) {
      console.error('Error in World Writer:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Create prompt for world document generation
   * @param {string} title - Novel title
   * @param {string} pov - Point of view
   * @param {string} brainstormContent - brainstorm content
   * @param {string} outlineContent - Outline content
   * @param {string} language - Language
   * @returns {string} - Prompt for AI API
   */
  createPrompt(title, pov, brainstormContent, outlineContent, language) {
    return `
You are a skilled novelist, worldbuilder, and character developer helping to create a comprehensive world document in fluent, authentic ${language}.
This document will include both the world elements and detailed character profiles for a novel based on the outline below.

=== OUTLINE ===
${outlineContent}
=== END OUTLINE ===

Create a detailed world document with the following sections:

----------------------------------------------
WORLD: ${title}
----------------------------------------------

1. SETTING OVERVIEW:
   - Time period and era
   - General geography and environment
   - Notable locations mentioned in the outline

2. SOCIAL STRUCTURE:
   - Government or ruling systems
   - Social classes or hierarchies
   - Cultural norms and values

3. HISTORY:
   - Major historical events that impact the story
   - Historical figures relevant to the plot
   - Timeline of important developments

4. TECHNOLOGY AND MAGIC:
   - Level of technological development
   - Technological systems or devices crucial to the plot
   - If applicable: magic systems, supernatural elements, or fantastic creatures

5. ECONOMY:
   - Economic systems
   - Resources and trade
   - Economic conflicts relevant to the story

6. THEMES AND SYMBOLS:
   - Recurring motifs and symbols
   - Philosophical or moral questions explored
   - Cultural or religious symbolism

7. RULES OF THE WORLD:
   - Laws (both legal and natural/supernatural)
   - Limitations and constraints
   - Unique aspects of how this world functions

8. CHARACTER PROFILES:

For each of the following characters, create a detailed profile but do NOT change the character names:

=== CHARACTERS ===
${brainstormContent}
=== END CHARACTERS ===

Include for each character:

a) CHARACTER NAME: [Full name]
b) ROLE: [Protagonist, Antagonist, Supporting Character, etc.]
c) AGE: [Age or age range]
d) PHYSICAL DESCRIPTION: [Detailed physical appearance]
e) BACKGROUND: [Personal history relevant to the story]
f) PERSONALITY: [Core personality traits, strengths, and flaws]
g) MOTIVATIONS: [What drives this character? What do they want?]
h) CONFLICTS: [Internal struggles and external conflicts]
i) RELATIONSHIPS: [Important relationships with other characters]
j) ARC: [How this character changes throughout the story]
k) NOTABLE QUOTES: [3-5 examples of how this character might speak]
l) SKILLS & ABILITIES: [Special skills, knowledge, or supernatural abilities]
m) HABITS & QUIRKS: [Distinctive behaviors and mannerisms]
n) SECRETS: [What this character is hiding]
o) FEARS & WEAKNESSES: [What makes this character vulnerable]
p) SYMBOLIC ELEMENTS: [Any symbolic elements associated with this character]
q) NARRATIVE FUNCTION: [How this character serves the themes and plot]

IMPORTANT FORMATTING INSTRUCTIONS:
- Write in ${pov}
- Make the existing character profiles deep and psychologically nuanced
- Ensure the existing character motivations are complex and realistic
- Ensure the existing characters have traits and backgrounds that naturally arise from the world of the story
- Ensure the existing characters will create interesting dynamics and conflicts with each other
- Keep all details consistent with the outline and list of characters
- Focus on elements that directly impact the characters and plot
- Provide enough detail to give the world depth while leaving room for creative development
- Ensure the world elements support and enhance the narrative
- Separate each major section with a line of dashes (------)
- Separate each character profile with a line of dashes (------)
- Be consistent in formatting throughout the document
- Use plain text formatting with NO markdown in your outputs
- Do NOT change nor add to character names

IMPORTANT STYLISTIC RESTRICTIONS:
- STRICTLY AVOID using the words "whisper", "whispered", "whispering", or any variation of "whisper"
- STRICTLY AVOID using the words "echo", "echoed", "echoing", or any variation of "echo"
- NEVER use phrases about voices/sounds "echoing off walls" or characters "whispering secrets"
- DO NOT use clichés about "eyes widening" or character reactions involving gasping, sighing, or nodding
- Avoid overused sensory descriptions involving shivers, tingling, or characters holding their breath
- Do not repeatedly mention heartbeats, breathing, or physical reactions to emotions
- EXPAND your vocabulary

`;
  }
  
  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.replace(/(\r\n|\r|\n)/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    
    // Check if the path is already absolute
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Make the path absolute by joining with the base path
    return path.join(basePath, filePath);
  }
}

module.exports = WorldWriter;
