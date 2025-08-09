// client-gemini.js
const {
    GoogleGenAI,
    HarmCategory,
    HarmBlockThreshold,
    createUserContent,
    createPartFromUri,
} = require('@google/genai');
const saferStorage = require('./safer_storage');
const Store = require('electron-store');

/**
 * AI API Service
 * Handles interactions with AI API services
 */
class AiApiService {
  constructor(config = {}) {
    this.config = {
      model_name: 'models/gemini-2.5-pro',
      ...config
    };

    // Initialize with null client until async initialization completes
    this.client = null;
    this.apiKeyMissing = true;
    // Store manuscript content for direct API calls
    this.manuscriptContent = null;

    // Perform async initialization
    this._initializeClient();
  }

  async _initializeClient() {
    let apiKey = null;
    
    if (saferStorage.isEncryptionAvailable()) {
      const store = new Store({ name: 'gemini-keys' });
      const encryptedKey = store.get('api-key');
      
      if (encryptedKey) {
        try {
          apiKey = saferStorage.decryptString(Buffer.from(encryptedKey, 'latin1'));
        } catch (error) {
          console.error('Failed to decrypt Gemini API key:', error.message);
        }
      }
    }
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found');
      this.apiKeyMissing = true;
      return;
    }

    this.client = new GoogleGenAI({
      apiKey: apiKey
    });

    this.apiKeyMissing = false;
  }

  /**
   * Get list of available models from Gemini API
   * @returns {Promise<Array>} Array of model objects with name and other properties
   */
  async getAvailableModels() {
    if (this.apiKeyMissing || !this.client) {
      return [];
    }

    try {
      const models = await this.client.models.list();
      // Convert to array if it's an iterator/pager
      const modelArray = [];
      for await (const model of models) {
        // Filter for chat-compatible models only
        if (this.isChatCompatible(model)) {
          modelArray.push(model);
        }
      }
      return modelArray;
    } catch (error) {
      console.error('Gemini models list error:', error.message);
      return [];
    }
  }

  /**
   * Check if a Gemini model is chat-compatible
   * @param {Object} model - Model object from Gemini API
   * @returns {boolean} True if model supports chat/generateContent
   */
  isChatCompatible(model) {
    const supportedActions = model.supportedActions || [];
    
    // Must support generateContent for chat
    const hasGenerateContent = supportedActions.includes('generateContent');
    
    // Exclude embedding models, image/video generation, QA models
    const isEmbedding = supportedActions.includes('embedText') || supportedActions.includes('embedContent');
    const isImageVideo = supportedActions.includes('predict') || supportedActions.includes('predictLongRunning');
    const isQA = supportedActions.includes('generateAnswer');
    
    return hasGenerateContent && !isEmbedding && !isImageVideo && !isQA;
  }

  /**
   * Verifies the AI API key and connection to the specified model.
   * @returns {Promise<boolean>} True if the API key is valid and model is accessible, false otherwise.
   */
  async verifyAiAPI() {
    if (this.apiKeyMissing || !this.client) {
      return false;
    }

    try {
      // Use models.get() to verify API access and specific model availability
      // This is more efficient than listing all models and searching
      const modelInfo = await this.client.models.get({ model: this.config.model_name });
      
      if (modelInfo && modelInfo.name) {
        console.log(`Gemini model accessible: ${this.config.model_name}`);
        return true;
      }
      
      console.error(`Gemini model not found: ${this.config.model_name}`);
      this.apiKeyMissing = true; // Treat model not found as unavailable
      return false;
    } catch (error) {
      console.error(`Gemini API verification failed: ${error.message}`);
      this.apiKeyMissing = true; // Treat API failures as unavailable
      return false;
    }
  }

  /**
   * Stream a response
   * @param {string} prompt - Prompt to complete
   * @param {Function} onText - Callback for response text
   * @returns {Promise<void>}
   */
  async streamWithThinking(prompt, onText, includeMetaData = true, options = {}) {
    if (!this.client || this.apiKeyMissing) {
      throw new Error('Gemini API client not initialized - API key missing');
    }

    try {
      const generationConfiguration = {
        responseMimeType: 'text/plain',
      };

      // Extract includeThinking from options with a default of true for backward compatibility
      const includeThoughts = options.includeThinking !== undefined ? options.includeThinking : false;
    
      const thinkingConfig = {
        includeThoughts: includeThoughts,
        thinkingBudget: 24576
      }

      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF }
      ];

      // Prepare the full prompt with manuscript content if available
      let fullPrompt = prompt;
      if (this.manuscriptContent) {
        fullPrompt = `=== MANUSCRIPT ===\n${this.manuscriptContent}\n=== END MANUSCRIPT ===\n\n${prompt}`;
      }

      const contentsForRequest = [
        {
          role: 'user',
          parts: [
            { text: fullPrompt },
          ],
        }
      ];

      // Create config object
      const configObj = { 
        generationConfig: generationConfiguration,
        thinkingConfig: thinkingConfig,
        safetySettings: safetySettings
      };
      

      const responseStream = await this.client.models.generateContentStream({
        model: this.config.model_name,
        contents: contentsForRequest,
        config: configObj
      });

      for await (const chunk of responseStream) {
        let currentText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Check if this is the final chunk with finishReason: 'STOP'
        const isLastChunk = chunk.candidates?.[0]?.finishReason === 'STOP';
        
        // Skip if no content and not the final chunk
        if (!currentText && !isLastChunk) {
          continue;
        }
        
        if (isLastChunk) {
          // console.log("Full final chunk structure:");
          // console.dir(chunk, { depth: null }); // show the complete object structure

          // Extract metadata for the final chunk
          const metadata = {
            finishReason: chunk.candidates[0].finishReason,
            modelVersion: chunk.modelVersion,
            usageMetadata: chunk.usageMetadata
          };

          const doMetaData = includeMetaData !== undefined ? includeMetaData : true;
          
          if (doMetaData) {
            // Append metadata as text to the current text
            currentText += '\n\n--- RESPONSE METADATA ---\n' + JSON.stringify(metadata, null, 2);
          }
        }
        
        onText(currentText);
      }
    } catch (error) {
      console.error('API Connection Error:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        type: error.type,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText
        } : 'No response'
      });
      throw error;
    }
  }

  /**
   * Count tokens in a text string
   * @param {string} text - Text to count tokens in
   * @returns {Promise<number>} - Token count (returns 0 on error)
   */
  async countTokens(text) {
    try {
      const result = await this.client.models.countTokens({
        model: this.config.model_name,
        contents: [{ role: "user", parts: [{ text: text }] }] 
      });
      
      return result.totalTokens;
    } catch (error) {
      console.error('Token counting error:', error);
      return -1;
    }
  }
}

module.exports = AiApiService;
