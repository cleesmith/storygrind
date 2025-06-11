// epub-converter.js
const ToolBase = require('./tool-base');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const xpath = require('xpath');

/**
 * EpubConverter Tool
 * Converts EPUB files to plain text
 */
class EpubConverter extends ToolBase {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {Object} config - Tool configuration
   */
  constructor(name, config = {}) {
    super(name, config);
  }

  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    console.log('Executing EPUB Converter with options:', options);
    
    // Extract options
    let epubFile = options.epub_file;
    const saveDir = appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    // Ensure file paths are absolute
    epubFile = this.ensureAbsolutePath(epubFile, saveDir);

    const outputFiles = [];
    
    try {
      // Read the input file
      this.emitOutput(`Reading EPUB file: ${epubFile}\n`);
      
      // Check if file exists
      if (!fs.existsSync(epubFile)) {
        throw new Error(`File not found: ${epubFile}`);
      }
      
      this.emitOutput(`Converting EPUB to text...\n`);
      
      // Read EPUB file as buffer
      const fileData = await fsPromises.readFile(epubFile);
      
      // Process the EPUB file
      const result = await this.processEpub(fileData);
      
      if (result.chapters.length === 0) {
        this.emitOutput(`No chapters found in EPUB file\n`);
      } else {
        this.emitOutput(`Extracted ${result.chapters.length} chapters\n`);
      }
      
      // Generate text content
      let allText = '';
      result.chapters.forEach((ch) => {
        if (ch.title) {
          allText += ch.title + '\n\n';
        }
        allText += ch.textBlocks.join('\n\n') + '\n\n';
      });
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(epubFile, '.epub');
      const outputFilename = `${baseFileName}_${timestamp}.txt`;
      
      // Write the output file
      const outputPath = await this.writeOutputFile(allText, saveDir, outputFilename);
      
      this.emitOutput(`\nConverted EPUB saved to: ${outputPath}\n`);
      outputFiles.push(outputPath);
      
      // Add to the file cache
      const toolName = 'epub_converter';
      fileCache.addFile(toolName, outputPath);
      
      // Return the result
      return {
        success: true,
        outputFiles,
        stats: {
          chapterCount: result.chapters.length,
          wordCount: this.countWords(allText)
        }
      };
    } catch (error) {
      console.error('Error in EPUB Converter:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Process an EPUB file
   * @param {Buffer} fileData - EPUB file data
   * @returns {Promise<Object>} - Processing result
   */
  async processEpub(fileData) {
    try {
      const zip = await JSZip.loadAsync(fileData);
      
      // 1. locate the OPF file via META-INF/container.xml
      const containerFile = zip.file("META-INF/container.xml");
      if (!containerFile) throw new Error("META-INF/container.xml not found.");
      
      const containerXml = await containerFile.async("text");
      const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
      
      // Set up namespaces for XPath if needed
      const select = xpath.useNamespaces({
        'ns': 'urn:oasis:names:tc:opendocument:xmlns:container',
        'opf': 'http://www.idpf.org/2007/opf'
      });
      
      const rootfileElement = containerDoc.getElementsByTagName("rootfile")[0];
      if (!rootfileElement) throw new Error("OPF file reference not found.");
      
      const opfPath = rootfileElement.getAttribute("full-path");
      if (!opfPath) throw new Error("OPF file path is missing.");
      
      // Get the base path (e.g. if opfPath is "OEBPS/content.opf", base = "OEBPS/")
      const basePath = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

      // 2. read the OPF file
      const opfFile = zip.file(opfPath);
      if (!opfFile) throw new Error("OPF file not found: " + opfPath);
      
      const opfXml = await opfFile.async("text");
      const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");

      // 3. build a manifest (id → href)
      const manifest = {};
      const items = opfDoc.getElementsByTagName("item");
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = item.getAttribute("id");
        const href = item.getAttribute("href");
        if (id && href) {
          manifest[id] = href;
        }
      }

      // 4. get the spine (reading order)
      const spineItems = [];
      const itemrefs = opfDoc.getElementsByTagName("itemref");
      for (let i = 0; i < itemrefs.length; i++) {
        const itemref = itemrefs[i];
        const idref = itemref.getAttribute("idref");
        if (idref && manifest[idref]) {
          spineItems.push(manifest[idref]);
        }
      }

      // 5. process each chapter file from the spine
      const chapters = [];
      
      // Define a list of unwanted titles
      const unwantedTitles = ["TITLE PAGE", "COPYRIGHT"];

      for (const itemHref of spineItems) {
        const chapterPath = basePath + itemHref;
        const chapterFile = zip.file(chapterPath);
        
        if (!chapterFile) {
          this.emitOutput(`Chapter file not found: ${chapterPath}\n`);
          continue;
        }
        
        const chapterContent = await chapterFile.async("text");
        
        // Parse the chapter content into a DOM
        const doc = new DOMParser().parseFromString(chapterContent, "text/html");
        
        // Extract and store the title from the first <h1>
        let title = "";
        const h1Elements = doc.getElementsByTagName("h1");
        if (h1Elements.length > 0) {
          title = h1Elements[0].textContent.trim();
          
          // Filter out unwanted titles
          if (unwantedTitles.includes(title.toUpperCase())) {
            this.emitOutput(`Skipping non-chapter content: ${title}\n`);
            continue;
          }
        }
        
        // Extract the body text
        let bodyText = "";
        const bodyElements = doc.getElementsByTagName("body");
        if (bodyElements.length > 0) {
          bodyText = bodyElements[0].textContent.trim();
        }
        
        // Split into paragraphs
        const textBlocks = bodyText.split(/\n\s*\n/).filter(block => block.trim() !== "");
        
        // Special handling for CONTENTS page
        if (title.toUpperCase() === "CONTENTS") {
          for (let i = 0; i < textBlocks.length; i++) {
            // If a line is non-empty and does not start with whitespace, add an indent
            if (textBlocks[i].trim() && !/^\s/.test(textBlocks[i])) {
              textBlocks[i] = "        " + textBlocks[i];
            }
          }
        }
        
        // If no title and content is too short, skip this chapter
        if (!title && textBlocks.join("").length < 100) {
          this.emitOutput(`Skipping empty or minimal chapter\n`);
          continue;
        }
        
        chapters.push({
          title: title,
          textBlocks: textBlocks
        });
      }

      return {
        chapters: chapters,
        success: true
      };
    } catch (error) {
      console.error('Error processing EPUB:', error);
      throw error;
    }
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Ensure file path is absolute
   * @param {string} filePath - File path (may be relative or absolute)
   * @param {string} basePath - Base path to prepend for relative paths
   * @returns {string} - Absolute file path
   */
  ensureAbsolutePath(filePath, basePath) {
    if (!filePath) return filePath;
    
    // Check if the path is already absolute
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Make the path absolute by joining with the base path
    return path.join(basePath, filePath);
  }
}

module.exports = EpubConverter;