// outline-writer.js
const ToolBase = require('./tool-base');
const path = require('path');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * Outline Writer Tool
 * Generates a plot outline from your brainstorming.
 */
class OutlineWriter extends ToolBase {
  constructor(apiService, config = {}) {
    super('outline_writer', config);
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
    
    const brainstormFile = options.brainstorm_file;
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;

    const outputFiles = [];
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    try {
      let brainstormContent = "";
    
      // Ensure file paths are absolute
      const absoluteBrainstormFile = this.ensureAbsolutePath(brainstormFile, saveDir);

      try {
        brainstormContent = await this.readInputFile(absoluteBrainstormFile);
      } catch (error) {
        this.emitOutput(`Note: Brainstorm file not found or couldn't be read: ${error.message}\n`);
        throw new Error('Brainstorm file is required!');
      }
      
      const prompt = this.createPrompt(brainstormContent);
      
      const promptTokens = await this.apiService.countTokens(prompt);

      this.emitOutput(`\nSending request to AI API . . .\n`);
      this.emitOutput(`\n`);
      
      this.emitOutput(`****************************************************************************\n`);
      this.emitOutput(`*  This usually takes a few minutes...\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  It's recommended to keep this window the sole 'focus'\n`);
      this.emitOutput(`*  and to avoid browsing online or running other apps, as these API\n`);
      this.emitOutput(`*  network connections are often flakey, like delicate echoes of whispers.\n`);
      this.emitOutput(`*  \n`);
      this.emitOutput(`*  So breathe, remove eye glasses, stretch, relax, and be like water 🥋 🧘🏽‍♀️\n`);
      this.emitOutput(`****************************************************************************\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";
      
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
      
      this.emitOutput(`\nCompleted in ${minutes}m ${seconds.toFixed(2)}s.\n`);
      
      const wordCount = this.countWords(fullResponse);
      this.emitOutput(`Outline has approximately ${wordCount} words.\n`);
      
      const responseTokens = await this.apiService.countTokens(fullResponse);
      this.emitOutput(`Outline token count: ${responseTokens}\n`);
      
      // Save the outline to a file
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const outlineFilename = `outline_${timestamp}.txt`;
      const outlinePath = path.join(saveDir, outlineFilename);
      
      await this.writeOutputFile(fullResponse, saveDir, outlineFilename);
      this.emitOutput(`Outline saved to: ${outlinePath}\n`);
      
      // Add to output files list
      outputFiles.push(outlinePath);
      
      // Add to the file cache
      fileCache.addFile(this.name, outlinePath);
      
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
      console.error('Error in Outline Writer:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Create prompt
   * @param {string} brainstormContent - Concept/Characters content
   * @returns {string} - Prompt for AI API
   */
  createPrompt(brainstormContent) {
    return `

=== BRAINSTORM CONTENT ===
${brainstormContent}
=== END BRAINSTORM CONTENT ===

You are a skilled novelist and story architect helping to create a detailed novel outline in fluent, authentic English.
Draw upon your knowledge of worldwide literary traditions, narrative structure, and plot development approaches from across cultures,
while expressing everything in natural, idiomatic English that honors its unique linguistic character.

=== OUTLINE SAMPLE ===

OUTLINE: THE JOURNEY WITHIN

PART I: BEGINNINGS


Chapter 1: First Steps
   - Main character discovers an unexpected talent during a routine activity
   - A minor conflict arises with a family member who doesn't understand
   - Introduction to the primary setting and its unique characteristics
   - Character meets a mentor figure who recognizes their potential
   - Seeds of the main theme are planted through symbolic imagery


Chapter 2: The Call
   - Character faces a decision point that will change their trajectory
   - An inciting incident forces the character out of their comfort zone
   - A supporting character provides necessary information about the challenge ahead
   - The rules and limitations of the world/system are established
   - Character makes a commitment that drives the rest of the story


Chapter 3: Crossing Thresholds
   - Character leaves familiar territory for the first time
   - First encounter with minor antagonistic forces
   - A new ally joins the journey, bringing complementary skills
   - Character experiences initial doubt about their abilities
   - A small victory boosts confidence but reveals bigger challenges ahead


PART II: CHALLENGES


Chapter 4: The First Test
   - Character faces their first significant obstacle
   - A weakness or flaw in the character is exposed
   - The mentor provides crucial guidance or training
   - Character learns a new skill or approach
   - The stakes are raised when the consequences of failure become clear


Chapter 5: Unexpected Allies
   - Character meets someone from an opposing faction
   - Initial distrust evolves into a tentative alliance
   - New information challenges the character's assumptions
   - A secret is revealed about the mentor or the mission
   - Character must reconcile conflicting viewpoints


Chapter 6: The Betrayal
   - A trusted ally acts against the character's interests
   - Character faces a moment of crisis and self-doubt
   - The original plan falls apart, requiring adaptation
   - A personal sacrifice is required to move forward
   - The true nature of the antagonist begins to emerge


PART III: TRANSFORMATION


Chapter 7: Into the Darkness
   - Character reaches their lowest point emotionally or physically
   - All external support systems are removed or compromised
   - Character confronts inner demons or past traumas
   - A revelation provides new context for the entire journey
   - Character makes a difficult choice that defines their values


Chapter 8: The Lesson
   - Character gains deeper understanding of themselves
   - A new approach or philosophy emerges from their struggles
   - Character reconciles with someone they've hurt or misunderstood
   - The mentor's teachings are seen in a new light
   - Character develops a plan to overcome the main obstacle


Chapter 9: Renewed Purpose
   - Character emerges with strengthened resolve
   - New allies are gathered based on shared values
   - Character demonstrates growth by handling a familiar situation differently
   - Preparations are made for the final confrontation
   - A moment of calm before the storm allows for reflection

PART IV: RESOLUTION


Chapter 10: The Approach
    - Character and allies journey to the final confrontation
    - Last-minute complications threaten the plan
    - Character applies lessons learned throughout their journey
    - A final test of faith or commitment occurs
    - The true cost of victory becomes clear


Chapter 11: The Confrontation
    - Character faces the main antagonist or challenge
    - Early efforts fail, forcing the character to dig deeper
    - The character's unique perspective or talent proves crucial
    - A surprising twist changes the nature of the conflict
    - Character achieves victory but not in the way expected


Chapter 12: Return and Renewal
    - Character returns to where they began, changed by experience
    - The impact of their journey on others becomes apparent
    - Unresolved relationships reach new understanding
    - Character establishes a new role that honors their growth
    - Final image repeats but transforms the opening scene


Chapter 13: Epilogue: Seeds of Change
    - Brief glimpse of the world some time after the main events
    - Evidence of lasting impact from the character's actions
    - Hint at new challenges or adventures on the horizon
    - Thematic statement embodied in a final image or moment
    - Conclusion that brings emotional closure while suggesting life continues

=== END OUTLINE SAMPLE ===


Create a detailed novel outline with at least 13 chapters, more if needed, and organized into 3 main acts or parts, see OUTLINE SAMPLE.

Your outline should follow the general format and level of detail shown in the sample, while being completely original.

Consider the following in your thinking:
- Follow the structure of the OUTLINE SAMPLE provided, but make proper adjustments for this novel
- Do NOT create new characters unless incidental ones like: cashiers, passers-by, if any, and these should remain without names
- Create a compelling narrative arc with rising tension, climax, and resolution
- Develop character arcs that show growth and change
- Include key plot points, conflicts, and important scenes
- Balance external plot with internal character development
- Ensure that each chapter has a clear purpose in advancing the story

IMPORTANT FORMATTING INSTRUCTIONS:
1. Start with "OUTLINE:" followed by the novel title on the next line
2. For parts/sections, use plain text like: "PART I: THE BEGINNING"
3. For chapters, use format: "Chapter #: Title" (example: "Chapter 1: First Steps")
4. DO NOT include POV markers like "POV: Character"
5. For each chapter, include 4-6 bullet points describing key events and developments
6. Format each bullet point starting with "- " (dash followed by space) - NEVER USE ASTERISKS (*) FOR BULLET POINTS
7. Each bullet point should describe a single key event, character moment, or plot development
8. Make bullet points substantive but concise, focusing on important elements
9. Include an optional brief epilogue with bullet points if appropriate for the story
10. For each chapter, include additional bullet points (up to 7-8 total) covering:
    - Key plot developments
    - Important character moments or revelations
    - Setting details
    - Thematic elements being developed
11. Keep all bullet points in the same format with "- " at the start of each point
12. DO NOT add separate labeled sections for "Setting:", "Theme:", "Character:", etc. - just use simple bullet points as shown in the sample

CRITICAL FORMATTING REMINDER:
- All bullet points MUST use dash (-) and space, NEVER asterisks (*)
- Follow EXACTLY the same formatting shown in the sample outline
- Do not add any extra formatting or section labels not shown in the sample outline
- Do not use known and overused AI-ism words: echo, echoes, whispers, whisper, etc.      

Note: "=== OUTLINE SAMPLE ===" should only be used:
as a guide to layout and style and not for it's content

VERY IMPORTANT:
All chapters in the outline must be in this format:
newline
newline
Chapter #: Title
... for example:
Chapter 1: In the Beginning

IMPORTANT STYLISTIC RESTRICTIONS:
- STRICTLY AVOID using the words "whisper", "whispered", "whispering", or any variation of "whisper"
- STRICTLY AVOID using the words "echo", "echoed", "echoing", or any variation of "echo"
- NEVER use phrases about voices/sounds "echoing off walls" or characters "whispering secrets"
- DO NOT use clichés about "eyes widening" or character reactions involving gasping, sighing, or nodding
- Avoid overused sensory descriptions involving shivers, tingling, or characters holding their breath
- Do not repeatedly mention heartbeats, breathing, or physical reactions to emotions
- EXPAND your vocabulary

`;    
    return prompt;
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

module.exports = OutlineWriter;
