// client.js - Base API Provider Factory
const appState = require('./state.js');

function createApiService() {
  // Get selected provider from settings
  const selectedProvider = appState.store ? appState.store.get('selectedApiProvider') : null;
  
  // Default to gemini if no selection (fallback)
  const provider = selectedProvider || 'gemini';
  
  console.log(`Creating API service for provider: ${provider}`);
  
  try {
    let ApiServiceClass;
    
    switch (provider) {
      case 'gemini':
        ApiServiceClass = require('./client-gemini.js');
        break;
      case 'openai':
        ApiServiceClass = require('./client-openai.js'); 
        break;
      case 'claude':
        ApiServiceClass = require('./client-claude.js');
        break;
      case 'skipped':
        // User skipped API setup, return null
        console.log('API setup was skipped by user');
        return null;
      default:
        console.warn(`Unknown API provider: ${provider}, defaulting to Gemini`);
        ApiServiceClass = require('./client-gemini.js');
    }
    
    // Return the constructor class, not an instance
    return ApiServiceClass;
    
  } catch (error) {
    console.error(`Error creating API service for provider ${provider}:`, error);
    throw error;
  }
}

module.exports = createApiService;
