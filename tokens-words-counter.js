// tokens-words-counter.js
const ToolBase = require('./tool-base');
const path = require('path');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const fs = require('fs').promises;

/**
 * Tokens & Words Counter Tool
 */
class TokensWordsCounter extends ToolBase {
  constructor(apiService, config = {}) {
    super('tokens_words_counter', config);
    this.apiService = apiService;
  }
  
  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Count tokens in a text string
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count
   */
  async countTokens(text) {
    try {
      const tokenCount = await this.apiService.countTokens(text);
      return tokenCount;
    } catch (error) {
      console.error('Token counting error:', error);
      throw error;
    }
  }

  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    if (!this.apiService) {
      throw new Error('API service not initialized for TokensWordsCounter');
    }

    try {
      // Clear the cache for this tool
      fileCache.clear(this.name);

      let inputFile = options.input_file;

      const outputFiles = [];

      // Get the project directory path
      const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
      if (!saveDir) {
        const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                        'Please select a project or specify a save directory.';
        this.emitOutput(errorMsg);
        throw new Error('No save directory available');
      }
    
      // Fix relative paths by resolving them against the project directory
      if (inputFile && !path.isAbsolute(inputFile) && !inputFile.startsWith('~/')) {
        inputFile = path.join(saveDir, inputFile);
      }

      const text = await this.readInputFile(inputFile);
      
      const wordCount = this.countWords(text);
      this.emitOutput(`Word count: ${wordCount.toLocaleString()}\n`);
      
      let wordsPerToken = 0;
      const totalTokens = await this.countTokens(text);
      if (totalTokens < 1) {
          this.emitOutput(`\n*** TOKEN COUNTING ERROR: API key not valid or missing ***\n\n`);
          this.emitOutput('API connection failed. Unable to count tokens.\n');
          this.emitOutput('Please ensure your API key is correctly configured in your environment.\n');
        } else {
          this.emitOutput(`Token count: ${totalTokens.toLocaleString()}\n\n`);
          
          // Calculate token:word ratio
          wordsPerToken = (totalTokens / wordCount);
          this.emitOutput(`Token to word ratio: ${wordsPerToken}\n\n`);
        }
      
      let reportContent = this.generateReport(
        inputFile, 
        wordCount, 
        totalTokens, 
        wordsPerToken
      );

      const configModelName = this.apiService.config.model_name;
      
      // Output the summary report to the console
      this.emitOutput(reportContent);

      reportContent += `\nUsing ${appState.AI_PROVIDER} model: ${configModelName}\n`;
      
      // Save the report to a file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const inputBase = path.basename(inputFile);
      const inputName = path.parse(inputBase).name;
      const outputFileName = `tokens_words_counter_${inputName}_${timestamp}.txt`;
      this.emitOutput(`Saving report to: ${path.join(saveDir, outputFileName)}\n`);
      
      const outputFile = await this.writeOutputFile(
        reportContent, 
        saveDir, 
        outputFileName
      );
      
      // Add to local tracking array
      outputFiles.push(outputFile);
      
      // Add to the shared file cache
      fileCache.addFile(this.name, outputFile);
      
      this.emitOutput('Analysis complete!\n');

      this.emitOutput(`\nUsing ${appState.AI_PROVIDER} model: ${configModelName}\n`);
      
      return {
        success: true,
        outputFiles,
        stats: {
          wordCount,
          tokenCount: totalTokens,
          wordsPerToken: wordsPerToken,
        }
      };
    } catch (error) {
      console.error('Error in TokensWordsCounter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Generate the final analysis report
   * @param {string} filePath - Path to the input file
   * @param {number} wordCount - Total word count
   * @param {number} totalTokens - Total token count
   * @param {number} wordsPerToken - Words per token ratio
   * @returns {string} Formatted report
   */
  generateReport(filePath, wordCount, totalTokens, wordsPerToken) {
    let report = `

TOKENS & WORDS COUNTER REPORT  ${new Date().toLocaleString()}

File: ${filePath}

-------
SUMMARY

Total Human Words: ${wordCount.toLocaleString()}
Total AI Tokens: ${totalTokens.toLocaleString()}
Words per token ratio: ${wordsPerToken}
`;

    return report;
  }
}

module.exports = TokensWordsCounter;
