// Define path functions for filename extraction
const path = {
  basename: function(filepath) {
    // Simple implementation to extract filename from path
    return filepath.split(/[\/\\]/).pop();
  }
};

// Get UI elements
const toolNameElement = document.getElementById('tool-name');
const dialogToolNameElement = document.getElementById('dialog-tool-name');
const closeBtn = document.getElementById('close-btn');
const setupBtn = document.getElementById('setup-btn');
const runBtn = document.getElementById('run-btn');
const editBtn = document.getElementById('edit-btn');
const toolSelectElement = document.getElementById('tool-select');
const clearBtn = document.getElementById('clear-btn');
const forceQuitBtn = document.getElementById('force-quit-btn');
const outputElement = document.getElementById('output');
const elapsedTimeElement = document.getElementById('elapsed-time');

// Dialog elements
const setupDialogOverlay = document.getElementById('setup-dialog-overlay');
const setupDialogClose = document.getElementById('setup-dialog-close');
const setupDialogCancel = document.getElementById('setup-dialog-cancel');
const setupDialogApply = document.getElementById('setup-dialog-apply');
const dialogOptionsContainer = document.getElementById('dialog-options-container');

// Tool state
let toolData = null;
let currentToolOptions = [];
let isRunning = false;
let startTime = null;
let timerInterval = null;
let currentRunId = null;
let setupCompleted = false;
let currentOptionValues = {};
let canClose = true; // Flag to control whether the window can be closed

window.addEventListener('DOMContentLoaded', async () => {
  // Get tool info from main process
  try {
    toolData = await window.electronAPI.getCurrentTool();
    
    if (toolData) {
      // Log what we're receiving for debugging
      console.log("Current tool data:", toolData);
      
      // Set tool name in both main view and dialog
      toolNameElement.textContent = toolData.title || toolData.name;
      dialogToolNameElement.textContent = toolData.title || toolData.name;
      document.title = `storygrind - ${toolData.title || toolData.name}`;
      
      // Get tool options - wrap in try/catch to prevent hanging
      try {
        currentToolOptions = await window.electronAPI.getToolOptions(toolData.name);
        console.log('Loaded tool options:', currentToolOptions);
        
        // Disable Run button until setup is completed
        runBtn.disabled = true;
      } catch (optionsError) {
        console.error('Error loading tool options:', optionsError);
        outputElement.textContent = `Error loading tool options: ${optionsError.message}`;
        // Add fallback for tool options to prevent UI hanging
        currentToolOptions = [];
      }
    } else {
      outputElement.textContent = 'Error: No tool selected!';
    }
  } catch (error) {
    console.error('Error loading tool data:', error);
    outputElement.textContent = `Error loading tool: ${error.message}`;
  }
  
  // Apply theme if one is set
  window.electronAPI.onSetTheme((theme) => {
    document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
  });
});

// Edit button handler
editBtn.addEventListener('click', () => {
  const selectedFile = toolSelectElement.value;
  if (selectedFile) {
    window.electronAPI.openFileInEditor(selectedFile)
      .then(result => {
        if (!result.success) {
          outputElement.textContent += '\nError opening file: ' + (result.error || 'Unknown error');
        }
      })
      .catch(error => {
        console.error('Error opening file in editor:', error);
        outputElement.textContent += '\nError opening file: ' + error.message;
      });
  } else {
    // Check which tool was run and handle accordingly
    if (toolData && toolData.name) {
      console.log('Tool that was run:', toolData.name);
      if (toolData.name === 'manuscript_to_epub') {
        outputElement.textContent += '\nWarning: EPUB files are not editable in text editor.\n';
        return; // Don't try to open .epub files
      }
    }
    outputElement.textContent += '\nPlease select a file to edit from the dropdown.\n';
  }
});

// File select dropdown handler (no action needed - just for selection)

// Close button handler
closeBtn.addEventListener('click', () => {
  // Check if we're allowed to close while tool is running
  if (!canClose && isRunning) {
    outputElement.textContent += '\nCannot close while tool is running. Use Force Quit if necessary.\n';
    return;
  }

  // Before closing, stop any running tool
  if (isRunning && currentRunId) {
    window.electronAPI.stopTool(currentRunId)
      .then(() => {
        window.electronAPI.closeToolDialog('cancelled');
      })
      .catch(error => {
        console.error('Error stopping tool:', error);
        window.electronAPI.closeToolDialog('cancelled');
      });
  } else {
    window.electronAPI.closeToolDialog('cancelled');
  }
});

// Force Quit button handler - always enabled and immediately quits the app
forceQuitBtn.addEventListener('click', () => {
  console.log('Force quit requested');
  window.electronAPI.quitApp();
});

// Setup button handler - now opens the setup dialog
setupBtn.addEventListener('click', async () => {
  try {
    if (!toolData || !toolData.name) {
      outputElement.textContent = "Error: Unable to setup tool - missing tool data";
      return;
    }

    // update options after clicking Setup button for multiple Run's:
    currentToolOptions = await window.electronAPI.getToolOptions(toolData.name);
    
    // Generate form controls for options
    await generateOptionsForm(currentToolOptions || []);
    
    // Show the dialog
    showSetupDialog();
  } catch (error) {
    console.error("Error in setup button handler:", error);
    outputElement.textContent = `Setup error: ${error.message}`;
  }
});

// Setup dialog close button
setupDialogClose.addEventListener('click', () => {
  hideSetupDialog();
});

// Setup dialog cancel button
setupDialogCancel.addEventListener('click', () => {
  hideSetupDialog();
});

// Setup dialog apply button
setupDialogApply.addEventListener('click', () => {
  // Validate the form
  if (!validateOptionsForm()) {
    return; // Don't close dialog if validation fails
  }
  
  // Gather all options from form
  currentOptionValues = gatherOptionValues();
  
  // Display setup information in output area
  outputElement.textContent = `Tool: ${toolData.title || toolData.name}\n\nOptions:\n`;
  
  // Add each option and its value
  for (const [key, value] of Object.entries(currentOptionValues)) {
    outputElement.textContent += `${key}: ${value}\n`;
  }
  
  outputElement.textContent += '\nReady to run. Click the "Run" button to execute.';
  
  // Store the options for the run
  window.electronAPI.setToolOptions(currentOptionValues);
  
  // Enable Run button
  runBtn.disabled = false;
  setupCompleted = true;
  
  // Close the dialog
  hideSetupDialog();
});

// Run button handler
runBtn.addEventListener('click', async () => {
  if (isRunning) {
    outputElement.textContent += '\nTool is already running!';
    return;
  }
  
  if (!setupCompleted) {
    outputElement.textContent += '\nPlease complete Setup first.';
    return;
  }
  
  // Start timing
  startTime = Date.now();
  isRunning = true;
  canClose = false; // Prevent closing the window while tool is running
  startTimer();
  
  // Update UI - disable ALL buttons except Force Quit
  runBtn.disabled = true;
  setupBtn.disabled = true;
  clearBtn.disabled = true;
  closeBtn.disabled = true; // Disable the X close button
  
  // Remove any existing Edit button and select dropdown
  const existingEditButton = document.getElementById('edit-button');
  if (existingEditButton) {
    existingEditButton.remove();
  }
  
  const existingFileSelect = document.getElementById('output-file-select');
  if (existingFileSelect) {
    const container = existingFileSelect.closest('.compact-file-selector');
    if (container) {
      container.remove(); // Remove the entire container
    } else {
      existingFileSelect.remove();
    }
  }
  
  // Clear output and show starting message - clear all previous output
  outputElement.textContent = `Starting: ${toolData.title || toolData.name} ...\n\n`;
  
  try {
    // Remove any previous output listeners to avoid duplicate output
    window.electronAPI.removeAllListeners('tool-output');
    window.electronAPI.removeAllListeners('tool-finished');
    window.electronAPI.removeAllListeners('tool-error');
    
    // Run the tool
    currentRunId = await window.electronAPI.startToolRun(toolData.name, currentOptionValues);
    console.log('Tool started with run ID:', currentRunId);
    
    // Listen for output messages
    window.electronAPI.onToolOutput((data) => {
      // Only append output for the current run
      if (data.runId === currentRunId) {
        // Append output to the output element
        outputElement.textContent += data.text;
        
        // Auto scroll to bottom
        outputElement.scrollTop = outputElement.scrollHeight;
      }
    });

    // Listen for tool completion
    window.electronAPI.onToolFinished((result) => {
      // Only process completion for the current run
      if (result.runId === currentRunId) {
        console.log('Tool finished:', result);
        isRunning = false;
        canClose = true; // Allow closing the window again
        stopTimer();
        
        // Re-enable buttons
        setupBtn.disabled = false;
        clearBtn.disabled = false;
        closeBtn.disabled = false;
        
        // // Check if this tool should show the Edit button
        // // Hide for AI Writing Tools and Non-AI Tools
        // const excludedTools = [
        //   'brainstorm', 'outline_writer', 'world_writer', 'chapter_writer',
        //   'tokens_words_counter'
        // ];
        
        // if (!excludedTools.includes(toolData.name)) {
        //   // Show Edit button and dropdown for non-excluded tools
        //   editBtn.style.display = 'inline-block';
        //   toolSelectElement.style.display = 'inline-block';
        // }
        // Show Edit button and dropdown
        editBtn.style.display = 'inline-block';
        toolSelectElement.style.display = 'inline-block';

        runBtn.disabled = true;
        // Reset setupCompleted flag to require going through setup again
        setupCompleted = false;        

        // Add completion message to output area
        outputElement.textContent += `\n\nTool finished with exit code: ${result.code}`;
        
        // Handle file selector
        if (editBtn.style.display !== 'none') {
          // Clear and populate dropdown
          toolSelectElement.innerHTML = '<option value="">Select file to edit...</option>';
          
          // For User Tools, always add the prompt file
          if ((toolData.isUserCreated || toolData.category === 'User Tools') && toolData.promptPath) {
            const promptOption = document.createElement('option');
            promptOption.value = toolData.promptPath;
            promptOption.textContent = path.basename(toolData.promptPath) + ' (prompt)';
            toolSelectElement.appendChild(promptOption);
          }
          
          // If there are created files, log them and add to dropdown
          if (result.createdFiles && result.createdFiles.length > 0) {
            outputElement.textContent += `\n\nFiles created/modified:`;
            const fileList = document.createElement('pre');
            fileList.style.marginTop = '10px';
            fileList.style.whiteSpace = 'pre-wrap';
            fileList.style.fontSize = '12px';
            fileList.style.color = document.body.classList.contains('light-mode') ? '#666666' : '#aaaaaa';
            
            const fileListItems = result.createdFiles.map(file => `- ${file}`).join('\n');
            fileList.textContent = fileListItems;
            outputElement.appendChild(fileList);
            
            // Add created files to dropdown
            result.createdFiles.forEach(file => {
              const option = document.createElement('option');
              option.value = file;
              option.textContent = path.basename(file);
              toolSelectElement.appendChild(option);
            });
          }
        }

        currentRunId = null;
      }
    });
    
    // Listen for tool errors
    window.electronAPI.onToolError((error) => {
      // Only process errors for the current run
      if (error.runId === currentRunId) {
        console.error('Tool error:', error);
        outputElement.textContent += `\n\nError: ${error.error}`;
        isRunning = false;
        canClose = true; // Allow closing the window again
        stopTimer();
        
        // Re-enable buttons
        runBtn.disabled = false;
        setupBtn.disabled = false;
        clearBtn.disabled = false;
        closeBtn.disabled = false;
        
        currentRunId = null;
      }
    });
  } catch (error) {
    // Handle errors
    console.error('Error running tool:', error);
    outputElement.textContent += `\nError running tool: ${error.message}`;
    isRunning = false;
    canClose = true; // Allow closing the window again
    stopTimer();
    
    // Re-enable buttons
    runBtn.disabled = false;
    setupBtn.disabled = false;
    clearBtn.disabled = false;
    closeBtn.disabled = false;
  }
});

// Clear button handler - updated to reset elapsed time and disable Run button
clearBtn.addEventListener('click', () => {
  // Clear output area
  outputElement.textContent = 'Output cleared.';
  
  // Reset elapsed time display
  elapsedTimeElement.textContent = 'elapsed: 0m 0s';
  
  // Reset timer variables
  startTime = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Hide Edit button and tool select dropdown
  editBtn.style.display = 'none';
  toolSelectElement.style.display = 'none';
  
  // Remove any existing Edit button and file select dropdown
  const existingEditButton = document.getElementById('edit-button');
  if (existingEditButton) {
    existingEditButton.remove();
  }
  
  const existingFileSelect = document.getElementById('output-file-select');
  if (existingFileSelect) {
    const container = existingFileSelect.closest('.compact-file-selector');
    if (container) {
      container.remove(); // Remove the entire container
    } else {
      existingFileSelect.remove();
    }
  }
  
  // Disable Run button until setup is completed again
  runBtn.disabled = true;
  setupCompleted = false;
});

// Show the setup dialog
function showSetupDialog() {
  setupDialogOverlay.style.display = 'flex';
}

// Hide the setup dialog
function hideSetupDialog() {
  setupDialogOverlay.style.display = 'none';
}

// Generate form controls for tool options
async function generateOptionsForm(options) {
  try {
    dialogOptionsContainer.innerHTML = '';
    
    if (!options || options.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'This tool has no configurable options.';
      dialogOptionsContainer.appendChild(emptyMessage);
      return;
    }
    
    for (const option of options) {
      try {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        // only create labels and descriptions for non-boolean fields
        if (option.type !== 'boolean') {
          // Create label
          const label = document.createElement('label');
          label.setAttribute('for', `option-${option.name}`);
          label.textContent = option.label || option.name;
          formGroup.appendChild(label);
          
          // Add description if available
          if (option.description) {
            const description = document.createElement('p');
            description.className = 'option-description';
            description.textContent = option.description;
            formGroup.appendChild(description);
          }
        }

        // Create input based on type
        let input;
        
        switch (option.type) {
          case 'boolean':
            // Remove any previously created label element
            if (formGroup.querySelector('label')) {
              formGroup.removeChild(formGroup.querySelector('label'));
            }
            
            // Create a simple wrapper for the checkbox and label
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'checkbox-wrapper';
            
            // Create the checkbox input
            input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.checked = option.default === true;
            
            // Create the label that will appear next to the checkbox
            const checkboxLabel = document.createElement('label');
            checkboxLabel.setAttribute('for', `option-${option.name}`);
            checkboxLabel.textContent = option.label;
            checkboxLabel.className = 'checkbox-label';
            
            // Add the checkbox and label to the wrapper
            checkboxWrapper.appendChild(input);
            checkboxWrapper.appendChild(checkboxLabel);
            
            // Add the wrapper to the form group
            formGroup.appendChild(checkboxWrapper);

            // Add description if available
            if (option.description) {
              const description = document.createElement('p');
              description.className = 'option-description';
              description.textContent = option.description;
              formGroup.appendChild(description);
            }
            break;

          case 'number':
            input = document.createElement('input');
            input.type = 'number';
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.value = option.default !== undefined ? option.default : '';
            
            if (option.min !== undefined) input.min = option.min;
            if (option.max !== undefined) input.max = option.max;
            if (option.step !== undefined) input.step = option.step;
            
            formGroup.appendChild(input);
            break;
            
          case 'select':
            input = document.createElement('select');
            input.id = `option-${option.name}`;
            input.name = option.name;
            
            // Special handling for language options - use language from Electron Store as default
            let defaultValue = option.default;
            if (option.name === 'lang') {
              try {
                const currentSettings = await window.electronAPI.getCurrentSettings();
                if (currentSettings && currentSettings.language && currentSettings.language.name) {
                  defaultValue = currentSettings.language.name;
                }
              } catch (error) {
                console.warn('Could not load language setting from store:', error);
                // Keep original default if settings fail to load
              }
            }
            
            if (option.choices && Array.isArray(option.choices)) {
              option.choices.forEach(choice => {
                const optionEl = document.createElement('option');
                optionEl.value = choice.value;
                optionEl.textContent = choice.label || choice.value;
                
                if (defaultValue === choice.value) {
                  optionEl.selected = true;
                }
                
                input.appendChild(optionEl);
              });
            }
            
            formGroup.appendChild(input);
            break;
            
          case 'file':
            const fileContainer = document.createElement('div');
            fileContainer.className = 'file-input-container';
            
            input = document.createElement('input');
            input.type = 'text';
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.value = option.default || '';
            input.readOnly = true;
            
            const browseBtn = document.createElement('button');
            browseBtn.type = 'button';
            browseBtn.textContent = 'Browse...';
            browseBtn.className = 'browse-button';

            // File selection handler with better error handling
            browseBtn.addEventListener('click', async (event) => {
              // Prevent default to ensure the event is properly handled
              event.preventDefault();
              event.stopPropagation();
              
              try {
                // Get current tool name for DOCX filtering
                const currentToolName = toolData ? toolData.name : '';
                const isDocxExtractorTool = currentToolName === 'docx_comments';
                
                // Default filters or use option's filters
                let filters = option.filters || [{ name: 'All Files', extensions: ['*'] }];
                
                // If this is NOT the docx comments tool and filters include .docx,
                // remove .docx from the allowed extensions
                if (!isDocxExtractorTool) {
                  filters = filters.map(filter => {
                    // If this filter includes docx, create a new filter without it
                    if (filter.extensions && filter.extensions.includes('docx')) {
                      return {
                        name: filter.name,
                        extensions: filter.extensions.filter(ext => ext !== 'docx')
                      };
                    }
                    return filter;
                  });
                  
                  // Remove any empty extension arrays
                  filters = filters.filter(filter => 
                    filter.extensions && filter.extensions.length > 0
                  );
                  
                  // Ensure we still have at least one filter
                  if (filters.length === 0) {
                    filters = [{ name: 'Text Files', extensions: ['txt'] }];
                  }
                }
                
                console.log('Using filters:', filters);
                
                const filePath = await window.electronAPI.selectFile({
                  title: `Select ${option.label || option.name}`,
                  filters: filters
                });
                
                console.log('Selected file path:', filePath);
                
                if (filePath) {
                  input.value = filePath;
                  
                  // Trigger a change event to ensure validation recognizes the new value
                  const changeEvent = new Event('change', { bubbles: true });
                  input.dispatchEvent(changeEvent);
                  
                  // Clear any error message
                  const errorElement = document.getElementById(`error-${option.name}`);
                  if (errorElement) {
                    errorElement.style.display = 'none';
                  }
                }
              } catch (error) {
                console.error('Error selecting file:', error);
                outputElement.textContent += `\nError selecting file: ${error.message}\n`;
              }
            });
            
            fileContainer.appendChild(input);
            fileContainer.appendChild(browseBtn);
            formGroup.appendChild(fileContainer);
            break;
            
          case 'directory':
            const dirContainer = document.createElement('div');
            dirContainer.className = 'file-input-container';
            
            input = document.createElement('input');
            input.type = 'text';
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.value = option.default || '';
            input.readOnly = true;
            
            const browseDirBtn = document.createElement('button');
            browseDirBtn.type = 'button';
            browseDirBtn.textContent = 'Browse...';
            browseDirBtn.className = 'browse-button';
            
            browseDirBtn.addEventListener('click', async (event) => {
              event.preventDefault();
              event.stopPropagation();
              
              try {
                const dirPath = await window.electronAPI.selectDirectory({
                  title: `Select ${option.label || option.name}`
                });
                
                console.log('Selected directory path:', dirPath);
                
                if (dirPath) {
                  input.value = dirPath;
                  
                  // Trigger change event
                  const changeEvent = new Event('change', { bubbles: true });
                  input.dispatchEvent(changeEvent);
                  
                  // Clear any error message
                  const errorElement = document.getElementById(`error-${option.name}`);
                  if (errorElement) {
                    errorElement.style.display = 'none';
                  }
                }
              } catch (error) {
                console.error('Error selecting directory:', error);
                outputElement.textContent += `\nError selecting directory: ${error.message}\n`;
              }
            });
            
            dirContainer.appendChild(input);
            dirContainer.appendChild(browseDirBtn);
            formGroup.appendChild(dirContainer);
            break;
            
          case 'textarea':
            input = document.createElement('textarea');
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.rows = option.rows || 4;
            input.value = option.default || '';
            formGroup.appendChild(input);
            break;
            
          case 'text':
          default:
            input = document.createElement('input');
            input.type = 'text';
            input.id = `option-${option.name}`;
            input.name = option.name;
            input.value = option.default || '';
            formGroup.appendChild(input);
            break;
        }
        
        // Special handling for save_dir option
        if (option.name === 'save_dir') {
          // Get current project path from main process
          window.electronAPI.getProjectInfo()
            .then(info => {
              if (info && info.current_project_path) {
                // Set the input value to the project path
                input.value = info.current_project_path;
                console.log('*** Set save_dir default to:', info.current_project_path);
                
                // Also update our stored options
                if (currentOptionValues) {
                  currentOptionValues[option.name] = info.current_project_path;
                }
              }
            })
            .catch(error => console.error('Error fetching project info:', error));
        }
        
        // Add error message container
        const errorMessage = document.createElement('div');
        errorMessage.id = `error-${option.name}`;
        errorMessage.className = 'error-message';
        errorMessage.style.display = 'none';
        formGroup.appendChild(errorMessage);
        
        // Add required attribute if specified
        if (option.required) {
          input.dataset.required = 'true';
          
          // Add input validation event
          input.addEventListener('change', () => {
            validateInput(input, errorMessage, option);
          });
          
          input.addEventListener('blur', () => {
            validateInput(input, errorMessage, option);
          });
        }
        
        // Add the form group to the container
        dialogOptionsContainer.appendChild(formGroup);
      } catch (optionError) {
        // Handle errors for individual options
        console.error(`Error creating option ${option.name}:`, optionError);
        
        // Add an error message to the form
        const errorElement = document.createElement('div');
        errorElement.style.color = 'red';
        errorElement.textContent = `Error loading option ${option.name}: ${optionError.message}`;
        dialogOptionsContainer.appendChild(errorElement);
      }
    }
  } catch (formError) {
    // Handle overall form generation errors
    console.error("Error generating options form:", formError);
    
    // Clear and show error
    dialogOptionsContainer.innerHTML = '';
    const errorMessage = document.createElement('p');
    errorMessage.style.color = 'red';
    errorMessage.textContent = `Failed to create options form: ${formError.message}`;
    dialogOptionsContainer.appendChild(errorMessage);
  }
}

function validateInput(input, errorElement, option) {
  if (option.required && !input.value.trim()) {
    errorElement.textContent = 'This field is required';
    errorElement.style.display = 'block';
    return false;
  } 
  
  // Add number validation:
  if (option.type === 'number') {
    const value = parseFloat(input.value);
    if (!isNaN(value)) {
      if (option.min !== undefined && value < option.min) {
        errorElement.textContent = `Value must be at least ${option.min}`;
        errorElement.style.display = 'block';
        return false;
      }
      
      if (option.max !== undefined && value > option.max) {
        errorElement.textContent = `Value must be at most ${option.max}`;
        errorElement.style.display = 'block';
        return false;
      }
    }
  }
  
  errorElement.style.display = 'none';
  return true;
}

// Validate the options form
function validateOptionsForm() {
  let isValid = true;
  
  currentToolOptions.forEach(option => {
    if (option.required) {
      const input = document.getElementById(`option-${option.name}`);
      const errorElement = document.getElementById(`error-${option.name}`);
      
      if (!input.value.trim()) {
        errorElement.textContent = 'This field is required';
        errorElement.style.display = 'block';
        isValid = false;
      } else {
        errorElement.style.display = 'none';
      }
    }
  });
  
  return isValid;
}

// Gather all option values from the form
function gatherOptionValues() {
  const values = {};
  
  currentToolOptions.forEach(option => {
    const inputElement = document.getElementById(`option-${option.name}`);
    
    if (inputElement) {
      if (option.type === 'boolean') {
        values[option.name] = inputElement.checked;
      } else if (option.type === 'number') {
        values[option.name] = inputElement.value ? parseFloat(inputElement.value) : '';
      } else {
        values[option.name] = inputElement.value;
      }
    }
  });
  
  return values;
}

// Timer functions
function startTimer() {
  // Update immediately
  updateElapsedTime();
  
  // Then update every second
  timerInterval = setInterval(updateElapsedTime, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateElapsedTime() {
  if (!startTime) return;
  
  const currentTime = Date.now();
  const elapsedMs = currentTime - startTime;
  
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  
  elapsedTimeElement.textContent = `elapsed: ${minutes}m ${seconds}s`;
}
