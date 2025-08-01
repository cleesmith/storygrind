// tool-system.js
const fs = require('fs');
const path = require('path');

// Basic logging setup that works even if logToFile isn't defined in this context
function safeLog(message) {
  // Log to console first (works in development)
  console.log(message);
  
  // Try to log to file if the function exists in global scope (from main.js)
  if (typeof global.logToFile === 'function') {
    global.logToFile(`[tool-system.js] ${message}`);
  } else {
    // Fallback file logging if needed
    try {
      // const fs = require('fs');
      // const path = require('path');
      // const os = require('os');
      // const logPath = path.join(os.homedir(), 'storygrind-debug.log');
      // const timestamp = new Date().toISOString();
      // const logLine = `${timestamp}: [tool-system.js] ${message}\n`;
      // fs.appendFileSync(logPath, logLine);
    } catch (e) {
      // Can't do anything if this fails
    }
  }
}

// Log module loading
// safeLog('Module loading started');

// Log require attempts
// try {
//   // safeLog('Loading base modules...');
//   const { app } = require('electron');
//   safeLog('Base modules loaded successfully');
// } catch (error) {
//   safeLog(`ERROR loading base modules: ${error.message}`);
// }

const AiApiService = require('./client');
const toolDiscovery = require('./tool-discovery');
const GenericAITool = require('./generic-ai-tool');
const appState = require('./state.js');

const toolRegistry = require('./registry');

function loadToolClass(toolName) {
  const hyphenatedName = toolName.replace(/_/g, '-');
  
  // Get the directory where tool-system.js is located
  const baseDir = __dirname;
  // console.log(`Base directory for tool loading: ${baseDir}`);
  
  // Safe logging that works in any context
  function log(message) {
    // console.log(message);
    if (typeof global.logToFile === 'function') {
      global.logToFile(`[tool-system] ${message}`);
    }
  }
  
  log(`Loading tool: ${toolName} (${hyphenatedName}.js)`);
  log(`Base directory for tool loading: ${baseDir}`);
  
  try {
    // Use path.resolve to get absolute path to the module
    const modulePath = path.resolve(baseDir, `${hyphenatedName}.js`);
    log(`Resolved tool ${toolName} to: ${modulePath}`);
    
    // Check if file exists
    if (fs.existsSync(modulePath)) {
      // log(`File exists at: ${modulePath}`);
      const module = require(modulePath);
      // log(`Successfully loaded module: ${hyphenatedName}.js`);
      return module;
    } else {
      log(`ERROR: Tool file not found at: ${modulePath}`);
      
      // Try an alternative location as a last resort
      const altPath = path.resolve(baseDir, '..', `${hyphenatedName}.js`);
      log(`Trying alternative path: ${altPath}`);
      
      if (fs.existsSync(altPath)) {
        log(`File exists at alternative path: ${altPath}`);
        const module = require(altPath);
        log(`Successfully loaded module from alternative path: ${hyphenatedName}.js`);
        return module;
      }
      
      throw new Error(`Tool file not found: ${hyphenatedName}.js`);
    }
  } catch (error) {
    log(`ERROR loading tool ${toolName}: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
    throw error;
  }
}

// Exception tools that remain as traditional classes:
const TokensWordsCounter = loadToolClass('tokens-words-counter');
const ProofreaderSpelling = loadToolClass('proofreader-spelling');
const DocxComments = loadToolClass('docx-comments');
const EpubConverter = loadToolClass('epub-converter');
const ManuscriptToEpub = loadToolClass('manuscript-to-epub');
const ManuscriptToHtml = loadToolClass('manuscript-to-html');
const PublishManuscript = loadToolClass('publish-manuscript');

// AI Writing tools with external prompts:
const WritingAITool = require('./writing-ai-tools');
const ChapterWriter = loadToolClass('chapter-writer');

const TOOL_DEFS = [
  { id: 'tokens_words_counter', title: `Tokens & Words Counter`, description: `This tool can test that your AI API key is working properly!  Also, use it to count the approximate tokens and words in text files.`, Class: TokensWordsCounter, options: [
    {
      "name": "input_file",
      "label": "Input File",
      "type": "file",
      "description": "Count tokens & words in text file.",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": [
            "txt"
          ]
        }
      ]
    }
  ]},
  { id: 'brainstorm', title: `Brainstorm`, description: `Helps generate initial story ideas. Appends more ideas to the existing 'ideas.txt' file.`, Class: WritingAITool, options: [
    {
      "name": "ideas_file",
      "label": "Ideas File",
      "type": "file",
      "description": "Path to ideas.txt file containing the concept and/or characters",
      "required": true,
      "default": "ideas.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'outline_writer', title: `Outline Writer`, description: `Generates a plot outline from your brainstorming file.`, Class: WritingAITool, options: [
    {
      "name": "brainstorm_file",
      "label": "Brainstorm File",
      "type": "file",
      "description": "File containing concept and characters information from brainstorming",
      "required": true,
      "default": "brainstorm.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'world_writer', title: `World Writer`, description: `Extract and develop characters and world elements from an outline.  All three files become useful during chapter writing.`, Class: WritingAITool, options: [
    {
      "name": "title",
      "label": "TITLE",
      "type": "text",
      "description": "Title of story",
      "required": true,
      "default": "",
      "group": "Content Configuration"
    },
    {
      "name": "pov",
      "label": "POV",
      "type": "text",
      "description": "Point of view",
      "required": true,
      "default": "third person perspective",
      "group": "Content Configuration"
    },
    {
      "name": "brainstorm_file",
      "label": "Brainstorm File",
      "type": "file",
      "description": "Brainstorm",
      "required": true,
      "default": "brainstorm.txt",
      "group": "Input Files"
    },
    {
      "name": "outline_file",
      "label": "Outline File",
      "type": "file",
      "description": "Path to the outline file",
      "required": true,
      "default": "outline.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'chapter_writer', title: `Chapter Writer`, description: `Uses the outline and world files, along with any existing manuscript to write rough draft chapters that are missing from the manuscript. *** WARNING: be sure to set the Title and POV in Project Settings.`, Class: ChapterWriter, options: [
    {
      "name": "manuscript",
      "label": "manuscript",
      "type": "file",
      "description": "Path to manuscript file",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    },
    {
      "name": "outline",
      "label": "outline",
      "type": "file",
      "description": "Path to outline file",
      "required": true,
      "default": "outline.txt",
      "group": "Input Files"
    },
    {
      "name": "world",
      "label": "world",
      "type": "file",
      "description": "Path to world file",
      "required": false,
      "default": "world.txt",
      "group": "Input Files"
    },
  ]},
  { id: 'publish_manuscript', title: 'Publish or Unpublish Manuscript', description: '>>> WARNING: be sure to setup title, author, and so on using the Project Settings button <<<  ... This tool publishes manuscript based files--cover.jpg, .html, .epub, and .pdf files to your Writing Project folder in: "~/storygrind_projects".  As well as, updating the book index at: "~/storygrind_projects/index.html"', Class: PublishManuscript, options: [
      {
        "name": "manuscript_file",
        "label": "Manuscript File",
        "type": "file",
        "description": "Select a manuscript file to be used for creating .html, .epub, and .pdf files for publishing",
        "required": true,
        "default": "manuscript.txt",
        "filters": [
          {
            "name": "Text Files",
            "extensions": ["txt"]
          }
        ]
      },
      {
        "name": "cover_image",
        "label": "Cover .jpg file",
        "type": "file",
        "description": "Select a cover JPG",
        "required": true,
        "default": "cover.jpg",
        "filters": [
          {
            "name": "Image Files",
            "extensions": ["jpg"]
          }
        ]
      },
      {
        "name": "back_image",
        "label": "Back cover .jpg file",
        "type": "file",
        "description": "Select a back cover image, usually author photo",
        "required": false,
        "default": "",
        "filters": [
          {
            "name": "Image Files",
            "extensions": ["jpg"]
          }
        ]
      },
      {
        "name": "max_chapters",
        "label": "Max Chapters revealed in HTML",
        "type": "select",
        "description": "Select Chapter 1 as a sample of your writing, or All Chapters for entire manuscript.",
        "required": false,
        "default": "1",
        "choices": [
          { "value": "1", "label": "Chapter 1" },
          { "value": "all", "label": "All Chapters" }
        ]
      },
      {
        "name": "show_what",
        "label": "Show HTML and/or EPUB",
        "type": "select",
        "description": "What to make visible on the list of books index.html page. <br> Note that <b>HTML</b>, <b>EPUB</b>, and <b>PDF</b> (<i>never visible</i>) are always created for publishing somewhere.",
        "required": false,
        "default": "both",
        "choices": [
          { "value": "both", "label": "Show both HTML and EPUB files - make both clickable/visible" },
          { "value": "html", "label": "Show HTML only" },
          { "value": "epub", "label": "Show EPUB only" }
        ]
      },
      {
        "name": "unpublish",
        "label": "Unpublish this book",
        "type": "select",
        "description": "Remove this book from the published index; not clickable/visible",
        "required": false,
        "default": "no",
        "choices": [
          { "value": "no", "label": "No - Update HTML, EPUB, and PDF then Publish" },
          { "value": "yes", "label": "Yes - Unpublish (this does NOT delete: covers, HTML, EPUB, or PDF files)" }
        ]
      }
  ]},
  { id: 'proofreader_spelling', title: `Proofreader Spelling`, description: `Since AI's are not useful for spell checking words in entire manuscripts ... too much to ask I suppose.  However this tool is blazingly fast; Moby Dick in under 2 seconds.  Honestly though, most editor software like: Word, Pages, google Docs, Reedsy, Vellum (best!) and so on offer good spell checking already.`, Class: ProofreaderSpelling, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Manuscript to spell check.",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": ["txt"]
        }
      ],
      "group": "Input Files"
    }
  ]},
  { id: 'docx_comments', title: 'DOCX: Extract Comments as Text', description: 'Extracts comments and associated text from DOCX files and saves them to a text file', Class: DocxComments, options: [
      {
        "name": "docx_file",
        "label": "DOCX File",
        "type": "file",
        "description": "Word document file containing comments to extract and match to text",
        "required": true,
        "default": "",
        "filters": [
          {
            "name": "DOCX Files",
            "extensions": ["docx"]
          }
        ],
        "group": "Input Files"
      }
  ]},
  { id: 'epub_converter', title: 'EPUB to TXT Converter', description: 'Converts EPUB files to plain text format while preserving structure', Class: EpubConverter, options: [
      {
        "name": "epub_file",
        "label": "EPUB File",
        "type": "file",
        "description": "EPUB file to convert to plain text",
        "required": true,
        "filters": [
          {
            "name": "EPUB Files",
            "extensions": ["epub"]
          }
        ]
      }
  ]}

];

module.exports = TOOL_DEFS;

async function initializeToolSystem(settings) {
  // console.log('Initializing tool system...');
  
  if (typeof global.logToFile === 'function') {
    global.logToFile('[tool-system] Starting tool system initialization');
  }
  
  try {
    // Initialize appState to ensure AUTHOR_NAME is loaded from persistent storage
    await appState.initialize();
    // Get the API service constructor from the factory
    const createApiService = require('./client');
    const AiApiServiceClass = createApiService();
    
    let aiAPIService = null;
    
    if (AiApiServiceClass) {
      // Create AI API service instance with the provided settings
      aiAPIService = new AiApiServiceClass(settings);
      // console.log('Created AI API Service instance');
    } else {
      console.warn('No AI API Service - user skipped setup or no provider configured');
    }
    
    // Discover user-created tools
    const userTools = await toolDiscovery.discoverUserTools();
    const builtInToolIds = TOOL_DEFS.map(def => def.id);
    const filteredUserTools = toolDiscovery.filterConflictingTools(userTools, builtInToolIds);
    
    if (typeof global.logToFile === 'function') {
      global.logToFile(`[tool-system] Discovered ${filteredUserTools.length} user-created tools`);
    }
    
    // Update author field defaults with persisted author name
    const publishingToolIds = ['manuscript_to_epub', 'manuscript_to_html', 'publish_manuscript'];
    TOOL_DEFS.forEach(toolDef => {
      if (publishingToolIds.includes(toolDef.id)) {
        const authorOption = toolDef.options.find(option => option.name === 'author');
        if (authorOption) {
          authorOption.default = appState.AUTHOR_NAME;
        }
      }
    });
    
    // Combine built-in and user tools
    const allToolDefs = [...TOOL_DEFS, ...filteredUserTools];
    
    // Define which tools are non-AI and don't need AI API service
    const nonAiToolIds = ['docx_comments', 'epub_converter', 'proofreader_spelling', 'manuscript_to_epub', 'manuscript_to_html', 'publish_manuscript', 'project_settings'];
    
    // Register each tool with proper configuration
    let toolCount = 0;
    allToolDefs.forEach(def => {
      if (typeof global.logToFile === 'function') {
        global.logToFile(`[tool-system] Registering tool #${toolCount + 1}: ${def.id}`);
      }
      
      // Create tool config with all properties from definition
      const toolConfig = {
        name: def.id,
        toolId: def.id, // For GenericAITool
        title: def.title,
        description: def.description,
        options: def.options || [],
        category: def.category,
        promptPath: def.promptPath, // For user-created tools
        ...settings
      };
      
      // console.log(`Creating instance of tool: ${def.id}`);
      
      // Create tool instance
      let instance;
      
      // Check if this is a user-created tool
      if (def.isUserCreated) {
        // User-created tools use GenericAITool
        if (aiAPIService) {
          instance = new GenericAITool(aiAPIService, toolConfig);
          // console.log(`Initialized user-created tool ${def.id} with GenericAITool`);
        } else {
          console.warn(`No API service available for user-created tool ${def.id} - creating without service`);
          instance = new GenericAITool(null, toolConfig);
        }
      } else if (nonAiToolIds.includes(def.id)) {
        // Non-AI tools don't get AI API service
        instance = new def.Class(def.id, toolConfig);
        // console.log(`Initialized non-AI tool ${def.id} without AI API service`);
      } else {
        // Built-in AI tools get AI API service as first parameter (if available)
        if (aiAPIService) {
          // console.log(`Passing aiAPIService to AI tool ${def.id}`);
          instance = new def.Class(aiAPIService, toolConfig);
          
          // Verify the service was stored
          // console.log(`Tool ${def.id} has apiService: ${!!instance.apiService}`);
          
          // If the tool doesn't properly store apiService, add it here
          if (!instance.apiService) {
            // console.log(`Manually setting apiService for tool ${def.id}`);
            instance.apiService = aiAPIService;
          }
          
          // console.log(`Initialized AI tool ${def.id} with AI API service`);
        } else {
          // No API service available - create tool without it
          console.warn(`No API service available for AI tool ${def.id} - creating without service`);
          instance = new def.Class(null, toolConfig);
        }
      }
      
      // Add to registry
      toolRegistry.registerTool(def.id, instance);
      
      // Verify the tool in registry
      const registeredTool = toolRegistry.getTool(def.id);
      // console.log(`Verified tool ${def.id} in registry has apiService: ${!!registeredTool.apiService}`);
      
      toolCount++;
    });
    
    // Log registration summary
    const allTools = toolRegistry.getAllToolIds();
    
    return { AiApiService: aiAPIService, toolRegistry };
  } catch (error) {
    console.error(`[tool-system] ERROR during initialization: ${error.message}`);
    throw error;
  }
}

/**
 * Execute a tool by ID
 * @param {string} toolId - Tool ID
 * @param {Object} options - Tool options
 * @param {string} runId - Optional run ID for tracking
 * @returns {Promise<Object>} - Tool execution result
 */
async function executeToolById(toolId, options, runId = null, sendOutput = null) {
  // console.log(`Executing tool: ${toolId} with options:`, options);
  
  // Get the tool implementation
  const tool = toolRegistry.getTool(toolId);
  
  if (!tool) {
    console.error(`Tool not found: ${toolId}`);
    throw new Error(`Tool not found: ${toolId}`);
  }
  
  // Assign emitOutput function to the tool instance
  if (sendOutput) {
    tool.emitOutput = sendOutput;
  }
  
  try {
    // Execute the tool
    const result = await tool.execute(options);
    
    return result;
  } catch (error) {
    console.error(`Error executing tool ${toolId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeToolSystem,
  executeToolById,
  toolRegistry
};
