// project-settings.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing project settings dialog...');
  
  // Get elements
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const dialogTitle = document.getElementById('dialog-title');
  const titleInput = document.getElementById('title-input');
  const authorInput = document.getElementById('author-input');
  const povInput = document.getElementById('pov-input');
  const publisherInput = document.getElementById('publisher-input');
  const buyUrlInput = document.getElementById('buy-url-input');
  const copyrightInput = document.getElementById('copyright-input');
  const dedicationInput = document.getElementById('dedication-input');
  const aboutAuthorInput = document.getElementById('about-author-input');
  const backCoverBlurb = document.getElementById('back-cover-blurb');

  console.log('Found elements:', {
    cancelBtn: !!cancelBtn,
    saveBtn: !!saveBtn,
    dialogTitle: !!dialogTitle,
    titleInput: !!titleInput,
    authorInput: !!authorInput,
    povInput: !!povInput,
    publisherInput: !!publisherInput,
    buyUrlInput: !!buyUrlInput,
    copyrightInput: !!copyrightInput,
    dedicationInput: !!dedicationInput,
    aboutAuthorInput: !!aboutAuthorInput,
    backCoverBlurb: !!backCoverBlurb
  });

  // Track current project info
  let projectName = null;
  let projectPath = null;

  // Check if electronAPI is available
  if (!window.electronAPI) {
    console.error('electronAPI not available!');
    return;
  }

  // Load current project and metadata
  async function loadCurrentProject() {
    try {
      console.log('Loading current project from app state...');
      const appState = await window.electronAPI.getCurrentSettings();
      console.log('Received app state:', appState);
      
      // Get current project info from app state
      if (appState.currentProject) {
        projectName = appState.currentProject;
        projectPath = appState.currentProjectPath;
        dialogTitle.textContent = `Project Settings: ${projectName}`;
      } else {
        dialogTitle.textContent = 'Project Settings: No project selected';
        return;
      }
      
      // Load metadata files
      await loadMetadataFiles();
      
    } catch (error) {
      console.error('Error loading project settings:', error);
      dialogTitle.textContent = 'Project Settings: Error loading project';
    }
  }

  // Load metadata from individual text files
  async function loadMetadataFiles() {
    if (!projectName) return;
    
    try {
      console.log('Loading metadata files for project:', projectName);
      
      // Load each metadata file
      const metadataFiles = {
        '_title.txt': titleInput,
        '_author.txt': authorInput,
        '_pov.txt': povInput,
        '_publisher.txt': publisherInput,
        '_buy_url.txt': buyUrlInput,
        '_copyright.txt': copyrightInput,
        '_dedication.txt': dedicationInput,
        '_about_author.txt': aboutAuthorInput,
        '_back_cover_blurb.txt': backCoverBlurb
      };
      
      for (const [filename, inputElement] of Object.entries(metadataFiles)) {
        try {
          const content = await window.electronAPI.readProjectMetadata(projectName, filename);
          if (content !== null) {
            inputElement.value = content;
          }
        } catch (error) {
          console.log(`Metadata file ${filename} not found or empty`);
          // Leave input empty if file doesn't exist
        }
      }
      
    } catch (error) {
      console.error('Error loading metadata files:', error);
    }
  }

  // Save metadata to individual text files
  async function saveMetadataFiles() {
    if (!projectName) {
      console.error('No project selected');
      return false;
    }
    
    try {
      // Save each metadata field to its corresponding file
      const metadataFiles = {
        '_title.txt': titleInput.value.trim(),
        '_author.txt': authorInput.value.trim(),
        '_pov.txt': povInput.value.trim(),
        '_publisher.txt': publisherInput.value.trim(),
        '_buy_url.txt': buyUrlInput.value.trim(),
        '_copyright.txt': copyrightInput.value.trim(),
        '_dedication.txt': dedicationInput.value.trim(),
        '_about_author.txt': aboutAuthorInput.value.trim(),
        '_back_cover_blurb.txt': backCoverBlurb.value.trim()
      };
      
      for (const [filename, content] of Object.entries(metadataFiles)) {
        await window.electronAPI.writeProjectMetadata(projectName, filename, content);
      }
      return true;
    } catch (error) {
      console.error('Error saving metadata files:', error);
      return false;
    }
  }

  // Handle cancel button
  cancelBtn.addEventListener('click', function() {
    console.log('Cancel button clicked');
    
    try {
      console.log('Sending cancelProjectSettings to main process...');
      window.electronAPI.cancelProjectSettings();
      console.log('cancelProjectSettings sent successfully');
    } catch (error) {
      console.error('Error sending cancelProjectSettings:', error);
    }
  });

  // Handle save button
  saveBtn.addEventListener('click', async function() {
    // Disable save button to prevent double-clicking
    saveBtn.disabled = true;
    
    try {
      const success = await saveMetadataFiles();
      if (success) {
        // Close the dialog
        window.electronAPI.closeProjectSettings();
      } else {
        console.error('Failed to save project settings');
      }
    } catch (error) {
      console.error('Error saving project settings:', error);
    } finally {
      // Re-enable save button
      saveBtn.disabled = false;
    }
  });

  // Listen for theme changes from main process
  if (window.electronAPI.onSetTheme) {
    window.electronAPI.onSetTheme((theme) => {
      document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
    });
  }

  // Initialize by loading current project
  loadCurrentProject();
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Project settings dialog error:', e.error);
});
