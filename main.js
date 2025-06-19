// main.js
const { app, BrowserWindow, Menu, ipcMain, dialog, screen, shell } = require('electron');

const path = require('path');
const fs = require('fs');
const os = require('os');

require('dotenv').config({ path: require('os').homedir() + '/.env' });

const { v4: uuidv4 } = require('uuid');
const appState = require('./state.js');
const toolSystem = require('./tool-system');
const fileCache = require('./file-cache');
const promptManager = require('./tool-prompts-manager');

const homeDir = os.homedir();
const envFilePath = path.join(homeDir, '.env');
// console.log(`envFilePath:`);
// console.dir(envFilePath);

let mainWindow = null;

let editorDialogWindow = null;

let welcomeWindow = null;

let settingsWindow = null;

// Declare AiApiServiceInstance at a scope accessible by 
// initializeApp and IPC handlers
let AiApiServiceInstance = null;

// Determine if we're running in packaged mode
const isPackaged = app.isPackaged || !process.defaultApp;

// Configure paths for packaged application
if (isPackaged) {
  // console.log('Running in packaged mode');
  
  // Get the Resources path where our app is located
  const resourcesPath = path.join(app.getAppPath(), '..');
  // console.log(`Resources path: ${resourcesPath}`);
  
  // Ensure the current working directory is correct
  try {
    // Set working directory to the app's root
    process.chdir(app.getAppPath());
    // console.log(`Set working directory to: ${process.cwd()}`);
  } catch (error) {
    console.error('Failed to set working directory:', error);
  }
  
  // Explicitly expose the location of tools to global scope
  global.TOOLS_DIR = app.getAppPath();
  // console.log(`Set global TOOLS_DIR to: ${global.TOOLS_DIR}`);
} else {
  // console.log('Running in development mode');
  global.TOOLS_DIR = path.join(__dirname);
  // console.log(`Set global TOOLS_DIR to: ${global.TOOLS_DIR}`);
}



// The ONLY ONE "whenReady" that does everything in proper sequence
app.whenReady().then(() => {
  // 1. Set App User Model ID first
  app.setAppUserModelId("com.slipthetrap.storygrind");
  
  // 2. Register DevTools shortcut
  const { globalShortcut } = require('electron');
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.openDevTools();
    }
  });
  
  // 3. Initialize the app
  initializeApp();
});

async function ensureEssentialPathsExist() {
  const writingDir = appState.PROJECTS_DIR;
  const envExists = fs.existsSync(envFilePath);
  const writingDirExists = fs.existsSync(writingDir);
  
  // console.log('Checking essential paths for first-time setup or user removed .env or ~/writing_with_storygrind ...');

  // If either .env or ~/writing_with_storygrind is missing, 
  // reset Electron Store to defaults to avoid 
  // previous Project and settings issues
  if (!envExists || !writingDirExists) {
    // console.log('Essential paths missing - resetting Electron Store to defaults');
    if (appState.store) {
      appState.store.clear();
      // console.log('Electron Store cleared due to missing essential paths');
    }
  }

  try {
    // Create .env file if it doesn't exist
    if (!envExists) {
      // console.log('Creating .env file at:', envFilePath);

      // Create empty .env file with helpful comments
      const envContent = `
# storygrind created this on: ${new Date().toLocaleString()}

# Add your AI API key(s), at least one is required, below: 

# 1. uncomment, by deleting the "# " (that's a #space)
# 2. then put your actual api key after that "="
# 3. the keys do not need quotes

# GEMINI_API_KEY=put-yours-here

# OPENAI_API_KEY=put-yours-here

# ANTHROPIC_API_KEY=put-yours-here

# OPENROUTER_API_KEY=put-yours-here

      `;
      
      await fs.promises.writeFile(envFilePath, envContent, 'utf8');
      // console.log('Successfully created .env file');
    } else {
      console.log('.env file already exists');
    }

    // Create ~/writing_with_storygrind directory if it doesn't exist
    if (!writingDirExists) {
      // console.log('Creating writing directory at:', writingDir);
      await fs.promises.mkdir(writingDir, { recursive: true });
      // console.log('Successfully created writing directory');
      
      // Also create the tool-prompts subdirectory
      const toolPromptsDir = path.join(writingDir, 'tool-prompts');
      await fs.promises.mkdir(toolPromptsDir, { recursive: true });
      // console.log('Successfully created tool-prompts directory');
      
    } else {
      console.log('Writing directory already exists');
      
      // Still make sure tool-prompts subdirectory exists
      const toolPromptsDir = path.join(writingDir, 'tool-prompts');
      if (!fs.existsSync(toolPromptsDir)) {
        await fs.promises.mkdir(toolPromptsDir, { recursive: true });
        // console.log('Created missing tool-prompts directory');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating essential paths:', error);
    
    // Log to file if logging is available
    if (typeof global.logToFile === 'function') {
      global.logToFile(`ERROR creating essential paths: ${error.message}`);
    }
    
    // Don't throw the error - we want the app to continue even if this fails
    // Instead, we'll show a warning dialog later if needed
    return false;
  }
}

async function initializeApp() {
  try {
    // FIRST: Ensure essential directories and files exist for new users
    const essentialPathsCreated = await ensureEssentialPathsExist();

    await appState.initialize();

    // Touch the projects directory to update its timestamp (indicates last app start)
    try {
      const now = new Date();
      await fs.promises.utimes(appState.PROJECTS_DIR, now, now);
      // console.log(`Updated timestamp for projects directory: ${appState.PROJECTS_DIR}`);
    } catch (touchError) {
      console.warn('Could not update projects directory timestamp:', touchError);
    }

    // console.log('Current store values:', {
    //   selectedProvider: appState.store.get('selectedApiProvider'),
    //   hasGeminiKey: !!process.env.GEMINI_API_KEY,
    //   hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    //   hasClaudeKey: !!process.env.ANTHROPIC_API_KEY
    // });

    // Check if API provider is configured
    if (!checkApiProviderConfiguration()) {
      createWindow(); // Create main window first
      
      // Initialize tool system without AI service (for non-AI tools)
      try {
        const toolSystemResult = await toolSystem.initializeToolSystem(null);
        AiApiServiceInstance = toolSystemResult.AiApiService; // Will be null for non-AI setup
        // console.log('Tool system initialized without AI service - non-AI tools available');
      } catch (err) {
        console.error('Error initializing tool system without AI:', err);
      }
      
      setupIPCHandlers(); // Set up handlers so welcome screen can communicate
      setTimeout(() => {
        createWelcomeScreen(); // Show welcome screen
      }, 500);
      return; // Don't continue with AI initialization
    }

    // Initialize tool system and get the AiApiService instance
    const toolSystemResult = await toolSystem.initializeToolSystem(getCompleteApiSettings());

    AiApiServiceInstance = toolSystemResult.AiApiService;

    // Initialize tool-prompts manager and create default prompts
    try {
      await promptManager.ensurePromptsDirectory();
      // console.log('Tool prompts directory initialized');
      await promptManager.initializeAllPrompts();
    } catch (err) {
      console.error('Error initializing tool prompts directory:', err);
    }

    // Setup IPC handlers
    setupIPCHandlers();
    
    // Create the main application window
    createWindow();

    // Check for API key verification (only if we have an API service)
    if (AiApiServiceInstance) {
      const verifiedAiAPI = await AiApiServiceInstance.verifyAiAPI();

      if (!verifiedAiAPI) {
          if (mainWindow && !mainWindow.isDestroyed()) {

              dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'API Key Issue',
                  message: 'Connection failed: API key not found or invalid.',
                  detail: `To use AI-powered tools, your API key needs to be configured.\n\n` +
                          `- click 'OK' to continue using storygrind.\nAI features will be unavailable or may cause errors until the api key is set.\nHowever, non-AI based Tools are available for use.\n\n` +
                          `- click 'Quit then Edit .env file' to open the .env configuration file.\nstorygrind will then quit.\nYour default text editor should appear.\nAfter adding/changing your key, please start the app again.\n` +
                          `\nYou may do this manually:\nThe .env file must be located here:\n${envFilePath}\nOpen .env in a text editor (Notepad/Textedit), then add the appropriate line and replace with your actual api key, then save and quit the editor, then start the storygrind again.`,
                  buttons: ['OK', 'Quit then Edit .env file'],
                  defaultId: 0,
                  cancelId: 0
              }).then(async ({ response }) => {
                  if (response === 1) {
                      try {
                          let envFileExisted = fs.existsSync(envFilePath);
                          let currentEnvContent = "";
                          if (envFileExisted) {
                              currentEnvContent = await fs.promises.readFile(envFilePath, 'utf8');
                          }

                          const timestamp = new Date().toLocaleString();
                          let newEnvContent = currentEnvContent;
                          const instructionalComment = `\n# On ${timestamp}, storygrind tried to use AI API key, but failed!\n# Please ensure the appropriate line below is correct and uncommented:\n# GEMINI_API_KEY=your_actual_api_key_here\n# OPENAI_API_KEY=your_actual_api_key_here\n# ANTHROPIC_API_KEY=your_actual_api_key_here\n# OPENROUTER_API_KEY=your_actual_api_key_here\n\n`;

                          if (!currentEnvContent.includes("# storygrind tried to use AI API key, but failed!")) {
                              newEnvContent = instructionalComment + currentEnvContent;
                          }
                          
                          await fs.promises.writeFile(envFilePath, newEnvContent, 'utf8');

                          const openError = await shell.openPath(envFilePath);
                          console.log(`\n .env file: ${envFilePath}\n openError=${openError}\n`);
                          console.dir(openError);
                          if (openError) {
                              console.error(`Error opening .env file with shell.openPath: ${openError}`);
                              dialog.showErrorBox('File Access Error', `Could not automatically open the .env file at:\n${envFilePath}\n\nPlease open it manually. storygrind will now quit.`);
                          } else {
                              console.log(`Attempted to open .env file: ${envFilePath}`);
                          }
                      } catch (err) {
                          console.error(`Error preparing or opening .env file: ${err.message || err}`);
                          dialog.showErrorBox('Configuration Error', `An error occurred while trying to prepare or open your .env file at:\n${envFilePath}\n\nPlease check it manually. storygrind will now quit.`);
                      } finally {
                          console.log('Quitting application after "Setup Key & Quit" option.');
                          app.quit(0);
                          process.exit();
                      }
                  } else { 
                      console.log('User acknowledged API key warning. AI tools will be unavailable or may error out if used. However, non-AI based Tools are available for use.');
                  }
              }).catch(err => {
                  console.error('Error displaying API key dialog:', err);
              });
          }
      }
    }
    
    // Initial project dialog logic
    if (!appState.CURRENT_PROJECT && shouldShowProjectDialog) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            showProjectDialog();
        }
      }, 500);
    }

  } catch (error) {
    console.error('Failed to initialize application:', error);
    if (typeof global.logToFile === 'function') {
        global.logToFile(`CRITICAL APP INIT ERROR: ${error.message}\n${error.stack}`);
    }
    app.quit(0);
    process.exit();
  }
}

// In main.js, update the logToFile function to make it globally available
// Simple logging function that writes to a file in the user's home directory
function logToFile(message) {
  return; // cls: not so useful?
  // const logPath = path.join(os.homedir(), 'storygrind-debug.log');
  // const timestamp = new Date().toISOString();
  // const logLine = `${timestamp}: ${message}\n`;
  
  // try {
  //   fs.appendFileSync(logPath, logLine);
  // } catch (e) {
  //   // Can't do anything if logging itself fails
  // }
}

// Make logToFile available globally so other modules can use it
global.logToFile = logToFile;

// Log startup message
logToFile('=== APPLICATION STARTING ===');

// Catch all uncaught exceptions and log them
process.on('uncaughtException', (error) => {
  logToFile(`CRASH ERROR: ${error.message}`);
  logToFile(`STACK TRACE: ${error.stack}`);
  process.exit(1); // Exit with error code
});

// Log basic environment information
logToFile(`App executable: ${process.execPath}`);
logToFile(`Running in ${isPackaged ? 'packaged' : 'development'} mode`);
logToFile(`Current directory: ${process.cwd()}`);
logToFile(`__dirname: ${__dirname}`);
logToFile(`App path: ${app.getAppPath()}`);

// Log additional paths in packaged mode
if (isPackaged) {
  logToFile(`Resources path: ${path.join(app.getAppPath(), '..')}`);
}

// Global function to get complete settings 
function getCompleteApiSettings() {
  // Start with an empty settings object
  const completeSettings = {};
  
  // Include stored model selection if available
  const storedModel = appState.store ? appState.store.get('selectedAiModel') : null;
  if (storedModel) {
    completeSettings.model_name = storedModel;
  }
  
  console.log('getCompleteApiSettings returning:', completeSettings);
  console.log('- selectedApiProvider:', appState.store ? appState.store.get('selectedApiProvider') : 'no store');
  console.log('- selectedAiModel:', storedModel);
  
  return completeSettings;
}

// Store references to windows
let projectDialogWindow = null;
let apiSettingsWindow = null;
let toolSetupRunWindow = null;

// Flag to control whether to show the project dialog
let shouldShowProjectDialog = true;

// Store the currently selected tool
let currentTool = null;

// Set application name
app.name = "storygrind";

// Define menu template
const menuTemplate = [
  {
    label: 'storygrind',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  // Edit menu with standard operations
  {
    label: 'Edit',
    submenu: [
      { role: 'copy', accelerator: 'CmdOrCtrl+C' },
      { role: 'paste', accelerator: 'CmdOrCtrl+V' },
      { role: 'cut', accelerator: 'CmdOrCtrl+X' },
      { type: 'separator' },
      { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
    ]
  }
];

// Set the application menu
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);
// cls: this removes the menu, but copy/paste fails = keep it:
// Menu.setApplicationMenu(null);

// Function to create project selection dialog
function createProjectDialog() {
  // Create the dialog window
  projectDialogWindow = new BrowserWindow({
    width: 600,
    height: 650,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#121212', // Dark background
    autoHideMenuBar: true,
  });

  // Load the HTML file
  projectDialogWindow.loadFile(path.join(__dirname, 'project-dialog.html'));

  // Show the window when ready
  projectDialogWindow.once('ready-to-show', () => {
    projectDialogWindow.show();
  });

  // Track window destruction
  projectDialogWindow.on('closed', () => {
    projectDialogWindow = null;
  });
  
  return projectDialogWindow;
}

// Show the project dialog
function showProjectDialog() {
  if (!projectDialogWindow || projectDialogWindow.isDestroyed()) {
    createProjectDialog();
    
    // Pass the current theme to the dialog
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript('document.body.classList.contains("light-mode")')
        .then(isLightMode => {
          if (projectDialogWindow && !projectDialogWindow.isDestroyed()) {
            projectDialogWindow.webContents.send('set-theme', isLightMode ? 'light' : 'dark');
          }
        })
        .catch(err => console.error('Error getting theme:', err));
    }
  } else {
    projectDialogWindow.show();
  }
}

function createWindow() {
  // Get the primary display's work area dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  // console.log('*** Screen dimensions:', screen.getPrimaryDisplay().workAreaSize);  

  // Use % of the available width and height
  const windowWidth = Math.floor(width * 0.95);
  const windowHeight = Math.floor(height * 0.98);
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#111111', // Dark background
    autoHideMenuBar: false,
  });

  // Center the window
  mainWindow.center();

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Show the main window initially, but it might be hidden by welcome screen
  mainWindow.show();
  
  // Ensure proper cleanup on Windows when main window closes
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.platform === 'win32') {
      app.quit(0);
      process.exit();
    }
  });
}

function createWelcomeScreen() {
  // console.log('Creating welcome screen...');
  
  welcomeWindow = new BrowserWindow({
    width: 650,
    height: 700,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable web security for production but allow dev tools
      webSecurity: true
    },
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    resizable: false
  });

  welcomeWindow.loadFile(path.join(__dirname, 'welcome-screen.html'));

  welcomeWindow.once('ready-to-show', () => {
    // console.log('Welcome screen ready to show');
    welcomeWindow.show();
    
    // Apply current theme
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript('document.body.classList.contains("light-mode")')
        .then(isLightMode => {
          if (welcomeWindow && !welcomeWindow.isDestroyed()) {
            // console.log('Sending theme to welcome screen:', isLightMode ? 'light' : 'dark');
            welcomeWindow.webContents.send('set-theme', isLightMode ? 'light' : 'dark');
          }
        })
        .catch(err => console.error('Error getting theme:', err));
    }
  });

  // Add error handling for the welcome window
  welcomeWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Welcome screen failed to load:', errorCode, errorDescription, validatedURL);
  });

  welcomeWindow.webContents.on('dom-ready', () => {
    console.log('Welcome screen DOM ready');
  });

  welcomeWindow.on('closed', () => {
    console.log('Welcome window closed');
    welcomeWindow = null;
  });
  
  return welcomeWindow;
}

function createSettingsDialog() {
  // console.log('Creating settings dialog...');
  
  const windowWidth = 530;
  const windowHeight = 750;
  
  const display = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth, height: workHeight } = display.workArea;
  
  settingsWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: workX + Math.floor((workWidth - windowWidth) / 2), // Center in workArea
    y: workY + workHeight - windowHeight, // Bottom of workArea
    parent: mainWindow,
    modal: true,
    transparent: true,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    resizable: true,
    minWidth: 530,
    minHeight: 750
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings-dialog.html'));
  
  settingsWindow.once('ready-to-show', () => {
    // console.log('Settings dialog ready to show');
    settingsWindow.show();
    
    // Apply current theme
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript('document.body.classList.contains("light-mode")')
        .then(isLightMode => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            // console.log('Sending theme to settings dialog:', isLightMode ? 'light' : 'dark');
            settingsWindow.webContents.send('set-theme', isLightMode ? 'light' : 'dark');
          }
        })
        .catch(err => console.error('Error getting theme:', err));
    }
  });
  
  // Add error handling for the settings window
  settingsWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Settings dialog failed to load:', errorCode, errorDescription, validatedURL);
  });
  
  settingsWindow.webContents.on('dom-ready', () => {
    console.log('Settings dialog DOM ready');
  });
  
  settingsWindow.on('closed', () => {
    console.log('Settings window closed');
    settingsWindow = null;
  });
  
  return settingsWindow;
}

function checkApiProviderConfiguration() {
  // console.log('Checking API provider configuration...');
  
  // Check if user has selected a provider
  const selectedProvider = appState.store ? appState.store.get('selectedApiProvider') : null;
  // console.log('Selected provider from store:', selectedProvider);
  
  if (!selectedProvider || selectedProvider === 'skipped') {
    // console.log('No provider selected or user skipped, need to show welcome screen');
    return false; // Need to show welcome screen
  }
  
  // Check if the selected provider has a valid API key
  let apiKeyVar;
  switch (selectedProvider) {
    case 'gemini':
      apiKeyVar = 'GEMINI_API_KEY';
      break;
    case 'openai':
      apiKeyVar = 'OPENAI_API_KEY';
      break;
    case 'claude':
      apiKeyVar = 'ANTHROPIC_API_KEY';
      break;
    case 'openrouter':
      apiKeyVar = 'OPENROUTER_API_KEY';
      break;
    default:
      console.log('Unknown provider:', selectedProvider);
      return false;
  }
  
  const apiKey = process.env[apiKeyVar];
  const hasApiKey = !!apiKey;
  // console.log(`API key for ${apiKeyVar}: ${hasApiKey ? 'present' : 'missing'}`);
  
  return hasApiKey; // Return true if API key exists
}

function setupWelcomeHandlers() {
  // console.log('Setting up welcome screen IPC handlers...');
  ipcMain.on('set-api-provider', (event, provider) => {
    // console.log('Received set-api-provider:', provider);
    
    try {
      if (appState.store) {
        appState.store.set('selectedApiProvider', provider);
        // console.log('Saved provider to store:', provider);
      } else {
        console.warn('appState.store not available');
      }
      
      // Close welcome window
      if (welcomeWindow && !welcomeWindow.isDestroyed()) {
        // console.log('Closing welcome window...');
        welcomeWindow.close();
      }
      
      // Show message that restart is needed
      const providerNames = {
        'gemini': 'Gemini',
        'openai': 'OpenAI',
        'claude': 'Claude'
      };
      
      const providerName = providerNames[provider] || provider;
      
      // console.log('Showing restart dialog for provider:', providerName);
      
      // Check if this is user-initiated switch or initial setup
      const isUserSwitch = global.isUserInitiatedProviderSwitch || false;
      
      const dialogMessage = isUserSwitch 
        ? `AI provider changed to ${providerName}.`
        : `API provider set to ${providerName}.`;
        
      const dialogDetail = isUserSwitch
        ? `storygrind will now quit so you can restart with the new AI provider.\n\nNote: You will need a valid API key in your .env file located at:\n${envFilePath}`
        : `Please restart storygrind to continue with the selected AI provider.\n\nNote: You will need a valid API key in your .env file located in your home path at:\n${envFilePath}`;
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Restart Required',
        message: dialogMessage,
        detail: dialogDetail,
        buttons: ['Quit Now']
      }).then(({ response }) => {
        // console.log('Restart dialog response:', response);
        // console.log('User chose to quit for provider switch');
        // Reset the flag before quitting
        global.isUserInitiatedProviderSwitch = false;
        app.quit(0);
        process.exit();
      }).catch(err => {
        console.error('Error showing restart dialog:', err);
        // Reset flag and quit anyway if dialog fails
        global.isUserInitiatedProviderSwitch = false;
        app.quit(0);
        process.exit();
      });
      
    } catch (error) {
      console.error('Error in set-api-provider handler:', error);
    }
  });
  
  // console.log('Welcome screen IPC handlers set up successfully');
}

// Setup handlers for project operations
function setupProjectHandlers() {
  // Get list of projects
  ipcMain.handle('get-projects', async () => {
    try {
      // Ensure projects directory exists
      await fs.promises.mkdir(appState.PROJECTS_DIR, { recursive: true });
      
      // List all directories in the projects folder
      const items = await fs.promises.readdir(appState.PROJECTS_DIR);
      
      // Define specific folders to exclude from project list
      const EXCLUDED_FOLDERS = ['tools', 'images', 'tool-prompts'];
      
      // Filter to only include directories and exclude hidden directories and special folders
      const projects = [];
      for (const item of items) {
        // Skip hidden items (starting with .)
        if (item.startsWith('.')) {
          // console.log(`Skipping hidden directory: ${item}`);
          continue;
        }
        
        // Skip specifically excluded folders
        if (EXCLUDED_FOLDERS.includes(item)) {
          // console.log(`Skipping excluded folder: ${item}`);
          continue;
        }
        
        const itemPath = path.join(appState.PROJECTS_DIR, item);
        const stats = await fs.promises.stat(itemPath);
        if (stats.isDirectory()) {
          projects.push(item);
        }
      }
      
      return projects.sort(); // Sort alphabetically
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  });

  // Open an existing project
  ipcMain.handle('open-project', async (event, projectName) => {
    try {
      const projectPath = path.join(appState.PROJECTS_DIR, projectName);
      
      // Check if the project directory exists
      if (!fs.existsSync(projectPath)) {
        return {
          success: false,
          message: `Project directory does not exist: ${projectPath}`
        };
      }

      // Unconditionally clear API files and caches whenever a project is selected or created.
      // console.log(`Project selected/created: ${projectName}.\nClearing all API files and caches for the configured API key.`);

      if (AiApiServiceInstance) {
        try {
          // console.log(`Calling clearFilesAndCaches (global cleanup for API key)`);
          await AiApiServiceInstance.clearFilesAndCaches(); // No argument needed
        } catch (cleanupError) {
          console.error('Error during global API files and caches cleanup:', cleanupError);
          // Log this error but allow the project switch to continue
          // You might want to show a dialog to the user if critical
          dialog.showErrorBox('API Cleanup Error', `Failed to clear all API files and caches. Please check the logs. Reason: ${cleanupError.message}`);
        }
      } else {
        console.warn('AiApiServiceInstance not available for API data cleanup. This may occur if API key is missing or initialization failed.');
        // Optionally inform the user if this is unexpected
        // dialog.showMessageBox(mainWindow, { // mainWindow should be accessible
        //   type: 'warning',
        //   title: 'API Service Unavailable',
        //   message: 'The AI service is not available, so API files and caches could not be cleared.',
        //   buttons: ['OK']
        // });
      }
      
      // Update application state
      appState.CURRENT_PROJECT = projectName;
      appState.CURRENT_PROJECT_PATH = projectPath;
      appState.DEFAULT_SAVE_DIR = projectPath;
      
      // Save to electron-store
      if (appState.store) {
        appState.store.set('settings', {
          default_save_dir: projectPath,
          current_project: projectName,
          current_project_path: projectPath
        });
      }
      
      return {
        success: true,
        projectPath
      };
    } catch (error) {
      console.error('Error opening project:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
  
  // Create a new project
  ipcMain.handle('create-project', async (event, projectName) => {
    try {
      const projectPath = path.join(appState.PROJECTS_DIR, projectName);
      
      // Check if the project already exists
      if (fs.existsSync(projectPath)) {
        return {
          success: false,
          message: `Project '${projectName}' already exists`
        };
      }
      
      // Create the project directory
      await fs.promises.mkdir(projectPath, { recursive: true });

      // Unconditionally clear API files and caches whenever a project is selected or created.
      // console.log(`Project selected/created: ${projectName}. Clearing all API files and caches for the configured API key.`);

      if (AiApiServiceInstance) {
        try {
          // console.log(`Calling clearFilesAndCaches (global cleanup for API key)`);
          await AiApiServiceInstance.clearFilesAndCaches(); // No argument needed
        } catch (cleanupError) {
          console.error('Error during global API files and caches cleanup:', cleanupError);
          // Log this error but allow the project switch to continue
          // You might want to show a dialog to the user if critical
          dialog.showErrorBox('API Cleanup Error', `Failed to clear all API files and caches. Please check the logs. Reason: ${cleanupError.message}`);
        }
      } else {
        console.warn('AiApiServiceInstance not available for API data cleanup. This may occur if API key is missing or initialization failed.');
        // Optionally inform the user if this is unexpected
        // dialog.showMessageBox(mainWindow, { // mainWindow should be accessible
        //   type: 'warning',
        //   title: 'API Service Unavailable',
        //   message: 'The AI service is not available, so API files and caches could not be cleared.',
        //   buttons: ['OK']
        // });
      }

      // Update application state
      appState.CURRENT_PROJECT = projectName;
      appState.CURRENT_PROJECT_PATH = projectPath;
      appState.DEFAULT_SAVE_DIR = projectPath;
      
      // Save to electron-store
      if (appState.store) {
        appState.store.set('settings', {
          default_save_dir: projectPath,
          current_project: projectName,
          current_project_path: projectPath
        });
      }

      return {
        success: true,
        projectPath
      };
    } catch (error) {
      console.error('Error creating project:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });
}

// Function to create the tool setup and run dialog
function createToolSetupRunDialog(toolName) {
  // Create the dialog window
  toolSetupRunWindow = new BrowserWindow({
    width: mainWindow.getSize()[0],
    height: mainWindow.getSize()[1],
    x: mainWindow.getPosition()[0],
    y: mainWindow.getPosition()[1],
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#121212', // Dark background
    autoHideMenuBar: true,
  });

  // Load the HTML file
  toolSetupRunWindow.loadFile(path.join(__dirname, 'tool-setup-run.html'));

  // Show the window when ready
  toolSetupRunWindow.once('ready-to-show', () => {
    toolSetupRunWindow.show();
    
    // Send the current theme as soon as the window is ready
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript('document.body.classList.contains("light-mode")')
        .then(isLightMode => {
          if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
            toolSetupRunWindow.webContents.send('set-theme', isLightMode ? 'light' : 'dark');
          }
        })
        .catch(err => console.error('Error getting theme:', err));
    }
  });

  // Track window destruction
  toolSetupRunWindow.on('closed', () => {
    toolSetupRunWindow = null;
  });
  
  // Prevent the tool window from being resized or moved
  toolSetupRunWindow.setResizable(false);
  toolSetupRunWindow.setMovable(false);
  
  return toolSetupRunWindow;
}

// Show the tool setup dialog
function showToolSetupRunDialog(toolName) {
  // Always close any existing tool window first
  if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
    toolSetupRunWindow.destroy();
    toolSetupRunWindow = null;
  }
  
  // Store the selected tool
  currentTool = toolName;
  // console.log(`Creating new tool setup dialog for: ${toolName}`);
  
  // Create a new dialog window with the current tool
  createToolSetupRunDialog(toolName);
}

function launchEditor(fileToOpen = null) {
  return new Promise((resolve) => {
    try {
      createEditorDialog(fileToOpen);
      resolve(true);
    } catch (error) {
      console.error('Error launching editor:', error);
      if (typeof global.logToFile === 'function') {
        global.logToFile(`Error launching editor: ${error.message}`);
      }
      resolve(false);
    }
  });
}

// Handle opening files directly in the editor
ipcMain.handle('open-file-in-editor', async (event, filePath) => {
  try {
    // Verify the file exists
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found: ' + filePath };
    }
    
    // Create editor dialog window
    createEditorDialog(filePath);
    
    // Return success
    return { success: true };
  } catch (error) {
    console.error('Error opening file in editor:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, data) => {
  try {
    const { filePath, content, saveAs } = data;
    let finalPath = filePath;
    
    // If no path or saveAs is true, show save dialog
    if (!finalPath || saveAs) {
      try {
        // Get the current project path as the default save directory
        const projectPath = appState.CURRENT_PROJECT_PATH || appState.PROJECTS_DIR;
        
        // Determine if the content looks like markdown to set the default extension
        const isMarkdown = content.includes('#') || 
                          content.includes('**') || 
                          content.includes('![') ||
                          content.includes('[') && content.includes('](');
        
        // Set appropriate filters based on content
        const filters = isMarkdown ? 
          [
            { name: 'Markdown Files', extensions: ['md'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
          ] : 
          [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] }
          ];
        
        const { canceled, filePath: newPath } = await dialog.showSaveDialog(editorDialogWindow, {
          title: 'Save File',
          defaultPath: projectPath,
          filters: filters
        });
        
        if (canceled || !newPath) {
          return { success: false };
        }
        
        finalPath = newPath;
        
        // Verify the selected path is within the projects directory
        const writingPath = appState.PROJECTS_DIR;
        if (!finalPath.startsWith(writingPath)) {
          dialog.showErrorBox(
            'Access Denied',
            `Files can only be saved to the ${writingPath} directory.`
          );
          return { success: false };
        }
      } catch (error) {
        console.error('Error showing save dialog:', error);
        return { success: false };
      }
    }
    
    try {
      // Ensure the directory exists
      const dirPath = path.dirname(finalPath);
      await fs.promises.mkdir(dirPath, { recursive: true });
      
      // Write the file
      fs.writeFileSync(finalPath, content, 'utf8');
      // console.log('File saved successfully to:', finalPath);
      return { success: true, filePath: finalPath };
    } catch (error) {
      console.error('Error saving file:', error);
      dialog.showErrorBox('Error', `Failed to save file: ${error.message}`);
      return { success: false };
    }
  } catch (error) {
    console.error('Error in save-file handler:', error);
    return { success: false };
  }
});

// Setup handlers for tool operations
function setupToolHandlers() {
  ipcMain.handle('get-tools', () => {
    // console.log('get-tools handler called');
    
    // Get all tool IDs
    const allToolIds = toolSystem.toolRegistry.getAllToolIds();
    // console.log(`Found ${allToolIds.length} tools in registry:`, allToolIds);
    // console.log('Raw tool IDs from registry:', allToolIds);
    
    // Map IDs to tool objects with required properties
    const tools = allToolIds.map(id => {
      const tool = toolSystem.toolRegistry.getTool(id);
      if (!tool) {
        console.error(`Tool with ID ${id} exists in registry but could not be retrieved`);
        throw new Error(`Tool with ID ${id} exists in registry but could not be retrieved`);
      }

      // Ensure tool has required properties
      return {
        name: id,
        title: tool.config?.title || id,
        description: tool.config?.description || tool.title || `Tool: ${id}`
      };
    });
    
    // console.log(`Returning ${tools.length} tools to renderer`);
    // console.log('Tool details being returned:', tools);
    return tools;
  });

  ipcMain.handle('get-tool-options', (e, toolName) => {
    const t = toolSystem.toolRegistry.getTool(toolName);
    return t ? (t.config.options || []) : [];
  });
  
  // Show tool setup dialog
  ipcMain.on('show-tool-setup-dialog', (event, toolName) => {
    showToolSetupRunDialog(toolName);
  });
  
  // Handle tool dialog closing
  ipcMain.on('close-tool-dialog', (event, action, data) => {
    if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
      toolSetupRunWindow.destroy();
      toolSetupRunWindow = null;
    }
  });
  
  // Get current tool
  ipcMain.handle('get-current-tool', () => {
    try {
      if (currentTool) {
        // Try to get from registry first
        const tool = toolSystem.toolRegistry.getTool(currentTool);
        if (tool) {
          return {
            name: currentTool,
            title: tool.config.title || currentTool,
            description: tool.config.description || ''
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting current tool:', error);
      return null;
    }
  });
  
  // When updating the start-tool-run handler:
  ipcMain.handle('start-tool-run', async (event, toolName, optionValues) => {
    try {
      // Generate a unique run ID
      const runId = uuidv4();
      
      // Set up output function
      const sendOutput = (text) => {
        if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
          toolSetupRunWindow.webContents.send('tool-output', { 
            runId, 
            text 
          });
        }
      };
      
      // Execute the tool in the background
      (async () => {
        try {
          // Send initial output notification
          sendOutput(`Starting ${toolName}...\n\n`);
          
          // Get the tool
          const tool = toolSystem.toolRegistry.getTool(toolName);
          
          if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
          }
          
          fileCache.clear(toolName);

          // Execute the tool (passing sendOutput so it can assign emitOutput)
          const result = await toolSystem.executeToolById(toolName, optionValues, runId, sendOutput);
          
          // Get files from cache
          const cachedFiles = fileCache.getFiles(toolName);
          
          // Combine cached files with any files returned by the tool
          const allFiles = [...new Set([
            ...(result.outputFiles || []),
            ...cachedFiles.map(file => file.path)
          ])];
          
          // Send completion notification
          if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
            toolSetupRunWindow.webContents.send('tool-finished', { 
              runId, 
              code: 0, 
              createdFiles: allFiles 
            });
          }
        } catch (error) {
          console.error(`Error running tool ${toolName}:`, error);
          if (toolSetupRunWindow && !toolSetupRunWindow.isDestroyed()) {
            toolSetupRunWindow.webContents.send('tool-error', { 
              runId, 
              error: error.message 
            });
          }
        }
      })();
      
      return runId;
    } catch (error) {
      console.error('Error starting tool run:', error);
      throw error;
    }
  });
  
  // Store tool options in app state
  ipcMain.handle('set-tool-options', (event, options) => {
    try {
      appState.OPTION_VALUES = options;
      return true;
    } catch (error) {
      console.error('Error setting tool options:', error);
      return false;
    }
  });
}

function createEditorDialog(fileToOpen = null) {
  // If there's already an editor window open, close it first
  if (editorDialogWindow && !editorDialogWindow.isDestroyed()) {
    editorDialogWindow.destroy();
    editorDialogWindow = null;
  }

  // Get the parent window - either the tool window or main window
  const parentWindow = toolSetupRunWindow || mainWindow;

  editorDialogWindow = new BrowserWindow({
    width: parentWindow.getSize()[0],
    height: parentWindow.getSize()[1],
    x: parentWindow.getPosition()[0],
    y: parentWindow.getPosition()[1],
    parent: parentWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable clipboard operations without spellcheck
      additionalArguments: ['--enable-clipboard-read', '--enable-clipboard-write']
    },
    backgroundColor: '#121212', // Dark background
    autoHideMenuBar: true, // Hide the menu bar
  });

  // Load the HTML file
  editorDialogWindow.loadFile(path.join(__dirname, 'editor-dialog.html'));

  // Show the window when ready
  editorDialogWindow.once('ready-to-show', () => {
    editorDialogWindow.show();
    
    // Send the current theme as soon as the window is ready
    if (parentWindow) {
      parentWindow.webContents.executeJavaScript('document.body.classList.contains("light-mode")')
        .then(isLightMode => {
          if (editorDialogWindow && !editorDialogWindow.isDestroyed()) {
            // Since we're using a data-theme attribute now, slightly adapt the theme message
            const theme = isLightMode ? 'light' : 'dark';
            editorDialogWindow.webContents.send('set-theme', theme);
          }
        })
        .catch(err => console.error('Error getting theme:', err));
    }
    
    // If a file should be opened, send it to the window
    if (fileToOpen) {
      try {
        // Verify the file path is within the allowed directory
        const homePath = os.homedir();
        const writingPath = path.join(homePath, 'writing');
        
        if (!fileToOpen.startsWith(writingPath)) {
          console.error('Attempted to open file outside allowed directory:', fileToOpen);
          dialog.showErrorBox('Security Error', 'Cannot open files outside the writing directory.');
          return;
        }
        
        // Check if file exists
        if (!fs.existsSync(fileToOpen)) {
          console.error('File not found:', fileToOpen);
          dialog.showErrorBox('File Error', `File not found: ${fileToOpen}`);
          return;
        }
        
        const content = fs.readFileSync(fileToOpen, 'utf8');
        editorDialogWindow.webContents.send('file-opened', { 
          filePath: fileToOpen, 
          content 
        });
      } catch (error) {
        console.error('Error loading file:', error);
        dialog.showErrorBox('Error', `Failed to load file: ${error.message}`);
      }
    }
  });

  // Track window destruction
  editorDialogWindow.on('closed', () => {
    editorDialogWindow = null;
    // On Windows, ensure proper cleanup if this was the last window
    if (process.platform === 'win32' && BrowserWindow.getAllWindows().length === 0) {
      app.quit(0);
    }
  });
  
  // Make the window resizable to improve usability
  editorDialogWindow.setResizable(false);
  editorDialogWindow.setMovable(false);
  
  return editorDialogWindow;
}

// Make sure we properly handle the IPC for closing the editor window
ipcMain.on('close-editor-dialog', () => {
  if (editorDialogWindow && !editorDialogWindow.isDestroyed()) {
    editorDialogWindow.destroy();
    editorDialogWindow = null;
  } else {
    console.warn("MAIN: editorDialogWindow was missing or destroyed already.");
  }
});

// Set up all IPC handlers
function setupIPCHandlers() {
  setupProjectHandlers();
  setupToolHandlers();
  setupWelcomeHandlers();
  
  // Handle quit request from renderer
  ipcMain.on('app-quit', () => {
    // console.log('Quit requested from renderer');
    app.quit(0);
    process.exit();
  });

  // Show settings dialog
  ipcMain.on('show-settings-dialog', () => {
    // console.log('Settings dialog requested');
    createSettingsDialog();
  });

  // Get current settings
  ipcMain.handle('get-current-settings', async () => {
    try {
      const settings = appState.getCurrentSettings();
      // Add app and env paths that the settings dialog expects
      settings.appPath = app.getAppPath();
      settings.envPath = envFilePath;
      return settings;
    } catch (error) {
      console.error('Error getting current settings:', error);
      return {
        projectsPath: appState.PROJECTS_DIR,
        appPath: app.getAppPath(),
        envPath: envFilePath,
        aiProvider: null,
        language: 'en-US'
      };
    }
  });

  // Get available models for a specific AI provider
  ipcMain.handle('getAvailableModels', async (event, provider) => {
    try {
      // console.log('Getting available models for provider:', provider);
      
      let ApiServiceClass;
      
      // Get the appropriate client class
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
        case 'openrouter':
          ApiServiceClass = require('./client-openrouter.js');
          break;
        default:
          console.error(`Unknown provider: ${provider}`);
          return [];
      }
      
      // Create a temporary client instance
      const tempClient = new ApiServiceClass();
      
      // Check if client initialized properly (has API key)
      if (tempClient.apiKeyMissing) {
        console.warn(`API key missing for provider: ${provider}`);
        return [];
      }
      
      // Get available models
      const models = await tempClient.getAvailableModels();
      // console.log(`Found ${models.length} models for ${provider}`);
      
      return models;
      
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  });

  // Save settings
  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      // console.log('Saving settings:', settings);
      
      if (settings.aiProvider) {
        appState.setAiProvider(settings.aiProvider);
        // Also update the selectedApiProvider key for consistency
        appState.store.set('selectedApiProvider', settings.aiProvider);
      }
      if (settings.aiModel) {
        appState.store.set('selectedAiModel', settings.aiModel);
      }
      if (settings.language) {
        appState.setLanguage(settings.language);
      }
      
      // Close settings dialog
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.close();
      }
      
      // If shouldQuit is true, quit the app
      if (settings.shouldQuit) {
        // console.log('Settings require restart - quitting app');
        app.quit(0);
        process.exit();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel settings
  ipcMain.on('cancel-settings', () => {
    // console.log('Settings cancelled');
    
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
  });

  // Handle cancel provider selection
  ipcMain.on('cancel-provider-selection', () => {
    // console.log('Provider selection cancelled - proceeding with non-AI tools only');
    
    if (welcomeWindow && !welcomeWindow.isDestroyed()) {
      welcomeWindow.close();
    }
    
    // Reset the flag
    global.isUserInitiatedProviderSwitch = false;
    
    // The tools should already be initialized from the modified initializeApp function
    // Just make sure the main window is visible and ready
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });  

  // Show project dialog
  ipcMain.on('show-project-dialog', () => {
    showProjectDialog();
  });

  // Show editor dialog
  ipcMain.handle('show-editor-dialog', async (event, filePath) => {
    try {
      createEditorDialog(filePath);
      return true;
    } catch (error) {
      console.error('Failed to launch editor:', error);
      return false;
    }
  });
  
  // Close editor dialog
  ipcMain.on('close-editor-dialog', () => {
    if (editorDialogWindow && !editorDialogWindow.isDestroyed()) {
      editorDialogWindow.destroy();
      editorDialogWindow = null;
    } else {
      // console.log("MAIN: editorDialogWindow was missing or destroyed already.");
    }
  });

  // Handler for launching the text editor
  ipcMain.on('launch-editor', async (event) => {
    const result = await launchEditor();
    event.returnValue = result;
  });

  // Also add a handle version for Promise-based calls
  ipcMain.handle('launch-editor', async () => {
    return await launchEditor();
  });
  
  // Get current project info
  ipcMain.handle('get-project-info', () => {
    return {
      current_project: appState.CURRENT_PROJECT,
      current_project_path: appState.CURRENT_PROJECT_PATH
    };
  });
  
  // File selection dialog
  ipcMain.handle('select-file', async (event, options) => {
    try {
      // Ensure base directory is inside the projects directory
      const writingPath = appState.PROJECTS_DIR;
      let startPath = options.defaultPath || appState.DEFAULT_SAVE_DIR || writingPath;
      
      // Force path to be within ~/writing_with_storygrind
      if (!startPath.startsWith(writingPath)) {
        startPath = writingPath;
      }
      
      // Set default filters to include markdown files
      const defaultFilters = [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ];
      
      // For certain tools, we might need different filters
      if (currentTool === 'tokens_words_counter') {
        // Allow both text and markdown files for this tool
        options.filters = [{ name: 'Text Files', extensions: ['txt', 'md'] }];
      }
      
      const dialogOptions = {
        title: options.title || 'Select File',
        defaultPath: startPath,
        buttonLabel: options.buttonLabel || 'Select',
        filters: options.filters || defaultFilters,
        properties: ['openFile'],
        // Restrict to projects directory
        message: 'Please select a file within your writing projects'
      };
      
      const result = await dialog.showOpenDialog(
        options.parentWindow || editorDialogWindow || toolSetupRunWindow || mainWindow, 
        dialogOptions
      );
      
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      const selectedPath = result.filePaths[0];
      
      // Verify the selected path is within the projects directory
      if (!selectedPath.startsWith(writingPath)) {
        console.warn('Selected file is outside allowed directory:', selectedPath);
        
        // Show error dialog to user
        await dialog.showMessageBox(toolSetupRunWindow || mainWindow, {
          type: 'error',
          title: 'Invalid File Selection',
          message: 'File Selection Restricted',
          detail: `You must select a file within the ${appState.PROJECTS_DIR} directory. Please try again.`,
          buttons: ['OK']
        });
        
        return null;
      }
      
      return selectedPath;
    } catch (error) {
      console.error('Error in file selection:', error);
      throw error;
    }
  });
  
  // Directory selection dialog
  ipcMain.handle('select-directory', async (event, options) => {
    try {
      // Ensure base directory is inside the projects directory
      const writingPath = appState.PROJECTS_DIR;
      let startPath = options.defaultPath || appState.DEFAULT_SAVE_DIR || writingPath;
      
      // Force path to be within ~/writing_with_storygrind
      if (!startPath.startsWith(writingPath)) {
        startPath = writingPath;
      }
      
      const dialogOptions = {
        title: options.title || 'Select Directory',
        defaultPath: startPath,
        buttonLabel: options.buttonLabel || 'Select',
        properties: ['openDirectory'],
        message: 'Please select a directory within your writing projects'
      };
      
      const result = await dialog.showOpenDialog(
        options.parentWindow || toolSetupRunWindow || mainWindow, 
        dialogOptions
      );
      
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      const selectedPath = result.filePaths[0];
      
      // Verify the selected path is within the projects directory
      if (!selectedPath.startsWith(writingPath)) {
        console.warn('Selected directory is outside allowed directory:', selectedPath);
        
        // Show error dialog to user
        await dialog.showMessageBox(toolSetupRunWindow || mainWindow, {
          type: 'error',
          title: 'Invalid Directory Selection',
          message: 'Directory Selection Restricted',
          detail: `You must select a directory within the ${appState.PROJECTS_DIR} directory. Please try again.`,
          buttons: ['OK']
        });
        
        return null;
      }
      
      return selectedPath;
    } catch (error) {
      console.error('Error in directory selection:', error);
      throw error;
    }
  });
  
  // Handle project dialog closing
  ipcMain.on('close-project-dialog', (event, action, data) => {
    if (projectDialogWindow && !projectDialogWindow.isDestroyed()) {
      if (action === 'cancelled') {
        // For Cancel, disable auto-showing and destroy the window
        shouldShowProjectDialog = false;
        projectDialogWindow.destroy();
        projectDialogWindow = null;
      } else {
        // For other actions, just hide the window
        projectDialogWindow.hide();
        
        // If a project was selected or created, notify the main window
        if ((action === 'project-selected' || action === 'project-created') && 
            mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-updated', {
            action,
            project: data
          });
        }
      }
    }
  });

  // Convert DOCX to TXT
  ipcMain.handle('convert-docx-to-txt', async (event, docxPath, outputFilename) => {
    try {
      // Ensure we have a current project
      if (!appState.CURRENT_PROJECT_PATH) {
        return {
          success: false,
          message: 'No active project selected'
        };
      }
      
      // Validate output filename
      if (!outputFilename) {
        outputFilename = 'manuscript.txt';
      }
      
      // Ensure it has a .txt extension
      if (!outputFilename.toLowerCase().endsWith('.txt')) {
        outputFilename += '.txt';
      }
      
      // Construct output path
      const outputPath = path.join(appState.CURRENT_PROJECT_PATH, outputFilename);
      
      // Use your existing DOCX to TXT conversion code
      const mammoth = require('mammoth');
      const jsdom = require('jsdom');
      const { JSDOM } = jsdom;
      
      // Load the docx file
      const result = await mammoth.convertToHtml({ path: docxPath });
      const htmlContent = result.value;
      
      // Parse the HTML
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Get all block elements
      const blocks = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
      
      // Process blocks to extract chapters
      let chapters = [];
      let currentChapter = null;
      let ignoreFrontMatter = true;
      let ignoreRest = false;
      
      // Stop headings
      const STOP_TITLES = ["about the author", "website", "acknowledgments", "appendix"];
      
      // Convert NodeList to Array for iteration
      Array.from(blocks).forEach(block => {
        if (ignoreRest) return;
        
        const tagName = block.tagName.toLowerCase();
        const textRaw = block.textContent.trim();
        const textLower = textRaw.toLowerCase();
        
        // Skip everything until first <h1>
        if (ignoreFrontMatter) {
          if (tagName === "h1") {
            ignoreFrontMatter = false;
          } else {
            return;
          }
        }
        
        // If this heading is a "stop" heading, ignore the rest
        if (tagName.startsWith("h") && STOP_TITLES.some(title => textLower.startsWith(title))) {
          ignoreRest = true;
          return;
        }
        
        // If we see a new <h1>, that means a new chapter
        if (tagName === "h1") {
          currentChapter = {
            title: textRaw,
            textBlocks: []
          };
          chapters.push(currentChapter);
        }
        else {
          // If there's no current chapter yet, create one
          if (!currentChapter) {
            currentChapter = { title: "Untitled Chapter", textBlocks: [] };
            chapters.push(currentChapter);
          }
          // Add the block text if not empty
          if (textRaw) {
            currentChapter.textBlocks.push(textRaw);
          }
        }
      });
      
      // Build the manuscript text with proper spacing
      let manuscriptText = "";
      
      chapters.forEach((ch, idx) => {
        // Two newlines before each chapter title
        if (idx === 0) {
          manuscriptText += "\n\n";
        } else {
          manuscriptText += "\n\n\n";
        }
        
        // Add chapter title
        manuscriptText += ch.title;
        
        // One newline after chapter title
        manuscriptText += "\n\n";
        
        // Add paragraphs with one blank line between them
        manuscriptText += ch.textBlocks.join("\n\n");
      });
      
      // Write to output file
      await fs.promises.writeFile(outputPath, manuscriptText);
      
      return {
        success: true,
        outputPath: outputPath,
        outputFilename: outputFilename,
        chapterCount: chapters.length
      };
    } catch (error) {
      console.error('Error converting DOCX to TXT:', error);
      return {
        success: false,
        message: error.message || 'Failed to convert DOCX file'
      };
    }
  });

  // Convert TXT to DOCX - using minimal, version-compatible approach
  ipcMain.handle('convert-txt-to-docx', async (event, txtPath, outputFilename) => {
    try {
      // Ensure we have a current project
      if (!appState.CURRENT_PROJECT_PATH) {
        return {
          success: false,
          message: 'No active project selected'
        };
      }
      
      // Validate output filename
      if (!outputFilename) {
        outputFilename = 'manuscript.docx';
      }
      
      // Ensure it has a .docx extension
      if (!outputFilename.toLowerCase().endsWith('.docx')) {
        outputFilename += '.docx';
      }
      
      // Construct output path
      const outputPath = path.join(appState.CURRENT_PROJECT_PATH, outputFilename);
      
      // Read the txt file
      const textContent = await fs.promises.readFile(txtPath, 'utf8');
      
      // Import docx library
      const docx = require('docx');
      
      // Split text into paragraphs (separated by empty lines)
      const paragraphs = textContent.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
      
      // Simple function to check if a paragraph looks like a chapter heading
      function isChapterTitle(text) {
        // Common chapter title patterns
        return /^chapter\s+\d+/i.test(text) || // "Chapter X"
               /^chapter\s+[ivxlcdm]+/i.test(text) || // "Chapter IV"
               /^\d+[\.:]\s+/i.test(text); // "1: " or "1. "
      }

      // Create array of document content
      const children = [];
      let chapterCount = 0;
      
      // Process each paragraph
      paragraphs.forEach((paragraph, index) => {
        // Test if it's a chapter title
        if (isChapterTitle(paragraph)) {
          chapterCount++;
          
          // Add page break before chapters (except the first one)
          if (chapterCount > 1) {
            children.push(new docx.Paragraph({ pageBreakBefore: true }));
          }
          
          // Add chapter heading with proper formatting
          children.push(
            new docx.Paragraph({
              text: paragraph,
              heading: docx.HeadingLevel.HEADING_1,
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 240, after: 120 }
            })
          );
        } else {
          // Regular paragraph with first line indent
          children.push(
            new docx.Paragraph({
              text: paragraph,
              indent: { firstLine: 720 }, // 0.5 inch
              spacing: { line: 480 } // Double spacing
            })
          );
        }
      });

      // Create document with minimal options
      const doc = new docx.Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch (1440 twips)
                  right: 1440, 
                  bottom: 1440,
                  left: 1440
                }
              }
            },
            children: children
          }
        ]
      });
      
      // Save the document
      const buffer = await docx.Packer.toBuffer(doc);
      await fs.promises.writeFile(outputPath, buffer);
      
      return {
        success: true,
        outputPath: outputPath,
        outputFilename: outputFilename,
        chapterCount: chapterCount,
        paragraphCount: paragraphs.length
      };
    } catch (error) {
      console.error('Error converting TXT to DOCX:', error);
      return {
        success: false,
        message: error.message || 'Failed to convert TXT file'
      };
    }
  });

  // Get output files for a tool run
  ipcMain.handle('get-tool-output-files', (event, toolId) => {
    try {
      // For simplicity, if toolId is a runId, we just use the tool name part
      // This assumes runIds are in the format toolName-uuid
      const toolName = toolId.includes('-') ? toolId.split('-')[0] : toolId;
      
      // Get files from the cache
      const fileCache = require('./file-cache');
      const files = fileCache.getFiles(toolName);
      
      return files;
    } catch (error) {
      console.error('Error getting tool output files:', error);
      return [];
    }
  });

  // Get current AI model information
  ipcMain.handle('get-ai-model-info', () => {
    try {
      // Get the selected provider from app state first
      const selectedProvider = appState.store ? appState.store.get('selectedApiProvider') : null;
      
      // Check if no provider is selected
      if (!selectedProvider) {
        return {
          available: false,
          provider: 'None',
          model: 'Missing AI model - Use Settings to select provider and model',
          reason: 'No AI provider selected'
        };
      }
      
      // Check if we have an AI service instance
      if (!AiApiServiceInstance) {
        return {
          available: false,
          provider: 'None',
          model: 'Missing AI model',
          reason: 'No AI service initialized'
        };
      }
      
      // Check if service is missing API key
      if (AiApiServiceInstance.apiKeyMissing) {
        return {
          available: false,
          provider: selectedProvider || 'Unknown',
          model: 'API Key Missing or Provider Issues',
          reason: 'API key not configured or provider having temporary issues'
        };
      }
      
      // Get model name from the service config
      const modelName = AiApiServiceInstance.config?.model_name || 'Unknown Model';
      
      // Handle deprecated/unknown models
      if (modelName === 'unknown' || modelName === 'Unknown Model') {
        return {
          available: false,
          provider: selectedProvider,
          model: 'Model No Longer Available',
          reason: 'Selected model has been deprecated or is no longer available'
        };
      }
      
      // Create a user-friendly provider name
      const providerNames = {
        'gemini': 'Gemini',
        'openai': 'OpenAI', 
        'claude': 'Claude',
        'openrouter': 'OpenRouter'
      };
      
      const friendlyProvider = providerNames[selectedProvider] || selectedProvider || 'Unknown';
      
      return {
        available: true,
        provider: friendlyProvider,
        model: modelName,
        fullInfo: `${friendlyProvider}: ${modelName}`
      };
    } catch (error) {
      console.error('Error getting AI model info:', error);
      return {
        available: false,
        provider: 'Error',
        model: 'Missing AI model',
        reason: error.message
      };
    }
  });
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit(0);
    process.exit();
  }
});

// Windows-specific process handle cleanup
if (process.platform === 'win32') {
  app.on('before-quit', () => {
    // Force close all windows to ensure proper handle cleanup
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
  });
  
  app.on('window-all-closed', () => {
    // Force quit on Windows to prevent handle leaks
    app.quit(0);
    process.exit();
  });
}

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  // console.log('Application is quitting, cleaning up resources...');
  // Close any active AI API clients
  for (const toolId of toolSystem.toolRegistry.getAllToolIds()) {
    const tool = toolSystem.toolRegistry.getTool(toolId);
    if (tool && tool.apiService) {
      try {
        // Try close() method first (for Claude)
        if (typeof tool.apiService.close === 'function') {
          await tool.apiService.close();
        }
        // Try clearFilesAndCaches() method (for Gemini/OpenAI)
        else if (typeof tool.apiService.clearFilesAndCaches === 'function') {
          await tool.apiService.clearFilesAndCaches();
        }
      } catch (error) {
        // Ignore close errors during shutdown
      } finally {
        tool.apiService = null;
      }
    }
  }
});
