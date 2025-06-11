// editor-dialog.js
// This file creates a powerful text editor using CodeMirror with features like:
// - Live preview of markdown content
// - Persistent spellcheck that survives font changes
// - Customizable font sizes and word wrapping
// - Tab functionality completely disabled for clean writing
// - Placeholder text to guide new users
// - One Dark theme for dark mode

// =============================================================================
// SECTION 1: GLOBAL VARIABLES AND STATE MANAGEMENT
// =============================================================================

// These variables hold references to all the important DOM elements
// We initialize them when the page loads to avoid repeated DOM queries
let editor; // The main CodeMirror editor instance
let preview; // The preview pane that shows rendered markdown
let filepath; // Display element showing current file path
let modeToggle; // Button to switch between edit and preview modes
let modeTooltip; // Tooltip text for the mode toggle button
let openButton; // File open button
let saveButton; // File save button
let saveAsButton; // Save As button for new files
let closeButton; // Window close button
let notification; // Popup notification element
let wordWrapToggle; // Button to control line wrapping
let removeMarkdownButton; // Button to strip markdown formatting
let fontSizeIncrease; // Button to make text larger
let fontSizeDecrease; // Button to make text smaller
let fontSizeDisplay; // Shows current font size
let positionDisplay; // Shows cursor line and column
let statisticsDisplay; // Shows word and character counts
let htmlEl; // Reference to the HTML element for theme management
let findButton; // Search functionality button

// Application state variables that track the editor's current condition
let currentFilePath = null; // Path to the currently open file
let documentChanged = false; // Whether the document has unsaved changes
let originalContent = ''; // Content when file was last saved (for change detection)
let isWordWrapEnabled = true; // Current word wrap setting
let currentFontSize = 14; // Current font size in pixels

// =============================================================================
// SECTION 2: INITIALIZATION AND STARTUP SEQUENCE
// =============================================================================

// The main startup function that runs when the page is fully loaded
// This sequence is carefully ordered to ensure each component has what it needs
document.addEventListener('DOMContentLoaded', () => {
  // Step 1: Get references to all HTML elements first
  // This must happen before anything else tries to use these elements
  initDomReferences();
  
  // Step 2: Load the placeholder addon before CodeMirror initialization
  // CodeMirror checks for available options during setup, so addons must load first
  loadPlaceholderAddon();
  
  // Step 3: Create and configure the CodeMirror editor instance
  // This is the heart of our editor system
  initCodeMirror();
  
  // Step 4: Set up all the button click handlers and user interface controls
  setupControlEvents();
  
  // Step 5: Apply initial settings for word wrap, font size, and preview
  updateWordWrap();
  updateFontSize(); // This also ensures spellcheck is properly configured
  updatePreview();
  updateCodeMirrorTheme(); // Set initial theme
  
  // Step 6: Set the correct tooltip since we start in edit mode
  if (modeTooltip) {
    modeTooltip.textContent = 'go Preview';
  }
  
  // Step 7: Final setup to ensure CodeMirror is ready for typing
  // The delay allows all the DOM changes to settle before focusing
  setTimeout(() => {
    ensureCodeMirrorReady();
  }, 100);
});

// Grab references to all the HTML elements we'll need throughout the application
// This approach is more efficient than searching for elements repeatedly
function initDomReferences() {
  preview = document.getElementById('preview');
  filepath = document.getElementById('filepath');
  modeToggle = document.getElementById('mode-toggle');
  modeTooltip = document.getElementById('mode-tooltip');
  openButton = document.getElementById('open-button');
  saveButton = document.getElementById('save-button');
  saveAsButton = document.getElementById('save-as-button');
  closeButton = document.getElementById('close-button');
  removeMarkdownButton = document.getElementById('remove-markdown-button');
  notification = document.getElementById('notification');
  wordWrapToggle = document.getElementById('word-wrap-toggle');
  fontSizeIncrease = document.getElementById('font-size-increase');
  fontSizeDecrease = document.getElementById('font-size-decrease');
  fontSizeDisplay = document.getElementById('font-size-display');
  positionDisplay = document.getElementById('position');
  statisticsDisplay = document.getElementById('statistics');
  htmlEl = document.documentElement;
  findButton = document.getElementById('find-button');
}

// =============================================================================
// SECTION 3: CODEMIRROR PLACEHOLDER ADDON
// =============================================================================

// Load the official CodeMirror placeholder addon directly into our code
// This avoids unreliable CDN dependencies while providing professional functionality
function loadPlaceholderAddon() {
  // This is the official CodeMirror placeholder addon code
  // We embed it directly to avoid external dependency issues
  (function(mod) {
    if (typeof exports == "object" && typeof module == "object") 
      mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) 
      define(["../../lib/codemirror"], mod);
    else 
      mod(CodeMirror);
  })(function(CodeMirror) {
    // Register the placeholder option with CodeMirror
    CodeMirror.defineOption("placeholder", "", function(cm, val, old) {
      var prev = old && old != CodeMirror.Init;
      if (val && !prev) {
        // Set up event listeners when placeholder is enabled
        cm.on("blur", onBlur);
        cm.on("change", onChange);
        cm.on("swapDoc", onChange);
        CodeMirror.on(cm.getInputField(), "compositionupdate", cm.state.placeholderCompose = function() { onComposition(cm) })
        onChange(cm);
      } else if (!val && prev) {
        // Clean up event listeners when placeholder is disabled
        cm.off("blur", onBlur);
        cm.off("change", onChange);
        cm.off("swapDoc", onChange);
        CodeMirror.off(cm.getInputField(), "compositionupdate", cm.state.placeholderCompose)
        clearPlaceholder(cm);
        var wrapper = cm.getWrapperElement();
        wrapper.className = wrapper.className.replace(" CodeMirror-empty", "");
      }
      if (val && !cm.hasFocus()) onBlur(cm);
    });

    // Remove the placeholder element from the editor
    function clearPlaceholder(cm) {
      if (cm.state.placeholder) {
        cm.state.placeholder.parentNode.removeChild(cm.state.placeholder);
        cm.state.placeholder = null;
      }
    }
    
    // Create and display the placeholder element
    function setPlaceholder(cm) {
      clearPlaceholder(cm);
      var elt = cm.state.placeholder = document.createElement("pre");
      elt.style.cssText = "height: 0; overflow: visible";
      elt.style.direction = cm.getOption("direction");
      elt.className = "CodeMirror-placeholder CodeMirror-line-like";
      var placeHolder = cm.getOption("placeholder")
      if (typeof placeHolder == "string") placeHolder = document.createTextNode(placeHolder)
      elt.appendChild(placeHolder)
      cm.display.lineSpace.insertBefore(elt, cm.display.lineSpace.firstChild);
    }

    // Handle text composition events (important for international input methods)
    function onComposition(cm) {
      setTimeout(function() {
        var empty = false
        if (cm.lineCount() == 1) {
          var input = cm.getInputField()
          empty = input.nodeName == "TEXTAREA" ? !cm.getLine(0).length
            : !/[^\u200b]/.test(input.querySelector(".CodeMirror-line").textContent)
        }
        if (empty) setPlaceholder(cm)
        else clearPlaceholder(cm)
      }, 20)
    }

    // Show placeholder when editor loses focus and is empty
    function onBlur(cm) {
      if (isEmpty(cm)) setPlaceholder(cm);
    }
    
    // Handle content changes - show or hide placeholder as appropriate
    function onChange(cm) {
      var wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
      wrapper.className = wrapper.className.replace(" CodeMirror-empty", "") + (empty ? " CodeMirror-empty" : "");
      if (empty) setPlaceholder(cm);
      else clearPlaceholder(cm);
    }

    // Check if the editor is empty (one line with no content)
    function isEmpty(cm) {
      return (cm.lineCount() === 1) && (cm.getLine(0) === "");
    }
  });
}

// =============================================================================
// SECTION 4: CODEMIRROR INITIALIZATION AND CONFIGURATION
// =============================================================================

// Create and configure the main CodeMirror editor with all the features we need
function initCodeMirror() {
  const editorElement = document.getElementById('editor');
  
  // Create CodeMirror with carefully chosen options for the best writing experience
  editor = CodeMirror(editorElement, {
    value: '', // Start with empty content
    mode: 'text/plain', // Plain text mode (no syntax highlighting)
    lineNumbers: true, // Show line numbers for reference
    lineWrapping: true, // Wrap long lines instead of horizontal scrolling
    theme: 'default', // Start with default, will be updated based on dark/light mode
    
    // Input configuration for reliable spellcheck support
    inputStyle: 'contenteditable', // This works better with browser spellcheck
    
    // Spellcheck configuration - provide assistance without being intrusive
    spellcheck: true, // Enable red underlines for misspelled words
    autocorrect: false, // Don't automatically change what users type
    autocapitalize: false, // Don't automatically capitalize letters
    
    // Placeholder text to help new users understand what to do
    placeholder: 'Start writing your story here...',
    
    // Tab behavior - completely disabled for clean, distraction-free writing
    indentUnit: 0, // No automatic indentation
    tabSize: 0, // Tab characters show as zero width
    indentWithTabs: false, // Never insert tab characters
    smartIndent: false, // Don't automatically indent based on context
    electricChars: false, // Don't auto-indent when typing special characters
    
    // Custom key bindings to disable tab functionality entirely
    extraKeys: {
      'Tab': function(cm) {
        // Do nothing when Tab is pressed - completely disable tab behavior
        return;
      },
      'Shift-Tab': function(cm) {
        // Do nothing when Shift-Tab is pressed - no reverse indenting
        return;
      }
    },
    
    // Visual and interaction settings for a professional editing experience
    showCursorWhenSelecting: true, // Keep cursor visible during text selection
    styleActiveLine: true, // Highlight the line containing the cursor
    matchBrackets: false, // Disabled since we disabled electricChars
    autoRefresh: true, // Automatically refresh when the editor becomes visible
    viewportMargin: Infinity, // Render entire document for better search
    
    // File handling settings
    dragDrop: true, // Allow dragging files into the editor
    allowDropFileTypes: ['text/plain', 'text/markdown'], // Accept text files
    scrollbarStyle: 'native', // Use system scrollbars for familiarity
    
    // Performance settings that work well with spellcheck
    pollInterval: 100, // How often to check for changes
    workDelay: 100, // Delay before processing changes
    flattenSpans: false, // Keep text spans separate for better browser recognition
    addModeClass: false // Don't add CSS classes that might interfere
  });
  
  // Set up event listeners for the editor
  setupCodeMirrorEvents();
}

// =============================================================================
// SECTION 5: THEME MANAGEMENT
// =============================================================================

// Update CodeMirror theme based on current dark/light mode
function updateCodeMirrorTheme() {
  const isDarkMode = htmlEl.getAttribute('data-theme') === 'dark';
  editor.setOption('theme', isDarkMode ? 'one-dark' : 'default');
}

// =============================================================================
// SECTION 6: SPELLCHECK MANAGEMENT (SIMPLIFIED APPROACH)
// =============================================================================

// Robust spellcheck activation that persists through DOM changes
// Uses MutationObserver to ensure spellcheck survives CodeMirror's DOM manipulations
let spellcheckObserver = null;

function activateSpellcheck() {
  // First, apply spellcheck to all current elements
  applySpellcheckAttributes();
  
  // Set up a MutationObserver to watch for DOM changes
  // This ensures spellcheck persists when CodeMirror recreates elements
  if (!spellcheckObserver) {
    spellcheckObserver = new MutationObserver((mutations) => {
      // When DOM changes occur, reapply spellcheck attributes
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Delay slightly to let CodeMirror finish its DOM updates
          setTimeout(() => {
            applySpellcheckAttributes();
          }, 10);
        }
      });
    });
    
    // Watch the CodeMirror wrapper for any DOM changes
    const wrapper = editor.getWrapperElement();
    if (wrapper) {
      spellcheckObserver.observe(wrapper, {
        childList: true,
        subtree: true
      });
    }
  }
}

// Apply spellcheck attributes to all relevant elements
function applySpellcheckAttributes() {
  const inputField = editor.getInputField();
  
  // Configure the main input field
  if (inputField) {
    inputField.setAttribute('spellcheck', 'true');
    inputField.setAttribute('autocorrect', 'off');
    inputField.setAttribute('autocapitalize', 'off');
    
    if (inputField.contentEditable !== undefined) {
      inputField.contentEditable = 'true';
    }
  }
  
  // Configure the wrapper
  const wrapper = editor.getWrapperElement();
  if (wrapper) {
    wrapper.setAttribute('spellcheck', 'true');
  }
  
  // Configure all contenteditable elements
  const editableDivs = wrapper.querySelectorAll('div[contenteditable="true"]');
  editableDivs.forEach(div => {
    div.setAttribute('spellcheck', 'true');
    div.setAttribute('autocorrect', 'off');
    div.setAttribute('autocapitalize', 'off');
  });
  
  // Also handle the CodeMirror-code elements which might be contenteditable
  const codeElements = wrapper.querySelectorAll('.CodeMirror-code');
  codeElements.forEach(elem => {
    elem.setAttribute('spellcheck', 'true');
  });
}

// =============================================================================
// SECTION 7: FONT SIZE MANAGEMENT WITH SPELLCHECK PRESERVATION
// =============================================================================

// Update font size - spellcheck will be maintained by MutationObserver
function updateFontSize() {
  const isEditMode = htmlEl.classList.contains('edit-mode');
  
  if (isEditMode) {
    // Apply font size to CodeMirror editor
    const codeMirrorElement = editor.getWrapperElement();
    codeMirrorElement.style.fontSize = currentFontSize + 'px';
    
    // Refresh CodeMirror to apply the new font size
    // The MutationObserver will automatically reapply spellcheck after refresh
    setTimeout(() => {
      editor.refresh();
    }, 10);
  } else {
    // In preview mode, simply apply font size to the preview element
    preview.style.fontSize = currentFontSize + 'px';
  }
  
  // Update the font size display
  if (fontSizeDisplay) {
    fontSizeDisplay.textContent = currentFontSize + 'px';
  }
}

// Increase font size with reasonable limits for readability
function increaseFontSize() {
  const maxSize = 24; // Maximum size to prevent interface problems
  if (currentFontSize < maxSize) {
    currentFontSize += 2; // Increment by 2 for smooth progression
    updateFontSize();
  }
}

// Decrease font size with reasonable limits for readability
function decreaseFontSize() {
  const minSize = 10; // Minimum size to maintain readability
  if (currentFontSize > minSize) {
    currentFontSize -= 2; // Decrement by 2 for smooth progression
    updateFontSize();
  }
}

// =============================================================================
// SECTION 8: CODEMIRROR EVENT HANDLING AND INTERACTION
// =============================================================================

// Ensure CodeMirror is properly ready for text input and user interaction
function ensureCodeMirrorReady() {
  const isEditMode = htmlEl.classList.contains('edit-mode');
  
  if (isEditMode) {
    // Give CodeMirror time to properly establish its input handling
    editor.refresh();
    
    setTimeout(() => {
      editor.refresh(); // Second refresh for stability
      
      setTimeout(() => {
        editor.focus(); // Give focus for immediate typing
        
        // Position cursor at the beginning for empty documents
        if (editor.getValue().length === 0) {
          editor.setCursor({line: 0, ch: 0});
        }
        
        // Ensure spellcheck is active
        activateSpellcheck();
      }, 30);
    }, 50);
  } else {
    // Just refresh if not in edit mode
    editor.refresh();
  }
}

// Set up event listeners for CodeMirror editor interactions
function setupCodeMirrorEvents() {
  // Track cursor movement to update position display
  editor.on('cursorActivity', updatePositionAndStats);
  
  // Track content changes for save state and statistics
  editor.on('change', () => {
    documentChanged = editor.getValue() !== originalContent;
    updatePositionAndStats();
    updatePreviewDebounced(); // Update preview after a delay
  });
  
  // Ensure spellcheck stays active when editor gains focus
  editor.on('focus', () => {
    setTimeout(() => {
      activateSpellcheck();
    }, 100);
  });
  
  // Initialize position and statistics display
  updatePositionAndStats();
}

// =============================================================================
// SECTION 9: MODE SWITCHING BETWEEN EDIT AND PREVIEW
// =============================================================================

// Toggle between edit mode (CodeMirror visible) and preview mode (rendered markdown visible)
function toggleEditMode() {
  htmlEl.classList.toggle('edit-mode');
  const isEditMode = htmlEl.classList.contains('edit-mode');
  
  // Update the tooltip to show what clicking the button will do
  modeTooltip.textContent = isEditMode ? 'go Preview' : 'go Edit';
  
  if (!isEditMode) {
    // Switching to preview mode - update the rendered content
    updatePreview();
    updateFontSize(); // Apply font size to preview
  } else {
    // Switching to edit mode - ensure CodeMirror is ready for input
    setTimeout(() => {
      ensureCodeMirrorReady();
      updateFontSize(); // Apply font size and maintain spellcheck
    }, 50);
  }
}

// =============================================================================
// SECTION 10: USER INTERFACE CONTROL HANDLERS
// =============================================================================

// Set up click handlers for all buttons and interface controls
function setupControlEvents() {
  // Mode toggle button (edit/preview switch)
  modeToggle.addEventListener('click', toggleEditMode);
  
  // File opening with unsaved changes protection
  if (openButton) {
    openButton.addEventListener('click', () => {
      if (documentChanged) {
        const confirmOpen = confirm('You have unsaved changes. Open a different file anyway?');
        if (!confirmOpen) return;
      }
      
      // Use Electron API to show file selection dialog
      if (window.electronAPI && window.electronAPI.selectFile) {
        window.electronAPI.selectFile({
          title: 'Open File',
          filters: [
            { name: 'Text Files', extensions: ['txt', 'md'] }
          ]
        })
        .then(filePath => {
          if (filePath) {
            openFile(filePath);
          }
        })
        .catch(err => {
          showNotification('Error selecting file: ' + err.message);
        });
      } else {
        showNotification('Error: File selection API not available');
      }
    });
  }
  
  // Remove Markdown formatting with user confirmation
  removeMarkdownButton.addEventListener('click', () => {
    const confirmRemove = confirm(
      'Warning: Removing Markdown formatting is permanent and cannot be undone.\n\n' +
      'This will convert all formatting (headings, bold, links, etc.) to plain text.\n\n' +
      'Do you want to proceed?'
    );
    
    if (!confirmRemove) {
      return; // User cancelled
    }
    
    // Ensure we're in edit mode for the operation
    if (!htmlEl.classList.contains('edit-mode')) {
      htmlEl.classList.add('edit-mode');
      modeTooltip.textContent = 'go Preview';
    }
    
    // Convert markdown to plain text and update editor
    const plainText = removeMarkdown(editor.getValue());
    editor.setValue(plainText);
    documentChanged = editor.getValue() !== originalContent;
    
    updatePreview();
    updatePositionAndStats();
    showNotification('Markdown formatting removed');
  });
  
  // File save operations
  saveButton.addEventListener('click', () => saveFile(false));
  saveAsButton.addEventListener('click', () => saveFile(true));
  
  // Window close with unsaved changes protection
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      if (documentChanged) {
        const confirmClose = confirm('You have unsaved changes. Close anyway?');
        if (!confirmClose) return;
      }
      
      if (window.electronAPI && window.electronAPI.closeEditorDialog) {
        window.electronAPI.closeEditorDialog();
      }
    });
  }
  
  // Text formatting controls
  wordWrapToggle.addEventListener('click', toggleWordWrap);
  
  // Font size controls
  if (fontSizeIncrease) {
    fontSizeIncrease.addEventListener('click', increaseFontSize);
  }
  if (fontSizeDecrease) {
    fontSizeDecrease.addEventListener('click', decreaseFontSize);
  }
  
  // Search functionality using CodeMirror's built-in find feature
  if (findButton) {
    findButton.addEventListener('click', () => {
      editor.execCommand('find');
    });
  }
}

// =============================================================================
// SECTION 11: MARKDOWN PROCESSING AND PREVIEW
// =============================================================================

// Update the preview pane with rendered markdown content
function updatePreview() {
  try {
    const html = simpleMarkdownToHtml(editor.getValue());
    preview.innerHTML = html;
  } catch (error) {
    preview.innerHTML = '<p style="color: red;">Error rendering markdown: ' + error.message + '</p>';
  }
}

// Debounced preview update to avoid excessive rendering during typing
let previewDebounceTimer;
function updatePreviewDebounced() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(updatePreview, 300);
}

// Convert markdown text to plain text by removing all formatting
function removeMarkdown(md, options) {
  options = options || {};
  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
  options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
  options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
  options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;
  options.preserveBlockSpacing = options.hasOwnProperty('preserveBlockSpacing') ? options.preserveBlockSpacing : true;
  
  var output = md || '';
  
  try {
    // Remove horizontal rules
    output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, '');
    
    // Handle list markers
    if (options.stripListLeaders) {
      if (options.listUnicodeChar) {
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
      } else {
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
      }
    }
    
    // Handle GitHub Flavored Markdown features
    if (options.gfm) {
      output = output
        .replace(/\n={2,}/g, '\n')
        .replace(/~{3}.*\n/g, '')
        .replace(/(`{3,})([\s\S]*?)\1/gm, function(match, p1, p2) {
          return p2.trim() + '%%CODEBLOCK_END%%\n';
        })
        .replace(/~~/g, '');
    }
    
    // Process main markdown elements
    output = output
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/^[=\-]{2,}\s*$/g, '') // Remove setext headers
      .replace(/\[\^.+?\](\: .*?$)?/g, '') // Remove footnotes
      .replace(/\s{0,2}\[.*?\]: .*?$/g, '') // Remove reference links
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '') // Handle images
      .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1') // Handle links
      .replace(/^\s*>+\s?/gm, function(match) {
        return options.preserveBlockSpacing ? '\n' : '';
      }) // Handle blockquotes
      .replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1') // Remove list markers
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '') // Remove reference links
      .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, '$1$2$3') // Remove headers
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2') // Remove emphasis
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2') // Remove emphasis (second pass)
      .replace(/`(.+?)`/g, '$1'); // Remove code markers
    
    // Final cleanup
    output = output
      .replace(/%%CODEBLOCK_END%%\n/g, '\n\n\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/\n{3}/g, '\n\n')
      .trim();
      
  } catch(e) {
    return md; // Return original if processing fails
  }
  
  return output;
}

// Simple markdown to HTML converter for preview functionality
function simpleMarkdownToHtml(markdown) {
  if (!markdown) return '';
  
  let html = markdown
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>') // H1 headers
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>') // H2 headers
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>') // H3 headers
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>') // Links
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
    .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
    .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>') // Blockquotes
    .replace(/^- (.*?)$/gm, '<li>$1</li>') // List items
    .replace(/^([^<].*?)$/gm, '<p>$1</p>'); // Paragraphs
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/<li>.*?<\/li>\n<li>.*?<\/li>/g, function(match) {
    return '<ul>' + match + '</ul>';
  });
  
  return html;
}

// =============================================================================
// SECTION 12: FILE OPERATIONS
// =============================================================================

// Open a file using Electron's file system APIs
async function openFile(filePath) {
  try {
    if (window.electronAPI && window.electronAPI.openFileInEditor) {
      const result = await window.electronAPI.openFileInEditor(filePath);
      if (!result.success) {
        showNotification('Error opening file: ' + (result.error || 'Unknown error'));
      }
    }
  } catch (error) {
    showNotification('Error opening file: ' + error.message);
  }
}

// Save the current document content to a file
async function saveFile(saveAs = false) {
  if (!window.electronAPI || !window.electronAPI.saveFile) {
    showNotification('Error: API not available');
    return;
  }
  
  try {
    const content = editor.getValue();
    const result = await window.electronAPI.saveFile({
      filePath: currentFilePath,
      content,
      saveAs
    });
    
    if (result && result.success) {
      currentFilePath = result.filePath;
      filepath.textContent = currentFilePath;
      filepath.title = currentFilePath; // Tooltip on hover
      documentChanged = false;
      originalContent = content;
      showNotification('File saved successfully');
    } else {
      showNotification('Failed to save file');
    }
  } catch (error) {
    showNotification('Error saving file: ' + error.message);
  }
}

// =============================================================================
// SECTION 13: UTILITY FUNCTIONS
// =============================================================================

// Show a temporary notification to the user
function showNotification(message, duration = 2000) {
  notification.textContent = message;
  notification.classList.add('visible');
  
  setTimeout(() => {
    notification.classList.remove('visible');
  }, duration);
}

// Toggle word wrap setting on and off
function toggleWordWrap() {
  isWordWrapEnabled = !isWordWrapEnabled;
  updateWordWrap();
}

// Apply current word wrap setting to CodeMirror
function updateWordWrap() {
  editor.setOption('lineWrapping', isWordWrapEnabled);
  wordWrapToggle.textContent = `Wrap: ${isWordWrapEnabled ? 'On' : 'Off'}`;
}

// Update the cursor position and document statistics display
function updatePositionAndStats() {
  const cursor = editor.getCursor();
  const text = editor.getValue();
  
  // CodeMirror uses 0-based line numbers, so add 1 for user display
  const lineNumber = cursor.line + 1;
  const columnNumber = cursor.ch + 1;
  
  positionDisplay.textContent = `Line: ${lineNumber}, Column: ${columnNumber}`;
  
  // Calculate and display word and character counts
  const wordCount = countWords(text);
  const charCount = text.length;
  statisticsDisplay.textContent = `Words: ${wordCount} - Characters: ${charCount}`;
}

// Count words in text by splitting on whitespace and filtering empty strings
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// =============================================================================
// SECTION 14: ELECTRON API INTEGRATION
// =============================================================================

// Handle file opened message from the main Electron process
if (window.electronAPI && window.electronAPI.onFileOpened) {
  window.electronAPI.onFileOpened((data) => {
    if (data && data.filePath && data.content !== undefined) {
      currentFilePath = data.filePath;
      editor.setValue(data.content);
      originalContent = data.content;
      documentChanged = false;
      
      // Update file path display
      filepath.textContent = currentFilePath;
      filepath.title = currentFilePath;
      
      // Update interface elements
      updatePositionAndStats();
      updatePreview();
      
      // Ensure spellcheck is active for the new content
      setTimeout(() => {
        activateSpellcheck();
      }, 100);
    }
  });
}

// Handle theme changes from the main Electron process
if (window.electronAPI && window.electronAPI.onSetTheme) {
  window.electronAPI.onSetTheme(theme => {
    if (theme === 'light') {
      htmlEl.setAttribute('data-theme', 'light');
    } else {
      htmlEl.setAttribute('data-theme', 'dark');
    }
    
    // Update CodeMirror theme when global theme changes
    updateCodeMirrorTheme();
  });
}