// chapter-writer.js
const ToolBase = require('./tool-base');
const path = require('path');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const fs = require('fs/promises');

/**
 * Chapter Writer Tool
 * Uses the outline, world document, and 
 * existing manuscript to write the first missing chapter
 */
class ChapterWriter extends ToolBase {
  constructor(apiService, config = {}) {
    super('chapter_writer', config);
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
    const manuscriptFile = options.manuscript; // a filepath
    const outlineFile = options.outline; // a filepath
    const worldFile = options.world; // a filepath
    const language = options.lang || 'English';
    
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;

    const outputFiles = [];
    const summary = [];
    
    // Validate save directory
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }
    
    try {
      // Read manuscript file or create it if it doesn't exist
      let manuscriptContent = "";
      try {
        this.emitOutput(`Reading manuscript file: ${manuscriptFile}\n`);
        manuscriptContent = await this.readInputFile(this.ensureAbsolutePath(manuscriptFile, saveDir));
      } catch (error) {
        this.emitOutput(`Error: Required manuscript file not found: ${manuscriptFile}\n`);
        this.emitOutput("Creating a new manuscript file.\n");
        
        // Create an empty manuscript file
        await fs.writeFile(this.ensureAbsolutePath(manuscriptFile, saveDir), "");
      }
      
      // Read outline file (required)
      let outlineContent = "";
      try {
        this.emitOutput(`Reading outline file: ${outlineFile}\n`);
        outlineContent = await this.readInputFile(this.ensureAbsolutePath(outlineFile, saveDir));
      } catch (error) {
        this.emitOutput(`Error: Required outline file not found: ${outlineFile}\n`);
        this.emitOutput("The outline file is required to continue.\n");
        throw error;
      }
      
      // Find the first missing chapter by analyzing the manuscript and outline
      const missingChapterHeading = await this.findFirstMissingChapter(manuscriptContent, outlineContent);
      
      if (!missingChapterHeading) {
        this.emitOutput(`No missing chapters found. All chapters from outline appear to be in the manuscript.\n`);
        this.emitOutput(`If you want to write a new chapter, add it to your outline first.\n`);
        throw new Error('No missing chapters found');
      }
      
      this.emitOutput(`Found first missing chapter to write: ${missingChapterHeading}\n`);
      
      // Process the missing chapter
      const result = await this.processChapter(
        missingChapterHeading,
        manuscriptFile,
        outlineFile,
        worldFile,
        language,
        saveDir
      );
      
      if (result) {
        outputFiles.push(result.chapterFile);
        summary.push(result);
      }
      
      // Add all files to the cache
      for (const file of outputFiles) {
        fileCache.addFile(this.name, file);
      }
      
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: summary.length,
          totalWords: summary.reduce((sum, result) => sum + result.wordCount, 0),
          elapsedTime: summary.reduce((sum, result) => sum + result.elapsedTime, 0)
        }
      };
      
    } catch (error) {
      console.error('Error in ChapterWriter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Find the first missing chapter by analyzing manuscript and outline
   * @param {string} manuscriptContent - Content of the manuscript file
   * @param {string} outlineContent - Content of the outline file
   * @returns {Promise<string>} - First missing chapter to write (format: "Chapter X: Title")
   */
  async findFirstMissingChapter(manuscriptContent, outlineContent) {
    // Extract chapters from the manuscript and put numbers in a Set for quick lookup
    const manuscriptChapterNumbers = new Set();
    const chapterRegex = /Chapter\s+(\d+):\s+(.*?)(?=\n\n|\n*$)/gs;
    let match;
    
    while ((match = chapterRegex.exec(manuscriptContent)) !== null) {
      manuscriptChapterNumbers.add(parseInt(match[1], 10));
    }
    
    this.emitOutput(`Found ${manuscriptChapterNumbers.size} chapters in manuscript.\n`);
    
    // Find all chapters in the outline with a more specific regex
    const outlineChapters = [];
    // This improved regex looks specifically for lines that start with "Chapter" at beginning of line
    const outlineChapterRegex = /^Chapter\s+(\d+):\s+(.+)$/gm;
    let outlineMatch;
    
    while ((outlineMatch = outlineChapterRegex.exec(outlineContent)) !== null) {
      // Debug output for each chapter found
      this.emitOutput(`Found in outline: Chapter ${outlineMatch[1]}: ${outlineMatch[2]}\n`);
      
      outlineChapters.push({
        number: parseInt(outlineMatch[1], 10),
        title: outlineMatch[2],
        full: `Chapter ${outlineMatch[1]}: ${outlineMatch[2]}`
      });
    }
    
    // Sort outline chapters by chapter number
    outlineChapters.sort((a, b) => a.number - b.number);
    
    this.emitOutput(`Found ${outlineChapters.length} chapters in outline.\n`);
    
    // Find the first chapter in the outline that's not in the manuscript
    for (const chapter of outlineChapters) {
      if (!manuscriptChapterNumbers.has(chapter.number)) {
        this.emitOutput(`\nChapter ${chapter.number} is in the outline but not in the manuscript.\n`);
        return chapter.full;
      }
    }
    
    // No missing chapters found
    return null;
  }
  
  /**
   * Process a single chapter
   * @param {string} chapterHeading - Chapter heading to process
   * @param {string} manuscriptFile - Path to manuscript file
   * @param {string} outlineFile - Path to outline file
   * @param {string} worldFile - Path to world file
   * @param {string} language - Language to write in
   * @param {string} saveDir - Directory to save output files
   * @returns {Promise<Object>} - Result of chapter processing
   */
  async processChapter(
    chapterHeading,
    manuscriptFile,
    outlineFile,
    worldFile,
    language,
    saveDir
  ) {
    try {
      // Extract chapter number and formatted chapter number
      const { chapterNum, formattedChapter } = this.extractChapterNum(chapterHeading);
      
      // Log processing info
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      }).toLowerCase().replace(/^0/, '');
      
      this.emitOutput(`\n${currentTime} - Processing: Chapter ${chapterNum}\n`);
      
      // Read files
      // Read outline file (required)
      let outlineContent = "";
      try {
        this.emitOutput(`Reading outline file: ${outlineFile}\n`);
        outlineContent = await this.readInputFile(this.ensureAbsolutePath(outlineFile, saveDir));
      } catch (error) {
        this.emitOutput(`Error: Required outline file not found: ${outlineFile}\n`);
        this.emitOutput("The outline file is required to continue.\n");
        throw error;
      }
      
      // Read manuscript file or create it if it doesn't exist
      let novelContent = "";
      try {
        this.emitOutput(`Reading manuscript file: ${manuscriptFile}\n`);
        novelContent = await this.readInputFile(this.ensureAbsolutePath(manuscriptFile, saveDir));
      } catch (error) {
        this.emitOutput(`Error: Required manuscript file not found: ${manuscriptFile}\n`);
        this.emitOutput("Creating a new manuscript file.\n");
        
        // Create an empty manuscript file
        await fs.writeFile(this.ensureAbsolutePath(manuscriptFile, saveDir), "");
      }
      
      // Read world file
      let worldContent = "";
      try {
        this.emitOutput(`Reading world file: ${worldFile}\n`);
        worldContent = await this.readInputFile(this.ensureAbsolutePath(worldFile, saveDir));
      } catch (error) {
        this.emitOutput(`Note: World file not found: ${worldFile}\n`);
        this.emitOutput("Continuing without world information.\n");
        // Don't throw an error - continue with empty worldContent
      }
      
      // Format chapter heading for consistency in prompt
      const formattedHeading = this.formatChapterHeading(chapterHeading);
      const formattedOutlineHeading = this.formatOutlineHeading(chapterHeading);
      
      // Create prompt
      const prompt = this.createChapterPrompt(
        formattedHeading,
        formattedOutlineHeading,
        outlineContent,
        worldContent,
        novelContent,
        language
      );
      
      const promptTokens = await this.apiService.countTokens(prompt);
      
      // Call AI API with streaming
      this.emitOutput(`\nSending request to AI API (streaming)...\n\n`);
      
      const startTime = Date.now();
      let fullResponse = "";

      try {
        await this.apiService.streamWithThinking(
          prompt,
          (textDelta) => {
            fullResponse += textDelta;
            this.emitOutput(textDelta);
          },
          true, // don't use cached file
          false, // don't show metadata
          { includeThinking: false } // don't include thinking in the response
        );
      } catch (error) {
        this.emitOutput(`\n*** Error during generation:\n${error.message}\n`);
        throw error;
      }
      
      // Calculate elapsed time
      const elapsed = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const chapterFilename = `${formattedChapter}_chapter_${timestamp}.txt`;
      const chapterPath = path.join(saveDir, chapterFilename);
      
      // Write chapter to file
      await this.writeOutputFile(fullResponse, saveDir, chapterFilename);
      
      const chapterWordCount = this.countWords(fullResponse);
      
      const chapterTokenCount = await this.apiService.countTokens(fullResponse);
      
      // Append the new chapter to the manuscript file
      const appendSuccess = await this.appendToManuscript(
        fullResponse, 
        this.ensureAbsolutePath(manuscriptFile, saveDir)
      );
        
      if (appendSuccess) {
        this.emitOutput(`Chapter ${chapterNum} appended to manuscript file: ${manuscriptFile}\n`);
      } else {
        this.emitOutput(`Warning: Failed to append chapter to manuscript file\n`);
      }
      
      this.emitOutput(`\nCompleted Chapter ${chapterNum}: ${chapterWordCount} words (${minutes}m ${seconds.toFixed(2)}s) - saved to: ${path.basename(chapterPath)} and\nappended to manuscript.\n`);
      
      return {
        chapterNum,
        wordCount: chapterWordCount, 
        tokenCount: chapterTokenCount,
        elapsedTime: elapsed,
        chapterFile: chapterPath
      };
      
    } catch (error) {
      console.error('Error processing chapter:', error);
      this.emitOutput(`\nError processing chapter: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Extract chapter number from heading with improved error handling
   * @param {string} chapterHeading - Chapter heading text
   * @returns {Object} - Chapter number and formatted chapter number
   */
  extractChapterNum(chapterHeading) {
    if (!chapterHeading) {
      this.emitOutput("\nERROR: Chapter heading is empty or undefined\n");
      throw new Error('Empty chapter heading');
    }
    
    // Check for the different formats with more robust patterns
    const fullPattern = /^Chapter\s+(\d+):\s+(.+)$/i;
    const colonPattern = /^(\d+):\s+(.+)$/;
    const periodPattern = /^(\d+)\.\s+(.+)$/;
    
    let chapterNum;
    let title;
    
    let fullMatch = chapterHeading.match(fullPattern);
    let colonMatch = chapterHeading.match(colonPattern);
    let periodMatch = chapterHeading.match(periodPattern);
    
    if (fullMatch) {
      chapterNum = fullMatch[1];
      title = fullMatch[2].trim();
      this.emitOutput(`Matched full pattern: Chapter ${chapterNum}: ${title}\n`);
    } else if (colonMatch) {
      chapterNum = colonMatch[1];
      title = colonMatch[2].trim();
      this.emitOutput(`Matched colon pattern: ${chapterNum}: ${title}\n`);
    } else if (periodMatch) {
      chapterNum = periodMatch[1];
      title = periodMatch[2].trim();
      this.emitOutput(`Matched period pattern: ${chapterNum}. ${title}\n`);
    } else {
      // Try a more lenient pattern as a fallback
      const anyNumberPattern = /Chapter\s+(\d+)[^a-zA-Z0-9]*(.+)/i;
      const anyNumberMatch = chapterHeading.match(anyNumberPattern);
      
      if (anyNumberMatch) {
        chapterNum = anyNumberMatch[1];
        title = anyNumberMatch[2].trim();
        this.emitOutput(`Matched fallback pattern: Chapter ${chapterNum} with title: ${title}\n`);
      } else {
        this.emitOutput("\nERROR: Chapter format must be like:\n");
        this.emitOutput(`\t"Chapter X: Title"\n`);
        this.emitOutput(`\t"X: Title"\n`);
        this.emitOutput(`\t"X. Title"\n`);
        this.emitOutput(`... where X is a number.\n`);
        this.emitOutput(`But your chapter heading was: '${chapterHeading}'\n\n`);
        throw new Error('Invalid chapter heading format!');
      }
    }
    
    // Format the chapter number as 3-digit
    const formattedChapter = String(parseInt(chapterNum, 10)).padStart(3, '0');
    
    return { 
      chapterNum,
      formattedChapter,
      title,
      full: `Chapter ${chapterNum}: ${title}`
    };
  }

  /**
   * Format chapter heading for consistency in the prompt
   * @param {string} chapterHeading - Chapter heading text
   * @returns {string} - Formatted chapter heading
   */
  formatChapterHeading(chapterHeading) {
    // Extract chapter number and title if possible
    const fullPattern = /^Chapter\s+(\d+)[:\.\s-]+(.+)$/i;
    const numberPattern = /^(\d+)[:\.\s-]+(.+)$/;
    
    let match = chapterHeading.match(fullPattern) || chapterHeading.match(numberPattern);
    
    if (match) {
      const [, num, title] = match;
      return `Chapter ${num}: ${title.trim()}`;
    }
    
    // If we couldn't parse it, return the original
    return chapterHeading;
  }

  /**
   * Format outline heading for consistency
   * @param {string} chapterHeading - Chapter heading text
   * @returns {string} - Formatted outline heading
   */
  formatOutlineHeading(chapterHeading) {
    // Extract chapter number and title if possible
    const fullPattern = /^Chapter\s+(\d+)[:\.\s-]+(.+)$/i;
    const numberPattern = /^(\d+)[:\.\s-]+(.+)$/;
    
    let match = chapterHeading.match(fullPattern) || chapterHeading.match(numberPattern);
    
    if (match) {
      const [, num, title] = match;
      return `Chapter ${num}: ${title.trim()}`;
    }
    
    // If we couldn't parse it, return the original
    return chapterHeading;
  }
  
  /**
   * Create the chapter prompt
   * @param {string} formattedHeading - Formatted chapter heading
   * @param {string} formattedOutlineHeading - Formatted outline heading for consistency
   * @param {string} outlineContent - Content of outline file
   * @param {string} worldContent - Content of world file
   * @param {string} novelContent - Content of manuscript file
   * @param {string} language - Language to write in
   * @returns {string} - Complete prompt for AI API
   */
  createChapterPrompt(formattedHeading, formattedOutlineHeading, outlineContent, worldContent, novelContent, language) {
    return `
You are a professional fiction writer with expertise in creating engaging, readable prose.

=== OUTLINE ===
${outlineContent}
=== END OUTLINE ===

=== WORLD ===
${worldContent}
=== END WORLD ===

=== EXISTING MANUSCRIPT ===
${novelContent}
=== END EXISTING MANUSCRIPT ===

You are a skilled novelist writing ${formattedHeading} in fluent, authentic ${language}. 
Draw upon your knowledge of worldwide literary traditions, narrative techniques, and creative approaches from across cultures, while expressing everything in natural, idiomatic ${language} that honors its unique linguistic character.

YOUR TASK:
Write ${formattedHeading} according to these guidelines. DO NOT SHOW ANY THOUGHT PROCESS - ONLY WRITE THE ACTUAL CHAPTER TEXT.

WRITING REQUIREMENTS:
- Read thoroughly the included OUTLINE, WORLD, and MANUSCRIPT
- Refer to the world of characters and settings provided
- Create compelling opening and closing scenes
- Incorporate sensory details and vivid descriptions
- Maintain consistent tone and style with previous chapters
- Begin with: ${formattedOutlineHeading} and write in plain text only
- Write 2,500-3,000 words
- Do not repeat content from existing chapters
- Do not start working on the next chapter

CHARACTER RESTRICTIONS:
- Do NOT create any new named characters
- Only use characters explicitly mentioned in the WORLD, OUTLINE, or MANUSCRIPT
- Only add minimal unnamed incidental characters when absolutely necessary (e.g., waiter, cashier)

WORLD BUILDING:
- Make extensive use of the world details provided in the WORLD section
- Incorporate the settings, locations, history, culture, and atmosphere described there

DIALOGUE EMPHASIS:
- Significantly increase the amount of dialogue (40% of content)
- Include both external conversations and internal thoughts/monologues
- Ensure each character's dialogue reflects their unique personality

STYLISTIC REQUIREMENTS:
- NO Markdown formatting - plain text only
- Use hyphens only for legitimate ${language} words
- Write all times in 12-hour numerical format with a space before lowercase am/pm (e.g., "10:30 am")
- Maintain engaging narrative pacing through varied sentence structure
- Avoid whispers, echoes, eyes widening, and other overused phrases
- EXPAND your vocabulary beyond common expressions, especially for:
  • Dialogue attribution (beyond said, asked, replied)
  • Character movements (beyond nodding, sighing, shrugging)
  • Emotional reactions (beyond physical clichés like racing hearts)
  • Environmental descriptions (use specific terminology)

IMPORTANT: Provide ONLY the chapter text itself with no explanation, commentary, or thinking process.
  `;
  }
  
  /**
   * Append the new chapter to the manuscript file
   * @param {string} chapterText - Text of the new chapter
   * @param {string} manuscriptPath - Path to the manuscript file
   * @returns {Promise<boolean>} - Whether appending was successful
   */
  // async appendToManuscript(chapterText, manuscriptPath) {
  //   try {
  //     // Read the existing manuscript
  //     let manuscriptContent = await fs.readFile(manuscriptPath, 'utf8');
      
  //     // Ensure manuscript ends with exactly one newline
  //     manuscriptContent = manuscriptContent.trim() + '\n';
      
  //     // Append chapter with proper formatting (two blank lines)
  //     const updatedContent = manuscriptContent + '\n\n' + chapterText;
      
  //     // Write updated content back to manuscript
  //     await fs.writeFile(manuscriptPath, updatedContent);
      
  //     return true;
  //   } catch (error) {
  //     console.error('Error appending to manuscript:', error);
  //     this.emitOutput(`Error appending to manuscript: ${error.message}\n`);
  //     return false;
  //   }
  // }
  async appendToManuscript(chapterText, manuscriptPath) {
    try {
      // Read the existing manuscript
      let manuscriptContent = await fs.readFile(manuscriptPath, 'utf8');
      
      // BETTER APPROACH: 
      // Only trim trailing whitespace, not leading whitespace
      // This preserves any newlines before the first chapter
      manuscriptContent = manuscriptContent.replace(/\s+$/, '') + '\n';
      
      // For empty manuscripts, ensure Chapter 1 also has two newlines before it
      if (manuscriptContent.trim() === '') {
        // If the manuscript is empty, add two newlines before the first chapter
        manuscriptContent = '\n\n';
      } else {
        // Otherwise, ensure two newlines between chapters
        manuscriptContent = manuscriptContent + '\n\n';
      }
      
      // Append chapter text (without additional newlines)
      const updatedContent = manuscriptContent + chapterText;
      
      // Write updated content back to manuscript
      await fs.writeFile(manuscriptPath, updatedContent);
      
      return true;
    } catch (error) {
      console.error('Error appending to manuscript:', error);
      this.emitOutput(`Error appending to manuscript: ${error.message}\n`);
      return false;
    }
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

module.exports = ChapterWriter;
