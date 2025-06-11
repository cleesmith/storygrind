const fs = require('fs/promises');
const path = require('path');

async function readFile(filePath, encoding = 'utf-8') {
  try {
    const content = await fs.readFile(filePath, encoding);
    if (!content.trim()) {
      throw new Error(`File is empty: ${filePath}`);
    }
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

async function writeFile(filePath, content, encoding = 'utf-8') {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, encoding);
    return path.resolve(filePath);
  } catch (error) {
    throw error;
  }
}

module.exports = {
  readFile,
  writeFile
};
