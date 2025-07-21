// test-pdf-tool-simple.js
const path = require('path');

// Directly modify the actual appState module
const appState = require('./state.js');
appState.CURRENT_PROJECT_PATH = process.cwd();

// Now load the tool
const ManuscriptToPDF = require('./manuscript-to-pdf');

const tool = new ManuscriptToPDF('test');

tool.execute({
  text_file: 'manuscript.txt',
  title: 'Water That Speaks',
  author: 'Clee Smith',
  publisher: 'Slip the Trap'
}).then(result => {
  console.log('Done!', result);
}).catch(console.error);
