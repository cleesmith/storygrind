// welcome-screen.js

console.log('Welcome screen JavaScript loading...');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing welcome screen...');
  
  // Get elements
  const providerOptions = document.querySelectorAll('.provider-option');
  const continueBtn = document.getElementById('continue-btn');
  const skipBtn = document.getElementById('skip-setup-btn');

  console.log('Found elements:', {
    providerOptions: providerOptions.length,
    continueBtn: !!continueBtn,
    skipBtn: !!skipBtn
  });

  let selectedProvider = null;

  // Check if electronAPI is available
  if (!window.electronAPI) {
    console.error('electronAPI not available!');
    return;
  }

  // Handle provider selection
  providerOptions.forEach((option, index) => {
    console.log(`Setting up provider option ${index}:`, option.dataset.provider);
    
    option.addEventListener('click', function() {
      console.log('Provider clicked:', option.dataset.provider);
      
      // Remove selected class from all options
      providerOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Get selected provider
      selectedProvider = option.dataset.provider;
      
      console.log('Selected AI provider:', selectedProvider);
      
      // Enable continue button
      continueBtn.disabled = false;
      const providerNames = {
        'gemini': 'Gemini',
        'openai': 'OpenAI', 
        'claude': 'Claude'
      };
      continueBtn.textContent = `Continue with ${providerNames[selectedProvider]}`;
      
      console.log('Continue button enabled, text updated');
    });
  });

  // Handle continue button
  continueBtn.addEventListener('click', function() {
    console.log('Continue button clicked, selected AI provider:', selectedProvider);
    
    if (selectedProvider) {
      try {
        console.log('Sending setApiProvider to main process...');
        // Send selection to main process
        window.electronAPI.setApiProvider(selectedProvider);
        console.log('setApiProvider sent successfully');
      } catch (error) {
        console.error('Error sending setApiProvider:', error);
      }
    } else {
      console.warn('No provider selected when continue clicked');
    }
  });

  // Handle cancel/skip button
  skipBtn.addEventListener('click', function() {
    console.log('Cancel button clicked');
    
    try {
      console.log('Sending cancelProviderSelection to main process...');
      // Send cancel to main process
      window.electronAPI.cancelProviderSelection();
      console.log('cancelProviderSelection sent successfully');
    } catch (error) {
      console.error('Error sending cancelProviderSelection:', error);
    }
  });

  // Listen for theme changes from main process
  if (window.electronAPI.onSetTheme) {
    console.log('Setting up theme listener...');
    window.electronAPI.onSetTheme((theme) => {
      console.log('Theme changed to:', theme);
      document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
    });
  }

  console.log('Welcome screen initialization complete');
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Welcome screen error:', e.error);
});

console.log('Welcome screen JavaScript loaded');
