/*
 * Copyright (c) 2016 José F. Maldonado
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. 
 * If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Load dependencies.
const fs = require('fs');
const path = require('path');
const os = require('os');
const tmp = require('tmp');
const Zip = require('adm-zip');
const stripBOM = require('strip-bom');
const Dictionary = require('./dictionary.js');

// StoryGrind: Use user directory for dictionaries
const USER_DICT_PATH = path.join(os.homedir(), 'storygrind_projects', 'tool-prompts', 'dictionaries');

// Handle bundled dictionary path for both development and packaged app
let BUNDLED_DICT_PATH;
try {
    const { app } = require('electron');
    if (app && app.isPackaged) {
        // In packaged app, extraResource 'lib/spellchecker/dict' becomes 'Resources/dict'
        BUNDLED_DICT_PATH = path.join(process.resourcesPath, 'dict');
    } else {
        // In development (npm start)
        BUNDLED_DICT_PATH = path.join(__dirname, 'dict');
    }
} catch (e) {
    // Fallback if electron app not available (shouldn't happen in our case)
    BUNDLED_DICT_PATH = path.join(__dirname, 'dict');
}

// Define module.
var SpellChecker = {
    /**
     * Create a dictionary from a file, which might be either a .dic or a .zip file.
     *
     * @param {String} fileName The name of the file from which read the word list.
     * @param {String} folderPath The path to the directory in which the file is located (optional).
     * @param {Callback} callback A function to invoke when either the dictionary was created or an error was found.
     */
    getDictionary: function(fileName, folderPath /*, callback*/) {
        try{
            // StoryGrind: Always use user directory for dictionaries
            var folder = USER_DICT_PATH;
            var callback = arguments[arguments.length - 1];
            var dic_path = path.join(folder, fileName + '.dic');
            
            // Verify if the dictionary file exists in user directory
            fs.exists(dic_path, function(exists) {
                if(exists) {
                    // The file exists, read it.
                    SpellChecker._readFile(dic_path, callback);
                } else {
                    // Dictionary not found in user directory
                    callback('The dictionary could not be read, no file with the name "' + fileName + '.dic" could be found in ' + folder + '. Make sure dictionaries are extracted to user directory on first run.', null);
                }
            });
        } catch(err) {
            // Return error.
            if(callback) callback('An unexpected error ocurred: ' + err, null);
        }
    },
  
    /**
     * Create a dictionary from a .dic file.
     *
     * @param {String} file_path The path of the file.
     * @param {Callback} callback A function to invoke when either the dictionary was created or an error was found.
     */  
    _readFile: function(file_path, callback) {
        fs.readFile(file_path, 'utf8', function(err, text) {
            // Check for errors.
            if (!err) {
                // Create dictionary and return it.
                var dictionary = new Dictionary(text.split('\n'));
                callback(null, dictionary);
            } else {
                // Return an error.
                callback("The dictionary file could not be read: " + err, null);
            }
        });
    },

    /**
     * Create a dictionary from a .dic file synchronously.
     *
     * @param {String} file_path The path of the file.
     * @returns The created dictionary
     * @throws An error if the file couldn't be opened
     */  
    _readFileSync: function(file_path) {
        try {
            var text = fs.readFileSync(file_path, 'utf8')
            // Create dictionary and return it.
            var dictionary = new Dictionary(text.split('\n'));
            return dictionary;
        } catch(err) {
            // Return an error.
            throw new Error("The dictionary file could not be read: " + file_path + ". Error: " + err);
        }
    },

    /**
     * Unzip a zip file.
     *
     * Each entry in the zip file will be extracted atomically. From the perspective of another
     * process, the unzipped file will either not exist or will be fully unzipped.
     *
     * @param {String} zipPath The path of the zip file.
     * @param {String} destinationDir The directory to unzip into.
     * @throws An error if the file couldn't be unzipped.
     */
    _unzipSync: function(zipPath, destinationDir) {
        // Unzip into a tmp directory.
        var tmpDir = tmp.dirSync({ dir: destinationDir });
        var zip = new Zip(zipPath);
        zip.extractAllTo(tmpDir.name);

        // Move the unzipped files out of the tmp directory and into the destination directory.
        zip.getEntries().forEach(({ entryName }) => {
            var from = path.join(tmpDir.name, entryName);
            var to = path.join(destinationDir, entryName);
            fs.renameSync(from, to);
        });

        // Clean up the tmp directory
        tmpDir.removeCallback();
    },
  
    /**
     * Create a dictionary from a .dic file .
     *
     * @param {String} fileName The name of the file from which read the word list.
     * @param {String} folderPath The path to the directory in which the file is located (optional).
     * @return {Object} An instance of the Dictionary class.
     * @throws {Exception} If the dictionary's file can't be found or is invalid.
     */  
    getDictionarySync: function(fileName, folderPath) {
        try{
            // StoryGrind: Always use user directory for dictionaries
            var folder = USER_DICT_PATH;
            var dic_path = path.join(folder, fileName + '.dic');
          
            // Verify if the dictionary file exists in user directory
            if(fs.existsSync(dic_path)) {
                // The file exists, read it.
                var dictionary = SpellChecker._readFileSync(dic_path);
                return dictionary;
            } else {
                // Dictionary not found in user directory
                throw new Error('The dictionary could not be read, no file with the name "' + fileName + '.dic" could be found in ' + folder + '. Make sure dictionaries are extracted to user directory on first run.');
            }
        } catch(err) {
            // Throw an error.
            throw new Error('An unexpected error ocurred: ' + err);
        }
    },

    /**
     * StoryGrind: Extract all bundled dictionary ZIP files to user directory
     * This should be called on first app launch
     */
    extractDictionariesToUserDir: function() {
        try {
            // Ensure user dictionary directory exists
            if (!fs.existsSync(USER_DICT_PATH)) {
                fs.mkdirSync(USER_DICT_PATH, { recursive: true });
            }

            // Get all ZIP files from bundled dictionary directory
            const zipFiles = fs.readdirSync(BUNDLED_DICT_PATH).filter(file => file.endsWith('.zip'));
            
            let extractedCount = 0;
            zipFiles.forEach(zipFile => {
                const zipPath = path.join(BUNDLED_DICT_PATH, zipFile);
                const dicFileName = zipFile.replace('.zip', '.dic');
                const dicPath = path.join(USER_DICT_PATH, dicFileName);
                
                // Only extract if .dic file doesn't already exist
                if (!fs.existsSync(dicPath)) {
                    SpellChecker._unzipSync(zipPath, USER_DICT_PATH);
                    extractedCount++;
                }
            });

            return {
                success: true,
                message: `Extracted ${extractedCount} dictionaries to ${USER_DICT_PATH}`,
                extractedCount: extractedCount,
                totalZipFiles: zipFiles.length
            };
        } catch (err) {
            throw new Error('Failed to extract dictionaries: ' + err.message);
        }
    },
    
    /**
     * Reads a UTF8 dictionary file, removes the BOM and \r characters and sorts the list of words.
     *
     * @param {String} inputPath The path for the input file.
     * @param {String} outputPath The path to output (optional, by default is equals to the input file).
     * @param {Callback} callback A function to invoke after finishing.
     */
    normalizeDictionary: function(inputPath, outputPath /*, callback*/) {
        try{
            // Parses arguments
            if(!outputPath || typeof outputPath != 'string') outputPath = inputPath;
            var callback = arguments.length > 0? arguments[arguments.length - 1] : function() {};
            
            // Verify if the dictionary file exists.
            fs.exists(inputPath, function(exists) {
                if(exists) {
                    // The file exists, read it.
                    fs.readFile(inputPath, 'utf8', function(err, content) {
                        // Check for errors.
                        if (!err) {
                            // Remove BOM and \r characters.
                            content = stripBOM(content);
                            content = content.replace(/\r/g, '');
                            
                            // Sort words.
                            var lines = content.split('\n');      
                            var collator = new Intl.Collator(); // Use this comparator for consider accents and special characters.
                            lines = lines.sort(collator.compare);
                            
                            // Generate output content.
                            var newContent = '';  
                            var first = true;
                            for(var i=0; i<lines.length; i++) {          
                                if(lines[i] != '' && lines[i] != '\n') {
                                    if(!first) newContent += '\n';
                                    newContent += lines[i];
                                    first = false;
                                }
                            }
                            
                            // Write output file.
                            fs.writeFile(outputPath, newContent, 'utf8', function(err) {
                                // Return result.
                                callback(err? ("The output file could not be writted: " + err) : null, !err);
                            });
                        } else {
                            // Return an error.
                            callback("The input file could not be read: " + err, false);
                        }
                    });
                } else {
                    // Return an error indicating that the file doens't exists.
                    callback("The input file does not exists", false);
                }            
            });
        } catch(err) {
            // Return an error.
            callback('An unexpected error ocurred: ' + err, false);
        }
    }
}

// Export module.
module.exports = SpellChecker;
