#!/usr/bin/env node

/**
 * SVG to JPG Standalone Converter (Electron App)
 * 
 * This is a minimal Electron app that converts SVG files to JPG format.
 * It's designed to be spawned as a separate process from the main application.
 * 
 * Usage: electron svg-to-jpg-standalone.js /path/to/project/directory
 * 
 * The app will:
 * 1. Look for SVG files in the specified directory
 * 2. Convert them to JPG format using Electron's renderer canvas
 * 3. Save the JPG files in the same directory
 * 4. Exit when done
 */

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Get project path from command line argument
const projectPath = process.argv[2];

if (!projectPath) {
  console.error('Usage: electron svg-to-jpg-standalone.js /path/to/project/directory');
  process.exit(1);
}

if (!fs.existsSync(projectPath)) {
  console.error(`Project directory does not exist: ${projectPath}`);
  process.exit(1);
}

let mainWindow;

function createWindow() {
  // Create a hidden browser window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 2560,
    show: false, // Hidden window
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load about:blank (no HTML file needed)
  mainWindow.loadURL('about:blank');

  // When the window is ready, start the conversion
  mainWindow.webContents.once('did-finish-load', () => {
    convertSVGFiles();
  });
}

async function convertSVGFiles() {
  try {
    // Find SVG files in the project directory
    const files = fs.readdirSync(projectPath);
    const svgFiles = files.filter(file => file.toLowerCase().endsWith('.svg'));
    
    if (svgFiles.length === 0) {
      console.log('No SVG files found in project directory');
      app.quit();
      return;
    }
    
    console.log(`Found ${svgFiles.length} SVG file(s) to convert`);
    
    // Convert each SVG file
    for (const svgFile of svgFiles) {
      const svgFilePath = path.join(projectPath, svgFile);
      const jpgFileName = svgFile.replace(/\.svg$/i, '.jpg');
      const jpgFilePath = path.join(projectPath, jpgFileName);
      
      await convertSVGToJPG(svgFilePath, jpgFilePath);
    }
    
    console.log('SVG to JPG conversion completed');
    app.quit();
    
  } catch (error) {
    console.error('Error in convertSVGFiles:', error.message);
    app.quit();
  }
}

async function convertSVGToJPG(svgFilePath, jpgFilePath) {
  try {
    // Read SVG file
    const svgContent = fs.readFileSync(svgFilePath, 'utf8');
    
    // Execute JavaScript in the renderer process to convert SVG to JPG
    const jpgBase64 = await mainWindow.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        try {
          const svgBlob = new Blob([${JSON.stringify(svgContent)}], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();
          
          img.onload = function() {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 1600;
              canvas.height = 2560;
              const ctx = canvas.getContext('2d');
              
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 1600, 2560);
              ctx.drawImage(img, 0, 0, 1600, 2560);
              
              URL.revokeObjectURL(url);
              
              const dataURL = canvas.toDataURL('image/jpeg', 0.94);
              const base64Data = dataURL.replace(/^data:image\\/jpeg;base64,/, '');
              resolve(base64Data);
            } catch (error) {
              reject(error);
            }
          };
          
          img.onerror = () => reject(new Error('Failed to load SVG'));
          img.src = url;
        } catch (error) {
          reject(error);
        }
      })
    `);
    
    // Save JPG file
    fs.writeFileSync(jpgFilePath, Buffer.from(jpgBase64, 'base64'));
    
    console.log(`Successfully converted: ${path.basename(svgFilePath)} → ${path.basename(jpgFilePath)}`);
    return true;
    
  } catch (error) {
    console.error(`Error converting ${svgFilePath}:`, error.message);
    return false;
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});