// proofreader-spelling.js
// Non-AI spell checking tool with multi-language dictionary support
// Uses simple-spellchecker library for fast, accurate spell checking

const ToolBase = require('./tool-base');
const SpellChecker = require('simple-spellchecker');
const fs = require('fs/promises');
const path = require('path');
const appState = require('./state.js');

/**
 * Proofreader Spelling Tool
 * Performs spell checking on manuscript files using language-specific dictionaries
 * Does NOT use AI - uses simple-spellchecker for blazing fast results
 */
class ProofreaderSpelling extends ToolBase {
  constructor(name, config = {}) {
    super(name, config);
    
    // Language code mapping for simple-spellchecker
    // Maps user-friendly language names to technical language codes
    this.LANGUAGE_CODES = {
      'English': 'en-US',
      'Spanish': 'es-ES', 
      'French': 'fr-FR',
      'German': 'de-DE',
      'Dutch': 'nl-NL'
    };
    
    // Configuration for word filtering to reduce false positives
    this.MIN_WORD_LENGTH = 2; // Skip very short words
    this.MAX_WORD_LENGTH = 45; // Skip extremely long words (likely URLs, etc.)
    
    // Common patterns to ignore (reduce false positives for proper names, etc.)
    this.IGNORE_PATTERNS = [
      /^\d+$/, // Pure numbers
      /^[A-Z]{2,}$/, // All caps abbreviations
      /^[A-Z][a-z]+[A-Z]/, // CamelCase words
      /\w+@\w+/, // Email-like patterns
      /https?:\/\//, // URLs
    ];
  }

  /**
   * Execute the spell checking process
   * @param {Object} options - Configuration options from the UI
   * @returns {Promise<Object>} - Execution result with output files
   */
  async execute(options) {
    const saveDir = appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    try {
      // Step 1: Validate and extract configuration from user input
      // Use language from Electron Store as default if no language specified
      const defaultLanguage = appState.LANGUAGE.name;
      const selectedLanguage = options.lang || defaultLanguage;
      const languageCode = this.LANGUAGE_CODES[selectedLanguage];
      const manuscriptFile = options.manuscript_file;

      // Step 2: Inform user about the process starting
      this.emitOutput(`\n=== SPELL CHECK ANALYSIS ===\n`);
      this.emitOutput(`Language: ${selectedLanguage} (${languageCode})\n`);
      this.emitOutput(`Manuscript: ${manuscriptFile}\n\n`);

      // Step 3: Load the appropriate language dictionary
      this.emitOutput(`Loading ${selectedLanguage} dictionary...\n`);
      const dictionary = await this.loadDictionary(languageCode, selectedLanguage);
      this.emitOutput(`Dictionary loaded successfully.\n\n`);

      // Step 4: Read and process the manuscript file
      this.emitOutput(`Reading manuscript file...\n`);
      const manuscriptContent = await this.readInputFile(manuscriptFile);
      this.emitOutput(`Manuscript loaded: ${manuscriptContent.length} characters\n\n`);

      // Step 5: Extract words and perform spell checking
      this.emitOutput(`Extracting and analyzing words...\n`);
      const analysisResults = await this.analyzeManuscript(manuscriptContent, dictionary);
      
      // Step 6: Generate and display results
      this.emitOutput(`\nSpell check analysis complete!\n`);
      this.emitOutput(`Total words analyzed: ${analysisResults.totalWords}\n`);
      this.emitOutput(`Likely misspellings found: ${analysisResults.misspellings.length}\n`);
      this.emitOutput(`Unusual spellings found: ${analysisResults.unusualSpellings.length}\n\n`);

      // Step 7: Save detailed results to file
      const savedFiles = await this.saveResults(analysisResults, selectedLanguage, saveDir);
      
      this.emitOutput(`Results saved successfully!\n`);
      
      return {
        success: true,
        outputFiles: savedFiles
      };

    } catch (error) {
      this.emitOutput(`\nError during spell checking: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Load spell checking dictionary for the specified language
   * @param {string} languageCode - Technical language code (e.g., 'fr-FR')
   * @param {string} languageName - Human-readable language name (e.g., 'French')
   * @returns {Promise<Object>} - Dictionary object for spell checking
   */
  async loadDictionary(languageCode, languageName) {
    return new Promise((resolve, reject) => {
      SpellChecker.getDictionary(languageCode, (err, dictionary) => {
        if (err) {
          // Provide helpful error message if dictionary loading fails
          const errorMessage = `Failed to load ${languageName} dictionary. ` +
            `This might happen if the dictionary files are missing or corrupted. ` +
            `Error details: ${err.message}`;
          reject(new Error(errorMessage));
          return;
        }
        
        // Verify that the dictionary object has the expected methods
        if (!dictionary || typeof dictionary.spellCheck !== 'function') {
          reject(new Error(`Invalid dictionary object received for ${languageName}`));
          return;
        }
        
        resolve(dictionary);
      });
    });
  }

  /**
   * Analyze manuscript content for spelling errors
   * @param {string} content - Full manuscript text content
   * @param {Object} dictionary - Loaded spell checking dictionary
   * @returns {Promise<Object>} - Analysis results with categorized findings
   */
  async analyzeManuscript(content, dictionary) {
    // Extract all words from the manuscript
    const allWords = this.extractWords(content);
    // Remove duplicates for efficiency
    const uniqueWords = [...new Set(allWords)]; 

    // Initialize result containers
    const results = {
      totalWords: allWords.length,
      uniqueWords: uniqueWords.length,
      misspellings: [],
      unusualSpellings: [],
      processedWords: 0
    };

    // Process each unique word through spell checking
    for (const word of uniqueWords) {
      results.processedWords++;
      
      // Skip words that match ignore patterns (likely not spelling errors)
      if (this.shouldIgnoreWord(word)) {
        continue;
      }
      
      // Perform the actual spell check
      const isCorrect = dictionary.spellCheck(word);
      
      if (!isCorrect) {
        // Get suggestions for misspelled words
        const suggestions = dictionary.getSuggestions(word, 3); // Limit to 3 suggestions
        
        // Categorize based on whether we have good suggestions
        if (suggestions && suggestions.length > 0) {
          results.misspellings.push({
            word: word,
            suggestions: suggestions
          });
        } else {
          // Words without suggestions might be proper names or unusual but correct words
          results.unusualSpellings.push(word);
        }
      }
    }

    return results;
  }

  /**
   * Extract words from text content for spell checking
   * @param {string} content - Raw text content
   * @returns {string[]} - Array of extracted words
   */
  extractWords(content) {
    // Use regex to extract words, handling contractions and various English text gotchas
    // Explicitly include Unicode 8217 (right single quote) which is common in documents
    const wordPattern = /\b[\p{L}]+(?:['`''\u2019][\p{L}]+)*\b/gu;
    const matches = content.match(wordPattern) || [];
    
    return matches
      .filter(word => {
        // Filter out words that are too short or too long
        return word.length >= this.MIN_WORD_LENGTH && word.length <= this.MAX_WORD_LENGTH;
      })
      .map(word => {
        // Clean up words: remove leading/trailing punctuation, normalize case
        // Also normalize apostrophes to straight quotes for consistency
        return word
          .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '') // Remove non-letter punctuation from ends
          .replace(/['`''\u2019]/g, "'") // Normalize all apostrophe types to straight
          .toLowerCase();
      })
      .filter(word => word.length > 0); // Remove empty strings after cleanup
  }

  /**
   * Determine if a word should be ignored during spell checking
   * @param {string} word - Word to evaluate
   * @returns {boolean} - True if word should be ignored
   */
  shouldIgnoreWord(word) {
    // // Check against all ignore patterns
    // for (const pattern of this.IGNORE_PATTERNS) {
    //   if (pattern.test(word)) {
    //     return true;
    //   }
    // }
    
    // // Additional heuristics to reduce false positives
    
    // // Skip words that start with capital letters (likely proper names)
    // if (/^[A-Z]/.test(word) && word.length > 3) {
    //   return true;
    // }
    
    // // Skip words with unusual character combinations that might be technical terms
    // if (/[0-9]/.test(word)) { // Contains numbers
    //   return true;
    // }
    
    return false;
  }

  /**
   * Save spell checking results to files
   * @param {Object} results - Analysis results from analyzeManuscript
   * @param {string} language - Language name for file naming
   * @param {string} saveDir - Directory to save results
   * @returns {Promise<string[]>} - Array of saved file paths
   */
  async saveResults(results, language, saveDir) {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
    const baseFilename = `spelling_check_${language.toLowerCase()}_${timestamp}`;
    const savedFiles = [];

    // Create comprehensive report
    let report = `=== SPELL CHECK REPORT ===\n`;
    report += `Language: ${language}\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total words in manuscript: ${results.totalWords.toLocaleString()}\n`;
    report += `Unique words analyzed: ${results.uniqueWords.toLocaleString()}\n\n`;

    // Add misspellings section
    if (results.misspellings.length > 0) {
      report += `Likely Misspellings (${results.misspellings.length}):\n`;
      results.misspellings.forEach(item => {
        report += `   ${item.word}`;
        if (item.suggestions && item.suggestions.length > 0) {
          report += ` = ${item.suggestions.join(', ')}`;
        }
        report += `\n`;
      });
      report += `\n`;
    } else {
      report += `No likely misspellings found!\n\n`;
    }

    // Add unusual spellings section
    if (results.unusualSpellings.length > 0) {
      report += `Unusual Spellings (${results.unusualSpellings.length}):\n`;
      results.unusualSpellings.forEach(word => {
        report += `   ${word}\n`;
      });
      report += `\n`;
    } else {
      report += `No unusual spellings found.\n\n`;
    }

    // Add analysis summary
    report += `=== ANALYSIS SUMMARY ===\n`;
    const errorRate = ((results.misspellings.length + results.unusualSpellings.length) / results.uniqueWords * 100).toFixed(2);
    report += `Potential spelling issues: ${errorRate}% of unique words\n`;
    
    if (results.misspellings.length === 0 && results.unusualSpellings.length === 0) {
      report += `\nExcellent! No spelling issues detected in your manuscript.\n`;
    } else if (results.misspellings.length < 10) {
      report += `\nGood news! Only a few potential spelling issues found.\n`;
    } else {
      report += `\nConsider reviewing the flagged words, but remember that proper names\n`;
      report += `and technical terms may appear as "misspellings" even when correct.\n`;
    }

    // Save the main report
    const reportPath = await this.writeOutputFile(report, saveDir, `${baseFilename}.txt`);
    savedFiles.push(reportPath);

    // Create a simple word list file for easy reference
    if (results.misspellings.length > 0) {
      const wordList = results.misspellings.map(item => item.word).sort().join('\n');
      const wordListPath = await this.writeOutputFile(wordList, saveDir, `${baseFilename}_words_only.txt`);
      savedFiles.push(wordListPath);
    }

    return savedFiles;
  }
}

module.exports = ProofreaderSpelling;
