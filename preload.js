// preload.js - Updated with better welcome screen support

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Quit application
  quitApp: () => {
    console.log('electronAPI.quitApp called');
    ipcRenderer.send('app-quit');
  },
  
  // Project management
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProjectInfo: () => ipcRenderer.invoke('get-project-info'),
  selectProject: () => ipcRenderer.send('show-project-dialog'),
  openProject: (projectName) => ipcRenderer.invoke('open-project', projectName),
  createProject: (projectName) => ipcRenderer.invoke('create-project', projectName),
  closeDialog: (action, data) => ipcRenderer.send('close-project-dialog', action, data),
  onProjectUpdated: (callback) => ipcRenderer.on('project-updated', (_, data) => callback(data)),

  // Welcome and provider setup
  setApiProvider: (provider) => {
    console.log('electronAPI.setApiProvider called with:', provider);
    ipcRenderer.send('set-api-provider', provider);
  },
  skipApiSetup: () => {
    console.log('electronAPI.skipApiSetup called');
    ipcRenderer.send('skip-api-setup');
  },
  cancelProviderSelection: () => {
    console.log('electronAPI.cancelProviderSelection called');
    ipcRenderer.send('cancel-provider-selection');
  },
  
  // File handling
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
  
  // Tool management
  getTools: () => ipcRenderer.invoke('get-tools'),
  getToolOptions: (toolName) => ipcRenderer.invoke('get-tool-options', toolName),
  showToolSetupDialog: (toolName) => ipcRenderer.send('show-tool-setup-dialog', toolName),
  closeToolDialog: (action, data) => ipcRenderer.send('close-tool-dialog', action, data),
  getCurrentTool: () => ipcRenderer.invoke('get-current-tool'),
  startToolRun: (toolName, options) => ipcRenderer.invoke('start-tool-run', toolName, options),
  stopTool: (runId) => ipcRenderer.invoke('stop-tool', runId),
  setToolOptions: (options) => ipcRenderer.invoke('set-tool-options', options),
  onToolOutput: (callback) => ipcRenderer.on('tool-output', (_, data) => callback(data)),
  onToolFinished: (callback) => ipcRenderer.on('tool-finished', (_, data) => callback(data)),
  onToolError: (callback) => ipcRenderer.on('tool-error', (_, data) => callback(data)),
  removeAllListeners: (channel) => {
    if (channel === 'tool-output') ipcRenderer.removeAllListeners('tool-output');
    if (channel === 'tool-finished') ipcRenderer.removeAllListeners('tool-finished');
    if (channel === 'tool-error') ipcRenderer.removeAllListeners('tool-error');
  },
  // Get output files for a tool run
  getToolOutputFiles: (toolId) => ipcRenderer.invoke('get-tool-output-files', toolId),

  // Open a file in the editor
  openFileInEditor: (filePath) => ipcRenderer.invoke('open-file-in-editor', filePath),  
  
  // Editor dialog functions
  showEditorDialog: (filePath) => ipcRenderer.invoke('show-editor-dialog', filePath),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  closeEditorDialog: () => {
    console.log("PRELOAD: Sending close-editor-dialog IPC");
    ipcRenderer.send('close-editor-dialog');
  },

  onFileOpened: (callback) => ipcRenderer.on('file-opened', (_, data) => callback(data)),
  
  // Theme handling
  onSetTheme: (callback) => {
    console.log('electronAPI.onSetTheme listener registered');
    ipcRenderer.on('set-theme', (_, theme) => {
      console.log('Received set-theme event:', theme);
      callback(theme);
    });
  },

  // File conversion
  convertDocxToTxt: (docxPath, outputFilename) => ipcRenderer.invoke('convert-docx-to-txt', docxPath, outputFilename),
  convertTxtToDocx: (txtPath, outputFilename) => ipcRenderer.invoke('convert-txt-to-docx', txtPath, outputFilename),

  getAiModelInfo: () => ipcRenderer.invoke('get-ai-model-info'),

  // Settings dialog
  showSettingsDialog: () => {
    console.log('electronAPI.showSettingsDialog called');
    ipcRenderer.send('show-settings-dialog');
  },
  getCurrentSettings: () => ipcRenderer.invoke('get-current-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  cancelSettings: () => {
    console.log('electronAPI.cancelSettings called');
    ipcRenderer.send('cancel-settings');
  },
  getAvailableModels: (provider) => ipcRenderer.invoke('getAvailableModels', provider),

});

// Add some debugging
console.log('Preload script loaded, electronAPI exposed to window');

// Listen for any uncaught errors in the renderer
window.addEventListener('error', (e) => {
  console.error('Renderer error caught in preload:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection caught in preload:', e.reason);
});