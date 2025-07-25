const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || '.';

const excludes = [
    '.git',
    '.gitignore',
    'node_modules',
    '.DS_Store',
    'files.json',
    'generate-files.js',
    'index.html'
];

function shouldExclude(filePath) {
    return excludes.some(exclude => 
        filePath.includes(exclude) || path.basename(filePath) === exclude
    );
}

function getFiles(dir, basePath = '') {
    const result = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        
        if (shouldExclude(relativePath)) {
            continue;
        }
        
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile()) {
            result.push({
                path: relativePath.replace(/\\/g, '/'),
                birthtime: stats.birthtime
            });
        } else if (stats.isDirectory()) {
            const subFiles = getFiles(fullPath, relativePath);
            result.push(...subFiles);
        }
    }
    
    return result;
}

const filesWithDates = getFiles(targetDir);
const files = filesWithDates
    .sort((a, b) => a.birthtime - b.birthtime)
    .map(f => f.path);

const outputPath = path.join(targetDir, 'files.json');
fs.writeFileSync(outputPath, JSON.stringify(files, null, 2));
console.log(`Created ${outputPath} with ${files.length} files`);
