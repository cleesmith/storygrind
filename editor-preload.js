const { contextBridge, ipcRenderer } = require('electron');

// Check for standalone mode using the environment variable
const isStandaloneMode = process.env.EDITOR_STANDALONE_MODE === 'true';
console.log(`Editor running in ${isStandaloneMode ? 'STANDALONE' : 'INTEGRATED'} mode`);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Quit application
    quitApp: () => ipcRenderer.send('app-quit'),
    
    // Force quit (stronger method)
    forceQuit: () => ipcRenderer.send('force-quit'),
    
    // Mode indicator for the renderer
    isStandaloneMode: isStandaloneMode,
    
    // File operations
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    
    // Event listeners
    onFileNew: (callback) => ipcRenderer.on('file-new', () => callback()),
    onFileSaveRequest: (callback) => ipcRenderer.on('file-save-request', () => callback()),
    onFileSaveAsRequest: (callback) => ipcRenderer.on('file-save-as-request', () => callback()),
    onFileOpened: (callback) => ipcRenderer.on('file-opened', (_, data) => callback(data))
  }
);
