// state.js
const path = require('path');
const os = require('os');

// Basic logging setup that works even if logToFile isn't defined 
// in this context
function safeLog(message) {
  return; // cls: not so useful?
  // // Log to console first (works in development)
  // console.log(message);
  
  // // Try to log to file if the function exists in global scope (from main.js)
  // if (typeof global.logToFile === 'function') {
  //   global.logToFile(`[state.js] ${message}`);
  // } else {
  //   // Fallback file logging if needed
  //   try {
  //     // const fs = require('fs');
  //     // const path = require('path');
  //     // const os = require('os');
  //     // const logPath = path.join(os.homedir(), 'storygrind-debug.log');
  //     // const timestamp = new Date().toISOString();
  //     // const logLine = `${timestamp}: [state.js] ${message}\n`;
  //     // fs.appendFileSync(logPath, logLine);
  //   } catch (e) {
  //     // Can't do anything if this fails
  //   }
  // }
}

// Log module loading started
safeLog('Module loading started');

// Create a placeholder for Electron Store that will be filled in later
let Store = null;

// Create the AppState class
class AppState {
  constructor() {
    // Application paths
    this.APP_ROOT = path.resolve(path.join(__dirname, '..'));
    
    // File system paths
    // users can not change this:
    this.PROJECTS_DIR = path.join(os.homedir(), 'writing_with_storygrind');
    this.DEFAULT_SAVE_DIR = this.PROJECTS_DIR;
    
    // Project tracking
    this.CURRENT_PROJECT = null;
    this.CURRENT_PROJECT_PATH = null;
    
    // Tool selection and execution state
    this.SELECTED_TOOL = null;
    this.IS_RUNNING = false;
    this.OPTION_VALUES = {};
    this.FULL_COMMAND = null;
    
    // Settings
    this.AI_PROVIDER = null;
    this.LANGUAGE = {
      code: 'en-US',
      name: 'English',
      nativeName: 'English'
    };
    
    // Store will be initialized in initialize()
    this.store = null;
    this.initialized = false;
  }
  
  // Async initialization method
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (!Store) {
        Store = require('electron-store');
      }
      
      // Initialize persistent storage
      this.store = new Store({
        name: 'storygrind-config'
      });
      console.log(`*** Electron Store location: ${this.store.path}`);
      
      // Load saved settings
      this.loadSettings();
      
      this.initialized = true;
      console.log('AppState initialized successfully');
    } catch (error) {
      console.error('Error initializing AppState:', error);
      throw error;
    }
  }
  
  loadSettings() {
    if (!this.store) {
      console.warn('Store not initialized, cannot load settings');
      return;
    }
    
    // Load settings from electron-store
    const settings = this.store.get('settings', {});
    
    // Apply saved settings if available and validate they still exist
    if (settings.current_project && settings.current_project_path) {
      const savedPath = settings.current_project_path;
      if (this.isPathValid(savedPath) && this.directoryExists(savedPath)) {
        this.CURRENT_PROJECT = settings.current_project;
        this.CURRENT_PROJECT_PATH = savedPath;
        this.DEFAULT_SAVE_DIR = savedPath;
      } else {
        // Project directory no longer exists, clear stored settings
        console.log(`Project directory '${savedPath}' no longer exists, clearing stored project`);
        this.store.set('settings', {});
        this.CURRENT_PROJECT = null;
        this.CURRENT_PROJECT_PATH = null;
      }
    }
    
    // Load AI provider and language settings
    const selectedProvider = this.store ? this.store.get('selectedApiProvider') : null;
    if (selectedProvider) {
      this.AI_PROVIDER = selectedProvider;
    }
    if (settings.language) {
      // Handle migration from old string format to new object format
      if (typeof settings.language === 'string') {
        this.LANGUAGE = this._migrateLanguageString(settings.language);
        // Save the migrated language object back to store
        this.saveSettings();
      } else {
        this.LANGUAGE = settings.language;
      }
    }
  }
  
  // Helper method to migrate old language strings to new object format
  _migrateLanguageString(languageCode) {
    const languageMap = {
      'en-US': { code: 'en-US', name: 'English', nativeName: 'English' },
      'es-ES': { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
      'fr-FR': { code: 'fr-FR', name: 'French',  nativeName: 'Français' },
      'de-DE': { code: 'de-DE', name: 'German',  nativeName: 'Deutsch' },
      'nl-NL': { code: 'nl-NL', name: 'Dutch',   nativeName: 'Nederlands' }
    };
    
    return languageMap[languageCode] || languageMap['en-US'];
  }
  
  isPathValid(filePath) {
    // Verify path exists and is within PROJECTS_DIR
    try {
      const realPath = path.resolve(filePath);
      const realProjectsDir = path.resolve(this.PROJECTS_DIR);
      return realPath.startsWith(realProjectsDir);
    } catch (error) {
      console.error('Path validation error:', error);
      return false;
    }
  }
  
  directoryExists(dirPath) {
    try {
      const fs = require('fs');
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch (error) {
      console.error('Directory existence check error:', error);
      return false;
    }
  }
  
  // Save settings to persistent storage
  saveSettings() {
    if (!this.store) {
      console.warn('Store not initialized, cannot save settings');
      return;
    }
    
    const settings = {
      current_project: this.CURRENT_PROJECT,
      current_project_path: this.CURRENT_PROJECT_PATH,
      ai_provider: this.AI_PROVIDER,
      language: this.LANGUAGE
    };
    
    this.store.set('settings', settings);
    console.log('Settings saved to persistent storage');
  }
  
  // Update AI provider
  setAiProvider(provider) {
    this.AI_PROVIDER = provider;
    this.saveSettings();
  }
  
  // Update language
  setLanguage(language) {
    this.LANGUAGE = language;
    this.saveSettings();
  }
  
  // Get current settings for settings dialog
  getCurrentSettings() {
    return {
      projectsPath: this.PROJECTS_DIR,
      aiProvider: this.store ? this.store.get('selectedApiProvider') : null,
      aiModel: this.store ? this.store.get('selectedAiModel') : null,
      language: this.LANGUAGE
    };
  }

}

// Create a singleton instance
const appStateInstance = new AppState();

// Export the instance with an initialize method
module.exports = appStateInstance;

