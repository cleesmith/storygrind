// client-openai.js
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs/promises');
const saferStorage = require('./safer_storage');
const Store = require('electron-store');

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

    // Initialize with null client until async initialization completes
    this.client = null;
    this.apiKeyMissing = true;
    this.prompt = null;
    this.user = "storygrind";
    this.temp = 0.3;

    // Perform async initialization
    this._initializeClient();
  }

  async _initializeClient() {
    let apiKey = null;
    
    if (saferStorage.isEncryptionAvailable()) {
      const store = new Store({ name: 'openai-keys' });
      const encryptedKey = store.get('api-key');
      
      if (encryptedKey) {
        try {
          apiKey = saferStorage.decryptString(Buffer.from(encryptedKey, 'latin1'));
        } catch (error) {
          console.error('Failed to decrypt OpenAI API key:', error.message);
        }
      }
    }
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new OpenAI({ apiKey: apiKey });

    this.apiKeyMissing = false;
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
      throw new Error('No manuscript loaded.');
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
   * Count tokens in a text string using OpenAI API (no extra dependencies).
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count (returns -1 on error)
   */
  async countTokens(text) {
    try {
      if (!this.client || this.apiKeyMissing) {
        throw new Error('OpenAI client not initialized');
      }
      
      const response = await this.client.chat.completions.create({
        model: this.config.model_name,
        messages: [{ role: 'user', content: text }],
        max_tokens: 1, // Minimal generation to save costs
        temperature: 0
      });
      
      return response.usage.prompt_tokens;
    } catch (error) {
      console.error('Token counting error:', error);
      return -1;
    }
  }
}

module.exports = AiApiService;
