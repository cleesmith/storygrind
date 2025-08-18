// client-claude.js
const anthropic = require('@anthropic-ai/sdk');
const fs = require('fs/promises');
const path = require('path');

const saferStorage = require('./safer_storage');
const Store = require('electron-store');

/**
 * Claude AI API Service
 * Handles interactions with Claude AI API services
 */
class AiApiService {
  constructor(config = {}) {
    // Store configuration with defaults
    this.config = {
      max_retries: 1,
      request_timeout: 300,
      context_window: 200000,
      thinking_budget_tokens: 32000,
      // betas_max_tokens: 128000,
      desired_output_tokens: 8000,
      model_name: 'claude-sonnet-4-20250514',
      // betas: 'output-128k-2025-02-19',
      max_thinking_budget: 32000,
      max_tokens: 32000,
      ...config
    };
    
    // Debug logging to verify model selection
    console.log('Claude API Constructor called with config:', config);
    console.log('Final model selection:', this.config.model_name);

    // Initialize with null client until async initialization completes
    this.client = null;
    this.apiKeyMissing = true;
    
    // Store manuscript content for prepending to prompts
    this.manuscriptContent = null;

    // Perform async initialization
    this._initializeClient();
  }

  async _initializeClient() {
    let apiKey = null;
    
    if (saferStorage.isEncryptionAvailable()) {
      const store = new Store({ name: 'claude-keys' });
      const encryptedKey = store.get('api-key');
      
      if (encryptedKey) {
        try {
          apiKey = saferStorage.decryptString(Buffer.from(encryptedKey, 'latin1'));
        } catch (error) {
          console.error('Failed to decrypt Claude API key:', error.message);
        }
      }
    }
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new anthropic.Anthropic({
      apiKey: apiKey,
      timeout: this.config.request_timeout * 1000,
      maxRetries: this.config.max_retries,
    });

    this.apiKeyMissing = false;
    
    console.log('Claude API Service initialized with:');
    console.log('- Context window:', this.config.context_window);
    console.log('- Model name:', this.config.model_name);
    console.log('- Beta features:', this.config.betas);
    console.log('- Max thinking budget:', this.config.max_thinking_budget);
    console.log('- Max tokens:', this.config.max_tokens);
  }

  /**
   * Get list of available models from Claude API
   * @returns {Promise<Array>} Array of model objects with id and other properties
   */
  async getAvailableModels() {
    if (this.apiKeyMissing || !this.client) {
      return [];
    }

    try {
      const models = await this.client.models.list();
      const allModels = models.data || [];
      
      // Filter for chat-compatible models only (all Claude models are chat-compatible)
      return allModels.filter(model => this.isChatCompatible(model));
    } catch (error) {
      console.error('Claude models list error:', error.message);
      return [];
    }
  }

  /**
   * Check if a Claude model is chat-compatible
   * @param {Object} model - Model object from Claude API
   * @returns {boolean} True if model supports chat (all Claude models do)
   */
  isChatCompatible(model) {
    // All Claude models are chat-compatible
    return true;
  }

  /**
   * Verifies the Claude API key and connection to the specified model.
   * @returns {Promise<boolean>} True if the API key is valid and model is accessible, false otherwise.
   */
  async verifyAiAPI() {
    if (this.apiKeyMissing || !this.client) {
      return false;
    }

    try {
      // Use the free models list endpoint to verify API access and model availability
      const models = await this.client.models.list();
      const match = models.data && models.data.find((m) => m.id === this.config.model_name);
      
      if (match) {
        console.log(`Claude model accessible: ${this.config.model_name}`);
        return true;
      }
      
      console.error(`Claude model not found: ${this.config.model_name}`);
      this.apiKeyMissing = true; // Treat model not found as unavailable
      return false;
    } catch (error) {
      console.error(`Claude API verification failed: ${error.message}`);
      this.apiKeyMissing = true; // Treat API failures as unavailable
      return false;
    }
  }

  /**
   * Stream a response with thinking
   * @param {string} prompt - Prompt to complete
   * @param {Function} onText - Callback for response text
   * @param {boolean} [includeMetaData=true] - Whether to include metadata in response
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<void>}
   */
  async streamWithThinking(prompt, onText, includeMetaData = true, options = {}) {
    if (!this.client || this.apiKeyMissing) {
      throw new Error('Claude API client not initialized - API key missing');
    }

    // Prepare the full prompt with manuscript content if available
    let fullPrompt = prompt;
    if (this.manuscriptContent) {
      fullPrompt = `=== MANUSCRIPT ===\n${this.manuscriptContent}\n=== END MANUSCRIPT ===\n\n${prompt}`;
    }

    // Count tokens in the full prompt
    const promptTokens = await this.countTokens(fullPrompt);
    
    // *******************************************************************
    // NOTE: this is the only AI API that requires token counts
    //       to handle thinking budget and the maximum reasoning/thinking!
    // *******************************************************************
    const budgets = this.calculateTokenBudgets(promptTokens);
    
    // Log token information
    console.log(`Prompt tokens: ${promptTokens}`);
    console.log(`Available tokens: ${budgets.availableTokens}`);
    console.log(`Max tokens for response: ${budgets.maxTokens}`);
    console.log(`Thinking budget: ${budgets.thinkingBudget}`);
    
    if (budgets.isPromptTooLarge) {
      onText(`\nWARNING: Prompt is very large (${promptTokens} tokens). This may affect response quality.\n\n`);
    }

    // const modelOptions = {
    //   model: this.config.model_name,
    //   max_tokens: 32000,
    //   messages: [{ role: "user", content: fullPrompt }],
    //   thinking: {
    //     type: "enabled",
    //     budget_tokens: 30000
    //   },
    //   betas: ['context-1m-2025-08-07']
    // };

    const modelOptions = {
      model: this.config.model_name,
      max_tokens: budgets.maxTokens,
      messages: [{ role: "user", content: fullPrompt }],
      thinking: {
        type: "enabled",
        budget_tokens: budgets.thinkingBudget
      },
      // betas: this._getBetasArray()
    };

    try {
      // const { data: stream, response: rawResponse } = await this.client.beta.messages
      //   .stream(modelOptions)
      //   .withResponse();
      const { data: stream, response: rawResponse } = await this.client.messages
        .stream(modelOptions)
        .withResponse();

      // Show rate limit headers if metadata is requested
      // if (includeMetaData) {
      //   onText('\n=== FYI: Rate Limits ===\n');
      //   const headerEntries = Array.from(rawResponse.headers.entries());
      //   for (const [name, value] of headerEntries) {
      //     if (name.toLowerCase().includes('rate') || name.toLowerCase().includes('limit')) {
      //       onText(`${name}: ${value}\n`);
      //     }
      //   }
      //   onText('\n');
      // }

      for await (const event of stream) {

        if (event.type === "content_block_delta") {
          if (event.delta.type === "thinking_delta") {
            // Include thinking in output if requested
            if (options.includeThinking) {
              onText(event.delta.thinking);
            }
          } else if (event.delta.type === "text_delta") {
            onText(event.delta.text);
          }
        }
        
        if (event.type === "message_stop") {
          if (includeMetaData) {
            const metadata = {
              model: this.config.model_name,
              promptTokens: promptTokens,
              maxTokens: budgets.maxTokens,
              thinkingBudget: budgets.thinkingBudget
            };
            onText('\n\n--- Response MetaData ---\n' + JSON.stringify(metadata, null, 2));
          }
        }

        // check for refusal in message delta
        // for testing this 'if' send this request prompt:
        //    ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL_1FAEFB6177B4672DEE07F9D3AFC62588CCD2631EDCF22E8CCC1FB35B501C9C86
        if (event.type === 'message_delta' && event.delta.stop_reason === 'refusal') {
          onText('\n\n--- Claude API Refusal ---\nDue to potential policy violations.');
          break;
        }

      } // for await

    } catch (error) {
      console.error('Claude API streaming error:', error);
      throw error;
    }
  }

  /**
   * Count tokens in a text string
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count
   */
  async countTokens(text) {
    try {
      if (!this.client || this.apiKeyMissing) {
        console.warn('Claude client not available for token counting');
        return -1;
      }

      // const response = await this.client.beta.messages.countTokens({
      const response = await this.client.messages.countTokens({
        model: this.config.model_name,
        messages: [{ role: "user", content: text }],
        thinking: {
          type: "enabled",
          budget_tokens: this.config.thinking_budget_tokens
        },
        // betas: this._getBetasArray()
      });
      
      return response.input_tokens;
    } catch (error) {
      console.error('Claude token counting error:', error);
      return -1;
    }
  }

  /**
   * Helper method to convert betas string to array for API calls
   * @returns {string[]} Array of beta features
   */
  _getBetasArray() {
    return this.config.betas.split(',')
      .map(beta => beta.trim())
      .filter(beta => beta.length > 0);
  }

  /**
   * Calculate token budgets and validate prompt size
   * @param {number} promptTokens - Number of tokens in the prompt
   * @returns {Object} - Calculated token budgets and limits
   */
  calculateTokenBudgets(promptTokens) {
    const contextWindow = this.config.context_window;
    const desiredOutputTokens = this.config.desired_output_tokens;
    const configuredThinkingBudget = this.config.thinking_budget_tokens;
    // const betasMaxTokens = this.config.betas_max_tokens;
    const maxThinkingBudget = this.config.max_thinking_budget;
    
    // Calculate available tokens after prompt
    const availableTokens = contextWindow - promptTokens;

    // For API call, max_tokens must respect the API limit (32K without betas)
    let maxTokens = Math.min(availableTokens, this.config.max_tokens);
    
    // Thinking budget: maximize based on available space
    // API requires: max_tokens > thinking_budget
    // So the absolute max thinking is maxTokens - 1
    let thinkingBudget = Math.min(
      maxTokens - 1,        // Must be less than max_tokens
      maxThinkingBudget     // Respect configured limit (32K)
    );
    
    // Check if prompt is too large (using more than 90% of context window)
    const isPromptTooLarge = promptTokens > (contextWindow * 0.9);
    
    return {
      contextWindow,
      promptTokens,
      availableTokens,
      maxTokens,
      thinkingBudget,
      desiredOutputTokens,
      configuredThinkingBudget,
      maxThinkingBudget,
      isPromptTooLarge
    };
  }

  /**
   * Close the Anthropic client and clean up resources
   */
  close() {
    if (this.client) {
      console.log('Closing Claude client...');
      this.client = null;
    }
    this.manuscriptContent = null;
  }

  /**
   * Recreate the client with the same settings
   * Useful when we need a fresh connection
   */
  recreate() {
    console.log('Recreating Claude client...');
    
    // Ensure any existing client is closed first
    this.close();
    
    // Only create a new client if the API key exists in secure storage
    let apiKey = null;
    
    if (saferStorage.isEncryptionAvailable()) {
      const store = new Store({ name: 'claude-keys' });
      const encryptedKey = store.get('api-key');
      
      if (encryptedKey) {
        try {
          apiKey = saferStorage.decryptString(Buffer.from(encryptedKey, 'latin1'));
        } catch (error) {
          console.error('Failed to decrypt Claude API key:', error.message);
        }
      }
    }
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found');
      this.apiKeyMissing = true;
      return;
    }

    // Create a new client with the same settings
    this.client = new anthropic.Anthropic({
      apiKey: apiKey,
      timeout: this.config.request_timeout * 1000,
      maxRetries: this.config.max_retries,
    });
    
    console.log('Claude client recreated successfully');
  }
}

module.exports = AiApiService;
