// client-openai.js
const path = require('path');
const { OpenAI } = require('openai');
const tiktoken = require('tiktoken-node');
const fs = require('fs/promises');

/**
 * OpenAI API Service
 * Handles interactions with OpenAI API services using openai-node SDK
 */
class AiApiService {
  constructor(config = {}) {
    this.config = {
      model_name: 'gpt-4.1-2025-04-14',
      ...config,
    };

    const apiKeyFromEnv = process.env.OPENAI_API_KEY;
    if (!apiKeyFromEnv) {
      console.error('OPENAI_API_KEY environment variable not found');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new OpenAI({ apiKey: apiKeyFromEnv });

    try {
      this._localEncoder =
        tiktoken.encodingForModel(this.config.model_name) ||
        tiktoken.getEncoding('cl100k_base');
    } catch (err) {
      this._localEncoder = tiktoken.getEncoding('cl100k_base');
    }

    this.prompt = null;

    this.user = "storygrind";
    this.temp = 0.3;
  }

  /**
   * Get list of available models from OpenAI API
   * @returns {Promise<Array>} Array of model objects with id and other properties
   */
  async getAvailableModels() {
    if (this.apiKeyMissing || !this.client) {
      return [];
    }

    try {
      const models = await this.client.models.list();
      const allModels = models.data || [];
      
      // Filter for chat-compatible models only
      return allModels.filter(model => this.isChatCompatible(model));
    } catch (error) {
      console.error('OpenAI models list error:', error.message);
      return [];
    }
  }

  /**
   * Check if an OpenAI model is chat-compatible
   * @param {Object} model - Model object from OpenAI API
   * @returns {boolean} True if model supports chat completions
   */
  isChatCompatible(model) {
    const modelId = model.id || '';
    
    // Positive pattern: Known chat models
    return /^(gpt-|o\d+|chatgpt-)/.test(modelId);
  }

  /**
   * Verifies the OpenAI API key and model access.
   * @returns {Promise<boolean>}
   */
  async verifyAiAPI() {
    if (this.apiKeyMissing || !this.client) return false;
    try {
      const models = await this.client.models.list();
      const match = models.data && models.data.find((m) => m.id === this.config.model_name);
      if (match) {
        console.log(`OpenAI model accessible: ${this.config.model_name}`);
        return true;
      }
      console.error('Model not found:', this.config.model_name);
      this.apiKeyMissing = true; // Treat model not found as unavailable
      return false;
    } catch (err) {
      console.error('OpenAI API verify error:', err.message);
      this.apiKeyMissing = true; // Treat API failures as unavailable
      return false;
    }
  }

  async clearFilesAndCaches() {
    // console.log('OpenAI API: No files or caches to clear');
    return;
  }

  /**
   * Reads a manuscript file and sets this.prompt to its content.
   * @param {string} manuscriptFile - Path to the manuscript file
   * @returns {Promise<Object>} { messages, errors }
   */
  async prepareFileAndCache(manuscriptFile) {
    const messages = [];
    const errors = [];
    try {
      const fileContent = await fs.readFile(manuscriptFile, 'utf-8');
      this.prompt = fileContent;
      messages.push('Manuscript file loaded successfully.');
    } catch (fileErr) {
      errors.push(`File read error: ${fileErr.message}`);
      this.prompt = null;
    }
    return { messages, errors };
  }

  /**
   * Streams a response using OpenAI Responses API
   * @param {string} prompt - The user prompt to send (will prepend manuscript)
   * @param {Function} onText - Callback to receive the response as it arrives
   * @param {object} options - (optional) {includeMetaData}
   */
  async streamWithThinking(prompt, onText, options = {}) {
    if (!this.client || this.apiKeyMissing) {
      throw new Error('OpenAI client not initialized - missing API key');
    }
    if (!this.prompt) {
      throw new Error('No manuscript prompt loaded. Call prepareFileAndCache() first.');
    }
    const fullInput = `=== MANUSCRIPT ===\n${this.prompt}\n=== MANUSCRIPT ===\n${prompt}`;
    console.log(fullInput);
    try {
      const response = await this.client.responses.create({
        user: "storygrind",
        model: this.config.model_name,
        instructions: "You are a very experienced creative fiction writer and editor.",
        input: fullInput,
        stream: true,
        temperature: options.temperature || this.temp,
      });
      
      for await (const event of response) {
        if (event.type === 'response.output_text.delta') {
          onText(event.delta);
        }
        else if (event.type === 'response.output_text.done') {
          if (options.includeMetaData) {
            const metadata = '\n\n--- RESPONSE METADATA ---\n' + JSON.stringify({ model: this.config.model_name }, null, 2);
            onText(metadata);
          }
          break;
        }
      }
    } catch (err) {
      console.error('OpenAI responses error:', err.message);
      throw err;
    }
  }

  /**
   * Count tokens in a text string using tiktoken-node for GPT-4.1-2025-04-14.
   * @param {string} text - Text to count tokens in
   * @returns {number} - Token count (returns -1 on error)
   */
  countTokens(text) {
    try {
      if (!this._localEncoder) throw new Error('Encoder not initialized');
      return this._localEncoder.encode(text).length;
    } catch (error) {
      console.error('Token counting error:', error);
      return -1;
    }
  }
}

module.exports = AiApiService;
