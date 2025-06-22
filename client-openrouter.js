// client-openrouter.js
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs/promises');

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

    const apiKeyFromEnv = process.env.OPENROUTER_API_KEY;
    if (!apiKeyFromEnv) {
      console.error('OPENROUTER_API_KEY environment variable not found');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new OpenAI({ 
      apiKey: apiKeyFromEnv,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        'HTTP-Referer': 'https://www.slipthetrap.com/storygrind.html',
        'X-Title': 'StoryGrind'
      }
    });

    this.prompt = null;

    this.user = "storygrind";
    this.temp = 0.3;
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

  async clearFilesAndCaches() {
    // console.log('OpenRouter API: No files or caches to clear');
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
      throw new Error('No manuscript prompt loaded. Call prepareFileAndCache() first.');
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
      });
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onText(content);
        }
      }

      onText(this.config.model_name);

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
