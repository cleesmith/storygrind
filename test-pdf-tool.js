const ManuscriptToPDF = require('./manuscript-to-pdf');

// Mock appState
global.appState = {
  CURRENT_PROJECT_PATH: '.',
  getAuthorName: () => 'Test Author'
};

const tool = new ManuscriptToPDF('test');
tool.on('output', data => process.stdout.write(data));

tool.execute({
  text_file: 'manuscript.txt',
  title: 'Test Book',
  author: 'Test Author'
}).then(result => {
  console.log('Done!', result);
}).catch(console.error);
