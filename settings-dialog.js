// settings-dialog.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing settings dialog...');
  
  // Get elements
  const aiProviderSelect = document.getElementById('ai-provider-select');
  const aiModelSelect = document.getElementById('ai-model-select');
  const languageSelect = document.getElementById('language-select');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const saveQuitBtn = document.getElementById('save-quit-btn');
  const projectsPath = document.getElementById('projects-path');
  const appPath = document.getElementById('app-path');
  const envPath = document.getElementById('env-path');

  console.log('Found elements:', {
    aiProviderSelect: !!aiProviderSelect,
    aiModelSelect: !!aiModelSelect,
    languageSelect: !!languageSelect,
    cancelBtn: !!cancelBtn,
    saveBtn: !!saveBtn,
    saveQuitBtn: !!saveQuitBtn,
    projectsPath: !!projectsPath,
    appPath: !!appPath,
    envPath: !!envPath
  });

  // Track initial values and changes
  let initialProvider = null;
  let initialModel = null;
  let initialLanguage = null;
  let currentProvider = null;
  let currentModel = null;
  let currentLanguage = null;

  // Check if electronAPI is available
  if (!window.electronAPI) {
    console.error('electronAPI not available!');
    return;
  }

  // Load current settings from main process
  async function loadCurrentSettings() {
    try {
      console.log('Loading current settings from main process...');
      const settings = await window.electronAPI.getCurrentSettings();
      console.log('Received settings:', settings);
      
      // Set storygrind locations (read-only display)
      if (settings.appPath) {
        appPath.textContent = settings.appPath;
      }
      if (settings.envPath) {
        envPath.textContent = settings.envPath;
      }
      if (settings.projectsPath) {
        projectsPath.textContent = settings.projectsPath;
      }
      
      // Set AI provider
      if (settings.aiProvider) {
        aiProviderSelect.value = settings.aiProvider;
        initialProvider = settings.aiProvider;
        currentProvider = settings.aiProvider;
        
        // Load models for this provider
        await loadModelsForProvider(settings.aiProvider);
      }
      
      // Set AI model - use user selection or client default
      if (settings.aiModel) {
        // User has explicitly selected a model
        aiModelSelect.value = settings.aiModel;
        initialModel = settings.aiModel;
        currentModel = settings.aiModel;
      } else if (settings.aiProvider) {
        // No user selection, get client default for this provider
        try {
          const clientDefault = await window.electronAPI.getClientDefaultModel(settings.aiProvider);
          if (clientDefault) {
            aiModelSelect.value = clientDefault;
            initialModel = null; // Keep as null so we know it's a default, not user selection
            currentModel = clientDefault;
          }
        } catch (error) {
          console.warn('Could not get client default model:', error);
        }
      }
      
      // Set language
      if (settings.language) {
        // Find the matching option by comparing language codes
        const languageCode = typeof settings.language === 'string' ? settings.language : settings.language.code;
        for (let option of languageSelect.options) {
          const optionLang = JSON.parse(option.value);
          if (optionLang.code === languageCode) {
            languageSelect.value = option.value;
            initialLanguage = option.value;
            currentLanguage = option.value;
            break;
          }
        }
      }
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Load models for a specific provider
  async function loadModelsForProvider(provider) {
    aiModelSelect.innerHTML = '<option value="">Loading models...</option>';
    aiModelSelect.disabled = true;
    
    try {
      console.log('Loading models for provider:', provider);
      const models = await window.electronAPI.getAvailableModels(provider);
      console.log('Received models:', models);
      
      aiModelSelect.innerHTML = '';
      
      if (models && models.length > 0) {
        // Sort models alphabetically A-Z for easier finding
        models.sort((a, b) => {
          const aName = a.id || a.name || '';
          const bName = b.id || b.name || '';
          return aName.localeCompare(bName);
        });
        
        models.forEach(model => {
          const option = document.createElement('option');
          const modelId = model.id || model.name || 'unknown';
          option.value = modelId;
          option.textContent = modelId;
          aiModelSelect.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models available (check API key)';
        aiModelSelect.appendChild(option);
      }
      
      aiModelSelect.disabled = false;
    } catch (error) {
      console.error('Error loading models:', error);
      aiModelSelect.innerHTML = '<option value="">Error loading models</option>';
      aiModelSelect.disabled = false;
    }
  }

  // Track changes to show/hide Save & Quit button
  function checkForChanges() {
    const providerChanged = currentProvider !== initialProvider;
    const modelChanged = currentModel !== initialModel;
    const languageChanged = currentLanguage !== initialLanguage;
    const requiresRestart = providerChanged || modelChanged || languageChanged;
    
    console.log('Checking for changes:', {
      providerChanged,
      modelChanged,
      languageChanged,
      requiresRestart,
      current: { provider: currentProvider, model: currentModel, language: currentLanguage },
      initial: { provider: initialProvider, model: initialModel, language: initialLanguage }
    });
    
    if (requiresRestart) {
      saveBtn.style.display = 'none';
      saveQuitBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'block';
      saveQuitBtn.style.display = 'none';
    }
  }

  // Handle AI provider selection change
  aiProviderSelect.addEventListener('change', async function() {
    currentProvider = aiProviderSelect.value;
    console.log('AI provider changed to:', currentProvider);
    
    // Load models for the new provider
    await loadModelsForProvider(currentProvider);
    
    // Reset model selection since provider changed
    currentModel = null;
    
    checkForChanges();
  });

  // Handle AI model selection change
  aiModelSelect.addEventListener('change', function() {
    currentModel = aiModelSelect.value;
    console.log('AI model changed to:', currentModel);
    checkForChanges();
  });

  // Handle language selection change
  languageSelect.addEventListener('change', function() {
    currentLanguage = languageSelect.value;
    console.log('Language changed to:', currentLanguage);
    checkForChanges();
  });

  // Handle cancel button
  cancelBtn.addEventListener('click', function() {
    console.log('Cancel button clicked');
    
    try {
      console.log('Sending cancelSettings to main process...');
      window.electronAPI.cancelSettings();
      console.log('cancelSettings sent successfully');
    } catch (error) {
      console.error('Error sending cancelSettings:', error);
    }
  });

  // Handle save button
  saveBtn.addEventListener('click', function() {
    console.log('Save button clicked');
    saveSettings(false);
  });

  // Handle save & quit button
  saveQuitBtn.addEventListener('click', function() {
    console.log('Save & Quit button clicked');
    saveSettings(true);
  });

  // Save settings function
  async function saveSettings(shouldQuit) {
    try {
      const settings = {
        aiProvider: currentProvider,
        aiModel: currentModel,
        language: JSON.parse(currentLanguage),
        shouldQuit: shouldQuit
      };
      
      console.log('Saving settings:', settings);
      
      // Send settings to main process
      await window.electronAPI.saveSettings(settings);
      console.log('Settings saved successfully');
      
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Listen for theme changes from main process
  if (window.electronAPI.onSetTheme) {
    console.log('Setting up theme listener...');
    window.electronAPI.onSetTheme((theme) => {
      console.log('Theme changed to:', theme);
      document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
    });
  }

  // Initialize by loading current settings
  loadCurrentSettings();

  console.log('Settings dialog initialization complete');
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Settings dialog error:', e.error);
});
