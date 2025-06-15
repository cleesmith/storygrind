const fs = require('fs');
const path = require('path');

function concatenateTxtFiles(folderPath, outputFileName = 'all_prompts.txt') {
    try {
        // Check if folder exists
        if (!fs.existsSync(folderPath)) {
            console.error(`Error: Folder "${folderPath}" does not exist.`);
            return;
        }

        // Read directory contents
        const files = fs.readdirSync(folderPath);
        
        // Filter for .txt files and sort alphabetically
        const txtFiles = files
            .filter(file => path.extname(file).toLowerCase() === '.txt')
            .sort();

        if (txtFiles.length === 0) {
            console.log('No .txt files found in the specified folder.');
            return;
        }

        console.log(`Found ${txtFiles.length} .txt files:`);
        txtFiles.forEach(file => console.log(`  - ${file}`));

        // Read and concatenate all files
        let concatenatedContent = '';
        
        txtFiles.forEach((file, index) => {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Add file separator with filename
            concatenatedContent += `\n--- ${file} ---\n`;
            concatenatedContent += content;
            
            // Add extra newline between files (except for the last one)
            if (index < txtFiles.length - 1) {
                concatenatedContent += '\n\n';
            }
            
            console.log(`Processed: ${file}`);
        });

        // Write concatenated content to output file
        const outputPath = path.join(folderPath, outputFileName);
        fs.writeFileSync(outputPath, concatenatedContent.trim(), 'utf8');
        
        console.log(`\nSuccess! Concatenated ${txtFiles.length} files into: ${outputPath}`);
        
    } catch (error) {
        console.error('Error occurred:', error.message);
    }
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node concatenate-txt.js <folder-path> [output-filename]');
        console.log('Example: node concatenate-txt.js ./my-texts merged.txt');
        process.exit(1);
    }
    
    const folderPath = args[0];
    const outputFileName = args[1] || 'concatenated_output.txt';
    
    concatenateTxtFiles(folderPath, outputFileName);
}

// Export for use as module
module.exports = { concatenateTxtFiles };