// client-openrouter.js
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs/promises');

const saferStorage = require('./safer_storage');
const Store = require('electron-store');

/**
 * OpenRouter API Service
 * Handles interactions with OpenRouter API services using openai-node SDK
 */
class AiApiService {
  constructor(config = {}) {
    this.config = {
      model_name: 'openai/gpt-4o',
      ...config,
    };

    // Initialize with null client until async initialization completes
    this.client = null;
    this.apiKeyMissing = true;
    this.prompt = null;
    this.user = "storygrind";
    this.temp = 0.3; // 0.0 (conservative) to 2.0 (wild/crazy)

    // Perform async initialization
    this._initializeClient();
  }

  async _initializeClient() {
    let apiKey = null;
    
    if (saferStorage.isEncryptionAvailable()) {
      const store = new Store({ name: 'openrouter-keys' });
      const encryptedKey = store.get('api-key');
      
      if (encryptedKey) {
        try {
          apiKey = saferStorage.decryptString(Buffer.from(encryptedKey, 'latin1'));
        } catch (error) {
          console.error('Failed to decrypt OpenRouter API key:', error.message);
        }
      }
    }
    
    if (!apiKey) {
      console.error('OpenRouter API key not found in secure storage');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new OpenAI({ 
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        'HTTP-Referer': 'https://www.slipthetrap.com/storygrind.html',
        'X-Title': 'StoryGrind'
      }
    });

    this.apiKeyMissing = false;
  }

  /**
   * Get list of available models from OpenRouter API
   * @returns {Promise<Array>} Array of model objects with id and other properties
   */
  async getAvailableModels() {
    if (this.apiKeyMissing || !this.client) {
      return [];
    }

    try {
      const models = await this.client.models.list();
      const allModels = models.data || [];
      
      // Filter for chat-compatible models only and sort alphabetically
      return allModels
        .filter(model => this.isChatCompatible(model))
        .sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      console.error('OpenRouter models list error:', error.message);
      return [];
    }
  }

  /**
   * Check if an OpenRouter model is chat-compatible
   * @param {Object} model - Model object from OpenRouter API
   * @returns {boolean} True if model supports chat completions
   */
  isChatCompatible(model) {
    const modelId = model.id || '';
    
    // OpenRouter provides chat-compatible models from various providers
    // Most models on OpenRouter support chat completions
    return !modelId.includes('embedding') && !modelId.includes('whisper');
  }

  /**
   * Verifies the OpenRouter API key and model access.
   * @returns {Promise<boolean>}
   */
  async verifyAiAPI() {
    if (this.apiKeyMissing || !this.client) return false;
    try {
      const models = await this.client.models.list();
      
      // Check if we got a valid response with models
      if (models.data && models.data.length > 0) {
        console.log(`OpenRouter API verified successfully - ${models.data.length} models available`);
        return true;
      }
      
      console.error('OpenRouter API: No models available');
      this.apiKeyMissing = true; // Treat as API unavailable
      return false;
    } catch (err) {
      console.error('OpenRouter API verify error:', err.message);
      this.apiKeyMissing = true; // Treat API failures as unavailable
      return false;
    }
  }

  /**
   * Streams a response using OpenRouter Chat Completions API
   * @param {string} prompt - The user prompt to send (will prepend manuscript)
   * @param {Function} onText - Callback to receive the response as it arrives
   * @param {object} options - (optional) {includeMetaData}
   */
  async streamWithThinking(prompt, onText, options = {}) {
    if (!this.client || this.apiKeyMissing) {
      throw new Error('OpenRouter client not initialized - missing API key');
    }
    if (!this.prompt) {
      throw new Error('No manuscript loaded.');
    }
    const fullInput = `=== MANUSCRIPT ===\n${this.prompt}\n=== MANUSCRIPT ===\n${prompt}`;
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model_name,
        messages: [
          {
            role: "system",
            content: "You are a very experienced creative fiction writer and editor."
          },
          {
            role: "user",
            content: fullInput
          }
        ],
        stream: true,
        temperature: options.temperature || this.temp,
        reasoning: {
          effort: "high", // "high", "medium", or "low" (OpenAI-style)
          // ... optional: default is false. All models support this.
          exclude: false, // set to true to exclude reasoning tokens from response
          // ... or enable reasoning with the default parameters:
          enabled: true // inferred from `effort` or `max_tokens`
        }
      });
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onText(content);
        }
      }

      // cls: messes up manuscript.txt using: chapter-writer.js
      // const modelName = `\n\nProvider model: ${this.config.model_name}\n`;
      // onText(modelName);

      if (options.includeMetaData) {
        const metadata = '\n\n--- RESPONSE METADATA ---\n' + JSON.stringify({ model: this.config.model_name }, null, 2);
        onText(metadata);
      }
    } catch (err) {
      console.error('OpenRouter chat completions error:', err.message);
      throw err;
    }
  }

  /**
   * Count tokens in a text string using OpenRouter API (no extra dependencies).
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count (returns -1 on error)
   */
  async countTokens(text) {
    try {
      if (!this.client || this.apiKeyMissing || !this.config.model_name) {
        throw new Error('OpenRouter client not initialized or model not set');
      }
      
      const response = await this.client.chat.completions.create({
        model: this.config.model_name,
        messages: [{ role: 'user', content: text }],
        max_tokens: 16, // minimal generation to save costs
        temperature: 0
      });
      return response.usage.prompt_tokens;
    } catch (error) {
      console.error('Token counting error:', error);
      return -1;
    }
  }
//   async countTokens(text) {
//     try {
//       if (!this.client || this.apiKeyMissing) {
//         throw new Error('OpenAI client not initialized');
//       }
      
//       // const response = await this.client.chat.completions.create({
//       const response = await this.client.responses.create({
//         model: this.config.model_name,
//         messages: [{ role: 'user', content: text }],
//         // max_completion_tokens: 1, // Minimal generation to save costs
//         // temperature: 0
//       });

//       // Responses API uses input_tokens; legacy chat used prompt_tokens
//       let tokens = 0;
//       try {
//         tokens = Number(response?.usage?.input_tokens ?? response?.usage?.prompt_tokens) || 0;
//       } catch {}
//       return tokens;

//       // return response.usage.prompt_tokens;

//       // const response = await this.client.responses.create({
//       //   model: this.config.model_name,
//       //   input: text,
//       //   max_output_tokens: 16,  // be cheap, 16 is minimum required
//       //   text: { verbosity: "low" }, //low, medium, high
//       // });
//       // return response.usage.input_tokens;

//     } catch (error) {
// console.dir(`countTokens: error:`);
// console.dir(error);
// console.dir(`.......................................`);
//       console.error('Token counting error:', error);
//       return -1;
//     }
//   }

}

module.exports = AiApiService;
