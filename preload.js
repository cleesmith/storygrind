// preload.js

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
  openProjectFolder: (folderPath) => ipcRenderer.send('open-project-folder', folderPath),

  // Provider setup (legacy - may be unused)
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
  importFile: (options) => ipcRenderer.invoke('import-file', options),
  
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
  openInEditor: (promptPath) => ipcRenderer.invoke('openInEditor', promptPath),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  closeEditorDialog: () => {
    console.log("PRELOAD: Sending close-editor-dialog IPC");
    ipcRenderer.send('close-editor-dialog');
  },
  openInDefaultEditor: (filePath) => ipcRenderer.send('open-in-default-editor', filePath),

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
  openProjectSettings: () => {
    console.log('electronAPI.openProjectSettings called');
    ipcRenderer.send('open-project-settings');
  },
  readProjectMetadata: (projectName, filename) => ipcRenderer.invoke('read-project-metadata', projectName, filename),
  writeProjectMetadata: (projectName, filename, content) => ipcRenderer.invoke('write-project-metadata', projectName, filename, content),
  closeProjectSettings: () => ipcRenderer.send('close-project-settings'),
  cancelProjectSettings: () => ipcRenderer.send('cancel-project-settings'),
  getCurrentSettings: () => ipcRenderer.invoke('get-current-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  saveOpenRouterKey: (apiKey) => ipcRenderer.invoke('save-openrouter-key', apiKey),
  hasOpenRouterKey: () => ipcRenderer.invoke('has-openrouter-key'),
  getOpenRouterKey: () => ipcRenderer.invoke('get-openrouter-key'),
  saveClaudeKey: (apiKey) => ipcRenderer.invoke('save-claude-key', apiKey),
  hasClaudeKey: () => ipcRenderer.invoke('has-claude-key'),
  getClaudeKey: () => ipcRenderer.invoke('get-claude-key'),
  saveOpenaiKey: (apiKey) => ipcRenderer.invoke('save-openai-key', apiKey),
  hasOpenaiKey: () => ipcRenderer.invoke('has-openai-key'),
  getOpenaiKey: () => ipcRenderer.invoke('get-openai-key'),
  saveGeminiKey: (apiKey) => ipcRenderer.invoke('save-gemini-key', apiKey),
  hasGeminiKey: () => ipcRenderer.invoke('has-gemini-key'),
  getGeminiKey: () => ipcRenderer.invoke('get-gemini-key'),
  cancelSettings: () => {
    console.log('electronAPI.cancelSettings called');
    ipcRenderer.send('cancel-settings');
  },
  getAvailableModels: (provider) => ipcRenderer.invoke('getAvailableModels', provider),
  getClientDefaultModel: (provider) => ipcRenderer.invoke('get-client-default-model', provider),

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