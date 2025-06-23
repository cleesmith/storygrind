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
  const openrouterKeyGroup = document.getElementById('openrouter-key-group');
  const openrouterKeyInput = document.getElementById('openrouter-key-input');
  const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
  const claudeKeyGroup = document.getElementById('claude-key-group');
  const claudeKeyInput = document.getElementById('claude-key-input');
  const toggleClaudeKeyVisibility = document.getElementById('toggle-claude-key-visibility');
  const openaiKeyGroup = document.getElementById('openai-key-group');
  const openaiKeyInput = document.getElementById('openai-key-input');
  const toggleOpenaiKeyVisibility = document.getElementById('toggle-openai-key-visibility');
  const geminiKeyGroup = document.getElementById('gemini-key-group');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const toggleGeminiKeyVisibility = document.getElementById('toggle-gemini-key-visibility');

  console.log('Found elements:', {
    aiProviderSelect: !!aiProviderSelect,
    aiModelSelect: !!aiModelSelect,
    languageSelect: !!languageSelect,
    cancelBtn: !!cancelBtn,
    saveBtn: !!saveBtn,
    saveQuitBtn: !!saveQuitBtn,
    projectsPath: !!projectsPath,
    appPath: !!appPath
  });

  // Track initial values and changes
  let initialProvider = null;
  let initialModel = null;
  let initialLanguage = null;
  let initialOpenRouterKey = null;
  let initialClaudeKey = null;
  let initialOpenaiKey = null;
  let initialGeminiKey = null;
  let currentProvider = null;
  let currentModel = null;
  let currentLanguage = null;
  let currentOpenRouterKey = null;
  let currentClaudeKey = null;
  let currentOpenaiKey = null;
  let currentGeminiKey = null;

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
      if (settings.projectsPath) {
        projectsPath.textContent = settings.projectsPath;
      }
      
      // Set AI provider
      if (settings.aiProvider) {
        aiProviderSelect.value = settings.aiProvider;
        initialProvider = settings.aiProvider;
        currentProvider = settings.aiProvider;
        
        // Show/hide key groups if needed
        await toggleOpenRouterKeyGroup();
        await toggleClaudeKeyGroup();
        await toggleOpenaiKeyGroup();
        await toggleGeminiKeyGroup();
        
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
    const openRouterKeyChanged = currentOpenRouterKey !== initialOpenRouterKey;
    const claudeKeyChanged = currentClaudeKey !== initialClaudeKey;
    const openaiKeyChanged = currentOpenaiKey !== initialOpenaiKey;
    const geminiKeyChanged = currentGeminiKey !== initialGeminiKey;
    const requiresRestart = providerChanged || modelChanged || languageChanged || openRouterKeyChanged || claudeKeyChanged || openaiKeyChanged || geminiKeyChanged;
    
    console.log('Checking for changes:', {
      providerChanged,
      modelChanged,
      languageChanged,
      openRouterKeyChanged,
      requiresRestart,
      current: { provider: currentProvider, model: currentModel, language: currentLanguage, openRouterKey: currentOpenRouterKey },
      initial: { provider: initialProvider, model: initialModel, language: initialLanguage, openRouterKey: initialOpenRouterKey }
    });
    
    if (requiresRestart) {
      saveBtn.style.display = 'none';
      saveQuitBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'block';
      saveQuitBtn.style.display = 'none';
    }
  }

  // Show/hide OpenRouter key group based on provider selection
  async function toggleOpenRouterKeyGroup() {
    if (currentProvider === 'openrouter') {
      openrouterKeyGroup.style.display = 'block';
      // Check if key exists and show masked version
      await loadExistingOpenRouterKey();
    } else {
      openrouterKeyGroup.style.display = 'none';
    }
  }

  // Show/hide Claude key group based on provider selection
  async function toggleClaudeKeyGroup() {
    if (currentProvider === 'anthropic') {
      claudeKeyGroup.style.display = 'block';
      // Check if key exists and show masked version
      await loadExistingClaudeKey();
    } else {
      claudeKeyGroup.style.display = 'none';
    }
  }

  // Show/hide OpenAI key group based on provider selection
  async function toggleOpenaiKeyGroup() {
    if (currentProvider === 'openai') {
      openaiKeyGroup.style.display = 'block';
      // Check if key exists and show masked version
      await loadExistingOpenaiKey();
    } else {
      openaiKeyGroup.style.display = 'none';
    }
  }

  // Show/hide Gemini key group based on provider selection
  async function toggleGeminiKeyGroup() {
    if (currentProvider === 'gemini') {
      geminiKeyGroup.style.display = 'block';
      // Check if key exists and show masked version
      await loadExistingGeminiKey();
    } else {
      geminiKeyGroup.style.display = 'none';
    }
  }

  // Load existing OpenRouter key (masked) if it exists
  async function loadExistingOpenRouterKey() {
    try {
      const hasKey = await window.electronAPI.hasOpenRouterKey();
      if (hasKey) {
        openrouterKeyInput.placeholder = '••••••••••••••••••••••••••••••••••••••••';
        openrouterKeyInput.value = '';
        initialOpenRouterKey = 'EXISTS'; // Mark that key exists
        currentOpenRouterKey = 'EXISTS';
      } else {
        openrouterKeyInput.placeholder = 'Enter API key...';
        initialOpenRouterKey = null;
        currentOpenRouterKey = null;
      }
    } catch (error) {
      console.error('Error checking for existing key:', error);
    }
  }

  // Load existing Claude key (masked) if it exists
  async function loadExistingClaudeKey() {
    try {
      const hasKey = await window.electronAPI.hasClaudeKey();
      if (hasKey) {
        claudeKeyInput.placeholder = '••••••••••••••••••••••••••••••••••••••••';
        claudeKeyInput.value = '';
        initialClaudeKey = 'EXISTS'; // Mark that key exists
        currentClaudeKey = 'EXISTS';
      } else {
        claudeKeyInput.placeholder = 'Enter API key...';
        initialClaudeKey = null;
        currentClaudeKey = null;
      }
    } catch (error) {
      console.error('Error checking for existing Claude key:', error);
    }
  }

  // Load existing OpenAI key (masked) if it exists
  async function loadExistingOpenaiKey() {
    try {
      const hasKey = await window.electronAPI.hasOpenaiKey();
      if (hasKey) {
        openaiKeyInput.placeholder = '••••••••••••••••••••••••••••••••••••••••';
        openaiKeyInput.value = '';
        initialOpenaiKey = 'EXISTS'; // Mark that key exists
        currentOpenaiKey = 'EXISTS';
      } else {
        openaiKeyInput.placeholder = 'Enter API key...';
        initialOpenaiKey = null;
        currentOpenaiKey = null;
      }
    } catch (error) {
      console.error('Error checking for existing OpenAI key:', error);
    }
  }

  // Load existing Gemini key (masked) if it exists
  async function loadExistingGeminiKey() {
    try {
      const hasKey = await window.electronAPI.hasGeminiKey();
      if (hasKey) {
        geminiKeyInput.placeholder = '••••••••••••••••••••••••••••••••••••••••';
        geminiKeyInput.value = '';
        initialGeminiKey = 'EXISTS'; // Mark that key exists
        currentGeminiKey = 'EXISTS';
      } else {
        geminiKeyInput.placeholder = 'Enter API key...';
        initialGeminiKey = null;
        currentGeminiKey = null;
      }
    } catch (error) {
      console.error('Error checking for existing Gemini key:', error);
    }
  }

  // Handle AI provider selection change
  aiProviderSelect.addEventListener('change', async function() {
    currentProvider = aiProviderSelect.value;
    console.log('AI provider changed to:', currentProvider);
    
    // Show/hide key inputs
    await toggleOpenRouterKeyGroup();
    await toggleClaudeKeyGroup();
    await toggleOpenaiKeyGroup();
    await toggleGeminiKeyGroup();
    
    // Load models for the new provider
    await loadModelsForProvider(currentProvider);
    
    // Reset model selection since provider changed
    currentModel = null;
    
    checkForChanges();
  });

  // Handle show/hide password toggle
  toggleKeyVisibility.addEventListener('click', async function() {
    if (openrouterKeyInput.type === 'password') {
      // Show the key - load it if it's just dots
      if (!openrouterKeyInput.value && openrouterKeyInput.placeholder.includes('•')) {
        try {
          const apiKey = await window.electronAPI.getOpenRouterKey();
          if (apiKey) {
            openrouterKeyInput.value = apiKey;
          }
        } catch (error) {
          console.error('Error loading API key:', error);
        }
      }
      openrouterKeyInput.type = 'text';
      toggleKeyVisibility.innerHTML = '🙈';
    } else {
      openrouterKeyInput.type = 'password';
      toggleKeyVisibility.innerHTML = '👁️';
    }
  });

  // Handle OpenRouter key input changes
  openrouterKeyInput.addEventListener('input', function() {
    const keyValue = openrouterKeyInput.value.trim();
    if (keyValue) {
      currentOpenRouterKey = keyValue;
    } else {
      // If they clear the field, revert to initial state
      currentOpenRouterKey = initialOpenRouterKey;
    }
    checkForChanges();
  });

  // Handle Claude key show/hide toggle
  toggleClaudeKeyVisibility.addEventListener('click', async function() {
    if (claudeKeyInput.type === 'password') {
      // Show the key - load it if it's just dots
      if (!claudeKeyInput.value && claudeKeyInput.placeholder.includes('•')) {
        try {
          const apiKey = await window.electronAPI.getClaudeKey();
          if (apiKey) {
            claudeKeyInput.value = apiKey;
          }
        } catch (error) {
          console.error('Error loading Claude API key:', error);
        }
      }
      claudeKeyInput.type = 'text';
      toggleClaudeKeyVisibility.innerHTML = '🙈';
    } else {
      claudeKeyInput.type = 'password';
      toggleClaudeKeyVisibility.innerHTML = '👁️';
    }
  });

  // Handle Claude key input changes
  claudeKeyInput.addEventListener('input', function() {
    const keyValue = claudeKeyInput.value.trim();
    if (keyValue) {
      currentClaudeKey = keyValue;
    } else {
      // If they clear the field, revert to initial state
      currentClaudeKey = initialClaudeKey;
    }
    checkForChanges();
  });

  // Handle OpenAI key show/hide toggle
  toggleOpenaiKeyVisibility.addEventListener('click', async function() {
    if (openaiKeyInput.type === 'password') {
      // Show the key - load it if it's just dots
      if (!openaiKeyInput.value && openaiKeyInput.placeholder.includes('•')) {
        try {
          const apiKey = await window.electronAPI.getOpenaiKey();
          if (apiKey) {
            openaiKeyInput.value = apiKey;
          }
        } catch (error) {
          console.error('Error loading OpenAI API key:', error);
        }
      }
      openaiKeyInput.type = 'text';
      toggleOpenaiKeyVisibility.innerHTML = '🙈';
    } else {
      openaiKeyInput.type = 'password';
      toggleOpenaiKeyVisibility.innerHTML = '👁️';
    }
  });

  // Handle OpenAI key input changes
  openaiKeyInput.addEventListener('input', function() {
    const keyValue = openaiKeyInput.value.trim();
    if (keyValue) {
      currentOpenaiKey = keyValue;
    } else {
      // If they clear the field, revert to initial state
      currentOpenaiKey = initialOpenaiKey;
    }
    checkForChanges();
  });

  // Handle Gemini key show/hide toggle
  toggleGeminiKeyVisibility.addEventListener('click', async function() {
    if (geminiKeyInput.type === 'password') {
      // Show the key - load it if it's just dots
      if (!geminiKeyInput.value && geminiKeyInput.placeholder.includes('•')) {
        try {
          const apiKey = await window.electronAPI.getGeminiKey();
          if (apiKey) {
            geminiKeyInput.value = apiKey;
          }
        } catch (error) {
          console.error('Error loading Gemini API key:', error);
        }
      }
      geminiKeyInput.type = 'text';
      toggleGeminiKeyVisibility.innerHTML = '🙈';
    } else {
      geminiKeyInput.type = 'password';
      toggleGeminiKeyVisibility.innerHTML = '👁️';
    }
  });

  // Handle Gemini key input changes
  geminiKeyInput.addEventListener('input', function() {
    const keyValue = geminiKeyInput.value.trim();
    if (keyValue) {
      currentGeminiKey = keyValue;
    } else {
      // If they clear the field, revert to initial state
      currentGeminiKey = initialGeminiKey;
    }
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
      // Save OpenRouter key if changed
      if (currentOpenRouterKey && currentOpenRouterKey !== 'EXISTS' && currentOpenRouterKey !== initialOpenRouterKey) {
        console.log('Saving OpenRouter key...');
        await window.electronAPI.saveOpenRouterKey(currentOpenRouterKey);
      }
      
      // Save Claude key if changed
      if (currentClaudeKey && currentClaudeKey !== 'EXISTS' && currentClaudeKey !== initialClaudeKey) {
        console.log('Saving Claude key...');
        await window.electronAPI.saveClaudeKey(currentClaudeKey);
      }
      
      // Save OpenAI key if changed
      if (currentOpenaiKey && currentOpenaiKey !== 'EXISTS' && currentOpenaiKey !== initialOpenaiKey) {
        console.log('Saving OpenAI key...');
        await window.electronAPI.saveOpenaiKey(currentOpenaiKey);
      }
      
      // Save Gemini key if changed
      if (currentGeminiKey && currentGeminiKey !== 'EXISTS' && currentGeminiKey !== initialGeminiKey) {
        console.log('Saving Gemini key...');
        await window.electronAPI.saveGeminiKey(currentGeminiKey);
      }
      
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
