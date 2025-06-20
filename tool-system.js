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

// AI tools (mostly editing):
const TokensWordsCounter = loadToolClass('tokens-words-counter');
// const ManuscriptToOutlineCharactersWorld = loadToolClass('manuscript-to-outline-characters-world');
const ManuscriptToOutline = loadToolClass('manuscript-to-outline');
const ManuscriptToCharacters = loadToolClass('manuscript-to-characters'); 
const ManuscriptToWorld = loadToolClass('manuscript-to-world');
const NarrativeIntegrity = loadToolClass('narrative-integrity');
const DevelopmentalEditing = loadToolClass('developmental-editing');
const LineEditing = loadToolClass('line-editing');
const CopyEditing = loadToolClass('copy_editing');
const ProofreaderSpelling = loadToolClass('proofreader-spelling');
const ProofreaderPunctuation = loadToolClass('proofreader-punctuation');
const ProofreaderPlotConsistency = loadToolClass('proofreader-plot-consistency');
const CharacterAnalyzer = loadToolClass('character-analyzer');
const TenseConsistencyChecker = loadToolClass('tense-consistency-checker');
const AdjectiveAdverbOptimizer = loadToolClass('adjective-adverb-optimizer');
const DanglingModifierChecker = loadToolClass('dangling-modifier-checker');
const RhythmAnalyzer = loadToolClass('rhythm-analyzer');
const CrowdingLeapingEvaluator = loadToolClass('crowding-leaping-evaluator');
const ConflictAnalyzer = loadToolClass('conflict-analyzer');
const ForeshadowingTracker = loadToolClass('foreshadowing-tracker');
const PlotThreadTracker = loadToolClass('plot-thread-tracker');
const KdpPublishingPrep = loadToolClass('kdp-publishing-prep');
const Drunken = loadToolClass('drunken');

// AI writing tools:
const BrainstormTool = loadToolClass('brainstorm');
const OutlineWriter = loadToolClass('outline-writer');
const WorldWriter = loadToolClass('world-writer');
const ChapterWriter = loadToolClass('chapter-writer');

// non-AI tools:
const DocxComments = loadToolClass('docx-comments');
const EpubConverter = loadToolClass('epub-converter');

const TOOL_DEFS = [
  { id: 'tokens_words_counter', title: `Tokens & Words Counter`, description: `This tool can test that your AI API key is working properly!  Also, use it to count the approximate tokens and words in text files (mostly for manuscript.txt).`, Class: TokensWordsCounter, options: [
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
  { id: 'manuscript_to_outline', title: `Manuscript to Outline`, description: `Analyzes a manuscript and generates a detailed structural outline showing chapter divisions, key plot points, and story progression. Creates an outline.txt file that serves as a blueprint for the entire narrative.`, Class: ManuscriptToOutline, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File", 
      "type": "file",
      "description": "File containing the manuscript to analyze for outline extraction",
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
  { id: 'manuscript_to_characters', title: `Manuscript to Characters`, description: `Analyzes a manuscript and generates a comprehensive character reference document. Extracts detailed profiles for all significant characters including their roles, relationships, physical descriptions, and character development arcs.`, Class: ManuscriptToCharacters, options: [
    {
      "name": "manuscript_file", 
      "label": "Manuscript File",
      "type": "file", 
      "description": "File containing the manuscript to analyze for character extraction",
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
  { id: 'manuscript_to_world', title: `Manuscript to World`, description: `Analyzes a manuscript and generates a comprehensive world-building reference document. Extracts setting details, world rules, social structures, and environmental elements that define the story's fictional universe.`, Class: ManuscriptToWorld, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze for world-building extraction", 
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
  { id: 'narrative_integrity', title: `Narrative Integrity`, description: `Focused on consistency issues within the entire manuscript.`, Class: NarrativeIntegrity, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    },
    {
      "name": "special_instructions",
      "label": "Special Instructions",
      "type": "textarea",
      "description": "Additional focus areas or specific concerns (optional)",
      "required": false,
      "placeholder": "e.g., Focus on dialogue consistency, Pay attention to timeline issues...",
      "group": "Customization"
    }
  ]},
  { id: 'developmental_editing', title: `Developmental Editing`, description: `Performs developmental editing for your manuscript, with all chapter numbers/headers removed.`, Class: DevelopmentalEditing, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Fiction manuscript file to analyze",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": [
            "txt"
          ]
        }
      ],
      "group": "Input Files"
    }
  ]},
  { id: 'line_editing', title: `Line Editing`, description: `Performs line editing for a specified chapter in your manuscript, as this can be an intensive task.`, Class: LineEditing, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Fiction manuscript file to analyze",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": [
            "txt"
          ]
        }
      ],
      "group": "Input Files"
    }
  ]},
  { id: 'copy_editing', title: `Copy Editing`, description: `Performs copy editing for an entire manuscript, with all chapter numbers/headers removed.`, Class: CopyEditing, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Fiction manuscript file to analyze",
      "required": true,
      "default": "manuscript.txt",
      "filters": [
        {
          "name": "Text Files",
          "extensions": [
            "txt"
          ]
        }
      ],
      "group": "Input Files"
    }
  ]},
  { id: 'proofreader_spelling', title: `Proofreader Spelling`, description: `This tool does NOT use AI! All AI's have issues with spell checking words (very slow and lots of false-positives), unless it's just a few words at a time, but they always fail with an entire manuscript ... too much to ask I suppose. However, this tool performs spell checking for an entire manuscript. It tries to ignore most proper names/places and other false-positives often seen as misspelled. It is blazingly fast; Moby Dick in under 2 seconds (YMMV🤔). Future enhancements: Offer a way to search through the manuscript for each possible misspelled word and allow corrections in the editor; but honestly, most editor software (Word, Pages, google Docs, Reedsy, and others) offer good spell checking already.`, Class: ProofreaderSpelling, options: [
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
  { id: 'proofreader_punctuation', title: `Proofreader Punctuation`, description: `Manuscript analysis focused on evaluating punctuation effectiveness.\nIt detects issues such as run-on sentences, missing commas, and irregular punctuation patterns that may hinder clarity and flow.\nConfigurable analysis levels, strictness settings, and selectable punctuation elements enable it to generate a detailed report with examples, explanations, and recommendations for enhancing punctuation and overall readability.`, Class: ProofreaderPunctuation, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'proofreader_plot_consistency', title: `Proofreader Plot Consistency`, description: `Focused solely on plot inconsistencies.`, Class: ProofreaderPlotConsistency, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Manuscript file to proofread.",
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
  { id: 'plot_thread_tracker', title: `Plot Thread Tracker`, description: `Manuscript analysis utility for identifying and tracking distinct plot threads\u2014revealing how they interconnect, converge, and diverge throughout the narrative.\n It uses text-based representations (with optional ASCII art visualization) and supports configurable analysis depth (basic, detailed, or comprehensive) to produce detailed reports with progression maps, thread connections, and narrative assessments, including manuscript excerpts and recommendations for strengthening the plot architecture.`, Class: PlotThreadTracker, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'tense_consistency_checker', title: `Tense Consistency Checker`, description: `Examines the manuscript to evaluate verb tense consistency. It identifies shifts between past and present tense that might confuse readers, focusing on unintentional changes in narrative flow. With customizable analysis levels and configurable chapter markers, it generates a detailed report with examples, explanations, and suggestions for improving consistency.`, Class: TenseConsistencyChecker, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze (required)",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'character_analyzer', title: `Character Analyzer`, description: `Analyzes manuscript, outline, and world files to identify and compare character appearances. It extracts a master character list that details which files each character appears in, examines consistency across documents, and highlights discrepancies in names, roles, or relationships. The analysis produces a detailed report with sections and recommendations to improve character coherence. This is needed because AI rough draft writing has a tendency to add new characters! AI just loves new characters, especially those that whisper and hear echoes.`, Class: CharacterAnalyzer, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze (required)",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'adjective_adverb_optimizer', title: `Adjective Adverb Optimizer`, description: `Analyzes manuscript adjective and adverb usage to pinpoint unnecessary modifiers and overused qualifiers, offering specific suggestions for replacing weak descriptive patterns with stronger verbs and nouns, in line with Ursula K. Le Guin's guidance.`, Class: AdjectiveAdverbOptimizer, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'dangling_modifier_checker', title: `Dangling Modifier Checker`, description: `Manuscript analysis software that detects dangling and misplaced modifiers.\nIt examines text to pinpoint instances where descriptive phrases don\u2019t logically connect to their intended subjects, potentially causing confusion or unintended humor.\nWith customizable analysis level, sensitivity, and specific modifier types, it generates a detailed report complete with examples, explanations, and revision suggestions to enhance clarity and precision.`, Class: DanglingModifierChecker, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'rhythm_analyzer', title: `Rhythm Analyzer`, description: `Manuscript analysis utility for evaluating the rhythm and flow of prose.\nIt measures sentence length variations, detects monotonous patterns, and highlights sections where the writing\u2019s rhythm doesn\u2019t match the intended mood.\n Configurable analysis levels, selectable scene types, and adjustable sensitivity settings allow it to generate a detailed report with examples, explanations, and suggestions for enhancing overall narrative rhythm.`, Class: RhythmAnalyzer, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'crowding_leaping_evaluator', title: `Crowding Leaping Evaluator`, description: `Manuscript pacing evaluator that examines narrative structure for pacing issues.\nIt identifies overly dense sections (crowding) and abrupt transitions or time jumps (leaping) based on concepts inspired by Ursula K. Le Guin.\n With configurable analysis levels and sensitivity settings, it produces a detailed report\u2014including optional text-based visualizations\u2014that offers feedback and suggestions for improving narrative rhythm and clarity.`, Class: CrowdingLeapingEvaluator, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'conflict_analyzer', title: `Conflict Analyzer`, description: `Manuscript conflict analysis utility that examines conflict patterns at different narrative levels.\nIt identifies conflict nature, escalation, and resolution at scene, chapter, and arc levels.\nWith customizable analysis levels and selectable conflict types, it produces a detailed report featuring examples, assessments, and recommendations for strengthening narrative tension and coherence.`, Class: ConflictAnalyzer, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'foreshadowing_tracker', title: `Foreshadowing Tracker`, description: `Manuscript analysis utility for identifying foreshadowing elements and tracking their payoffs.\n It pinpoints explicit clues, subtle hints, and Chekhov's Gun elements to evaluate how well narrative setups are resolved.\n With customizable options to select foreshadowing types and organization modes (chronological or by type), it generates detailed reports featuring examples, assessments, and recommendations for fulfilling narrative promises.`, Class: ForeshadowingTracker, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'kdp_publishing_prep', title: `KDP Publishing Preparation`, description: `Analyzes manuscript in preparation for KDP publishing.`, Class: KdpPublishingPrep, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript File",
      "type": "file",
      "description": "Your completed manuscript text file (.txt)",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'drunken', title: `Drunken`, description: `AI pretends to be drunk while critiquing your manuscript. Sometimes insightful, other times just an annoying drunk.`, Class: Drunken, options: [
    {
      "name": "manuscript_file",
      "label": "Manuscript_File",
      "type": "file",
      "description": "File containing the manuscript to analyze",
      "required": true,
      "default": "manuscript.txt",
      "group": "Input Files"
    }
  ]},
  { id: 'brainstorm', title: `Brainstorm`, description: `Helps generate initial story ideas, prompts, and creative angles. Appends more ideas to the existing 'ideas.txt' file.`, Class: BrainstormTool, options: [
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
  { id: 'outline_writer', title: `Outline Writer`, description: `Generates a plot outline from your brainstorming file. CAVEAT EMPTOR: Anthropic's Claudes do a much better job, if you have the money for a API key; Google's Geminis are cheaper but less quality. YMMV🤔`, Class: OutlineWriter, options: [
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
  { id: 'world_writer', title: `World Writer`, description: `Extract and develop characters and world elements from an outline.  It requires: title, POV, and brainstorm.txt and outline.txt. All three files become useful during chapter writing. CAVEAT EMPTOR: Anthropic's Claudes do a much better job, if you have the money for a API key; Google's Geminis are cheaper but less quality. YMMV🤔`, Class: WorldWriter, options: [
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
  { id: 'chapter_writer', title: `Chapter Writer`, description: `Uses the outline, chapters list, world document, and any existing manuscript to write rough draft chapters.  *HIGHLY RECOMMENDED: Even though this is very rough draft 🌬️ writing, it really does help the AIs to have a good start by self-writing Chapter 1 or intensely edit the AI's first attempt at Chapter 1.  *CAVEAT EMPTOR: Anthropic's Claudes do a much better job, if you have the money for a API key; Google's Geminis are cheaper but less quality. YMMV🤔`, Class: ChapterWriter, options: [
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
    {
      "name": "lang",
      "label": "lang",
      "type": "text",
      "description": "Language for writing",
      "required": false,
      "default": "English",
      "group": "Input Files"
    }
  ]},
  { id: 'docx_comments', title: 'DOCX Text/Comments Extractor', description: 'Extracts comments and associated text from DOCX files and saves them to a text file', Class: DocxComments, options: [
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
    
    // Define which tools are non-AI and don't need AI API service
    const nonAiToolIds = ['docx_comments', 'epub_converter', 'proofreader_spelling'];
    
    // Register each tool with proper configuration
    let toolCount = 0;
    TOOL_DEFS.forEach(def => {
      if (typeof global.logToFile === 'function') {
        global.logToFile(`[tool-system] Registering tool #${toolCount + 1}: ${def.id}`);
      }
      
      // Create tool config with all properties from definition
      const toolConfig = {
        name: def.id,
        title: def.title,
        description: def.description,
        options: def.options || [],
        ...settings
      };
      
      // console.log(`Creating instance of tool: ${def.id}`);
      
      // Create tool instance
      let instance;
      
      // Check if this is a non-AI tool
      if (nonAiToolIds.includes(def.id)) {
        // Non-AI tools don't get AI API service
        instance = new def.Class(def.id, toolConfig);
        // console.log(`Initialized non-AI tool ${def.id} without AI API service`);
      } else {
        // AI tools get AI API service as first parameter (if available)
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
    // console.log(`Starting execution of tool: ${toolId}`);
    const result = await tool.execute(options);
    // console.log(`Tool execution complete: ${toolId}`);
    
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
