// docx-comments.js
const ToolBase = require('./tool-base');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fileCache = require('./file-cache');
const appState = require('./state.js');
const mammoth = require('mammoth');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const xpath = require('xpath');
const os = require('os');

/**
 * DocxComments Tool
 * Extracts comments from a Word DOCX file and saves them to a text file
 */
class DocxComments extends ToolBase {
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
    console.log('Executing DocxComments with options:', options);
    
    // Extract options
    let docxFile = options.docx_file;
    const saveDir = options.save_dir || appState.CURRENT_PROJECT_PATH;
    
    if (!saveDir) {
      const errorMsg = 'Error: No save directory specified and no current project selected.\n' +
                      'Please select a project or specify a save directory.';
      this.emitOutput(errorMsg);
      throw new Error('No save directory available');
    }

    // Ensure file paths are absolute
    docxFile = this.ensureAbsolutePath(docxFile, saveDir);

    const outputFiles = [];
    
    try {
      // Read the input file
      this.emitOutput(`Reading DOCX file: ${docxFile}\n`);
      
      // Check if file exists
      if (!fs.existsSync(docxFile)) {
        throw new Error(`File not found: ${docxFile}`);
      }
      
      this.emitOutput(`Extracting comments from DOCX file...\n`);
      
      // Process the DOCX file
      const result = await this.processDocx(docxFile, saveDir);
      
      if (result.noComments) {
        this.emitOutput(`No comments found in document. Document content saved to: ${result.outputPath}\n`);
      } else {
        this.emitOutput(`Comments extracted and saved to: ${result.outputPath}\n`);
      }
      
      // Add to output files list
      outputFiles.push(result.outputPath);
      
      // Add to the file cache
      const toolName = 'docx_comments';
      fileCache.addFile(toolName, result.outputPath);
      
      // Return the result
      return {
        success: true,
        outputFiles
      };
    } catch (error) {
      console.error('Error in DocxComments:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }
  
  /**
   * Process a DOCX file to extract comments
   * @param {string} docxFilePath - Path to the DOCX file
   * @param {string} outputDir - Directory to save output
   * @returns {Promise<Object>} - Processing result
   */
  async processDocx(docxFilePath, outputDir) {
    let tempDir = null;
    
    try {
      // Extract comments from DOCX using multiple methods
      const extractionResult = await this.extractComments(docxFilePath);
      tempDir = extractionResult.tempDir; // Save temp directory for cleanup
      
      this.emitOutput(`Extracted ${extractionResult.comments.length} comments total\n`);
      
      if (extractionResult.comments.length === 0) {
        this.emitOutput('No comments found in the document\n');
        
        // Create minimal output with just document content
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
        const baseFileName = path.basename(docxFilePath, '.docx');
        const outputFilename = `${baseFileName}_content_only_${timestamp}.txt`;
        const outputPath = path.join(outputDir, outputFilename);
        
        await this.writeOutputFile(
          this.cleanupText(extractionResult.documentContent || 'No document content extracted'),
          outputDir,
          outputFilename
        );
        
        // Clean up temp files
        if (tempDir) {
          await this.cleanupTempFiles(tempDir);
        }
        
        return { noComments: true, outputPath };
      }
      
      // Generate formatted output with the comments
      const result = await this.generateFormattedOutput(extractionResult, docxFilePath, outputDir);
      
      // Clean up temp files after successful processing
      if (tempDir) {
        await this.cleanupTempFiles(tempDir);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error processing DOCX:', error);
      
      // Attempt to clean up temp files even if processing failed
      if (tempDir) {
        await this.cleanupTempFiles(tempDir);
      }
      
      throw error;
    }
  }
  
  /**
   * Extract comments from a DOCX file
   * @param {string} docxFilePath - Path to the DOCX file
   * @returns {Promise<Object>} - Extraction result with comments and content
   */
  async extractComments(docxFilePath) {
    this.emitOutput(`Extracting comments from: ${docxFilePath}\n`);
    
    try {
      // Create a temporary directory in the user's projects folder
      const extractDir = path.join(appState.PROJECTS_DIR, 'temp_docx_extraction');
      await fsPromises.mkdir(extractDir, { recursive: true });
      
      this.emitOutput(`Created temporary directory: ${extractDir}\n`);
      
      // First approach: Extract raw XML for detailed comment analysis
      const fileData = fs.readFileSync(docxFilePath);
      const zip = new JSZip();
      const doc = await zip.loadAsync(fileData);
      
      // Extract comments.xml for direct comment data
      const commentsXml = await this.extractFileFromZip(doc, 'word/comments.xml', extractDir);
      const documentXml = await this.extractFileFromZip(doc, 'word/document.xml', extractDir);
      
      if (!commentsXml || !documentXml) {
        this.emitOutput('Required XML files not found in DOCX. Trying alternative approach...\n');
      }
      
      // Parse comments from XML
      const commentsFromXml = commentsXml ? this.extractCommentsFromXml(commentsXml) : [];
      this.emitOutput(`Extracted ${commentsFromXml.length} comments from XML\n`);
      
      // Second approach: Use mammoth to get HTML with comments
      const result = await mammoth.convertToHtml({ path: docxFilePath });
      const html = result.value;
      
      // Save the HTML for inspection
      await fsPromises.writeFile(path.join(extractDir, 'document.html'), html);
      
      // Extract text content and comments from HTML
      const { documentContent, commentsFromHtml } = this.extractCommentsFromHtml(html);
      this.emitOutput(`Extracted ${commentsFromHtml.length} comments from HTML\n`);
      
      // Third approach: Parse document XML for comment references
      let commentRefs = {};
      if (documentXml) {
        commentRefs = this.extractCommentReferences(documentXml);
        this.emitOutput(`Found ${Object.keys(commentRefs).length} comment references in document XML\n`);
      }
      
      // Combine all comment sources, prioritizing XML comments with references
      const allComments = this.mergeCommentSources(commentsFromXml, commentsFromHtml, commentRefs);
      this.emitOutput(`Final comment count: ${allComments.length}\n`);
      
      return { 
        comments: allComments, 
        documentContent,
        tempDir: extractDir // Return the temp directory path for cleanup later
      };
    } catch (error) {
      console.error('Error extracting comments:', error);
      throw error;
    }
  }
  
  /**
   * Extract a file from ZIP archive
   * @param {Object} doc - JSZip document object
   * @param {string} fileName - File to extract
   * @param {string} extractDir - Directory to extract to
   * @returns {Promise<string|null>} - File content or null
   */
  async extractFileFromZip(doc, fileName, extractDir) {
    const file = doc.file(fileName);
    if (!file) {
      console.log(`${fileName} not found in DOCX file`);
      return null;
    }
    
    const content = await file.async('string');
    await fsPromises.writeFile(path.join(extractDir, path.basename(fileName)), content);
    return content;
  }
  
  /**
   * Extract comments from comments.xml
   * @param {string} commentsXml - XML content
   * @returns {Array} - Array of comment objects
   */
  extractCommentsFromXml(commentsXml) {
    const parser = new DOMParser();
    const commentsDoc = parser.parseFromString(commentsXml, 'text/xml');
    
    // Set up namespaces for XPath
    const select = xpath.useNamespaces({
      'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    });
    
    // Find all comment nodes
    const commentNodes = select('//w:comment', commentsDoc);
    console.log(`Found ${commentNodes.length} comment nodes in comments.xml`);
    
    const comments = [];
    
    // Extract comment information
    for (const node of commentNodes) {
      const id = node.getAttribute('w:id');
      const author = node.getAttribute('w:author') || 'Unknown';
      const date = node.getAttribute('w:date') || '';
      
      // Extract the comment text
      const textNodes = select('.//w:t', node);
      let commentText = '';
      
      for (const textNode of textNodes) {
        commentText += textNode.textContent;
      }
      
      comments.push({
        id,
        author,
        date,
        text: commentText.trim(),
        referencedText: '' // Will be filled later
      });
    }
    
    return comments;
  }
  
  /**
   * Extract comment references from document XML
   * @param {string} documentXml - Document XML content
   * @returns {Object} - Map of comment IDs to referenced text
   */
  extractCommentReferences(documentXml) {
    const parser = new DOMParser();
    const docXmlDoc = parser.parseFromString(documentXml, 'text/xml');
    
    // Set up namespaces for XPath
    const select = xpath.useNamespaces({
      'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    });
    
    const commentRefs = {};
    
    // Strategy 1: Look for commentRangeStart and commentRangeEnd pairs
    const paragraphs = select('//w:p', docXmlDoc);
    
    for (const paragraph of paragraphs) {
      // Get the text content of the paragraph
      const textContent = this.extractParagraphText(paragraph, select);
      
      // Look for comment ranges
      const commentRangeStarts = select('.//w:commentRangeStart', paragraph);
      
      for (const startNode of commentRangeStarts) {
        const commentId = startNode.getAttribute('w:id');
        
        if (commentId) {
          commentRefs[commentId] = textContent;
        }
      }
      
      // Look for simple comment references (sometimes there are no explicit ranges)
      const commentRefs2 = select('.//w:commentReference', paragraph);
      for (const refNode of commentRefs2) {
        const commentId = refNode.getAttribute('w:id');
        
        if (commentId && !commentRefs[commentId]) {
          commentRefs[commentId] = textContent;
        }
      }
    }
    
    return commentRefs;
  }
  
  /**
   * Extract text from a paragraph element
   * @param {Object} paragraph - Paragraph node
   * @param {Function} select - XPath select function
   * @returns {string} - Paragraph text
   */
  extractParagraphText(paragraph, select) {
    const textNodes = select('.//w:t', paragraph);
    let text = '';
    
    for (const node of textNodes) {
      text += node.textContent;
    }
    
    return text.trim();
  }
  
  /**
   * Extract comments from HTML content
   * @param {string} html - HTML content
   * @returns {Object} - Document content and comments
   */
  extractCommentsFromHtml(html) {
    // Extract comments using HTML comment syntax as a backup method
    const commentRegex = /<!--\s*(.*?)\s*-->/g;
    const comments = [];
    const documentContent = html.replace(commentRegex, ''); // Remove comments from content
    
    let match;
    let index = 0;
    
    while ((match = commentRegex.exec(html)) !== null) {
      const commentText = match[1].trim();
      
      // Attempt to find the nearest text by looking at the context around the comment
      const start = Math.max(0, match.index - 200); // Look 200 chars before comment
      const end = Math.min(html.length, match.index + 200); // Look 200 chars after comment
      const context = html.substring(start, end);
      
      // Remove HTML tags to get plain text
      const contextText = context.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      comments.push({
        id: `html-${index++}`,
        author: 'Unknown',
        date: '',
        text: commentText,
        referencedText: contextText
      });
    }
    
    return { documentContent, commentsFromHtml: comments };
  }
  
  /**
   * Merge comments from different sources
   * @param {Array} commentsFromXml - Comments from XML
   * @param {Array} commentsFromHtml - Comments from HTML
   * @param {Object} commentRefs - Comment references
   * @returns {Array} - Merged comments
   */
  mergeCommentSources(commentsFromXml, commentsFromHtml, commentRefs) {
    // First, add referenced text to XML comments
    const mergedComments = commentsFromXml.map(comment => {
      if (comment.id in commentRefs) {
        return {
          ...comment,
          referencedText: commentRefs[comment.id]
        };
      }
      return comment;
    });
    
    // If we didn't get enough XML comments, supplement with HTML comments
    if (mergedComments.length === 0) {
      return commentsFromHtml;
    }
    
    return mergedComments;
  }
  
  /**
   * Clean up text by replacing special characters
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  cleanupText(text) {
    if (!text) return '';
    
    // Replace non-breaking spaces (Unicode \u00A0 or ASCII 160) with regular spaces
    let cleaned = text.replace(/\u00A0/g, ' ');
    
    // Replace multiple spaces with a single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Generate formatted output with comments
   * @param {Object} extractionResult - Extraction result
   * @param {string} docxFilePath - Original DOCX file path
   * @param {string} outputDir - Directory to save output
   * @returns {Promise<Object>} - Output information
   */
  async generateFormattedOutput(extractionResult, docxFilePath, outputDir) {
    this.emitOutput('Generating formatted output of comments...\n');
    
    try {
      // Prepare the comments with their text for output
      let formattedComments = '';
      
      // Output comments with their referenced text
      if (extractionResult.comments.length > 0) {
        this.emitOutput(`Formatting ${extractionResult.comments.length} comments\n`);
        
        extractionResult.comments.forEach((comment, index) => {
          if (comment.referencedText && comment.referencedText.trim()) {
            // Clean up the referenced text
            const cleanedText = this.cleanupText(comment.referencedText);
            formattedComments += `original text:\n${cleanedText}\n\n`;
          }
          
          if (comment.text && comment.text.trim()) {
            // Clean up the comment text
            const cleanedComment = this.cleanupText(comment.text);
            formattedComments += `comment:\n${cleanedComment}\n\n`;
          }
          
          formattedComments += `---\n\n`;
        });
      } else {
        formattedComments = "No comments found in the document.";
        
        // Also output the document content for reference
        formattedComments += "\n\n=== DOCUMENT CONTENT ===\n\n";
        formattedComments += this.cleanupText(extractionResult.documentContent);
      }
      
      // Create output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15);
      const baseFileName = path.basename(docxFilePath, '.docx');
      const outputFilename = `${baseFileName}_comments_${timestamp}.txt`;
      
      // Write the output file
      const outputPath = await this.writeOutputFile(formattedComments, outputDir, outputFilename);
      
      this.emitOutput(`\nExtracted comments saved to: ${outputPath}\n`);
      
      return { outputPath };
      
    } catch (error) {
      console.error('Error generating formatted output:', error);
      throw error;
    }
  }
  
  /**
   * Clean up temporary files
   * @param {string} tempDir - Temporary directory path
   * @returns {Promise<void>}
   */
  async cleanupTempFiles(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        this.emitOutput(`Cleaning up temporary directory: ${tempDir}\n`);
        
        // Read all files in the directory
        const files = await fsPromises.readdir(tempDir);
        
        // Delete each file
        for (const file of files) {
          await fsPromises.unlink(path.join(tempDir, file));
        }
        
        // Remove the directory
        await fsPromises.rmdir(tempDir);
        this.emitOutput('Temporary files cleaned up successfully\n');
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
      // Continue execution even if cleanup fails
    }
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

module.exports = DocxComments;