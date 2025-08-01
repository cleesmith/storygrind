## Project Overview

StoryGrind is an Electron-based desktop application for creative fiction writers that provides AI-powered manuscript analysis and editing tools. The app uses multiple AI providers (Gemini, OpenAI, Claude, OpenRouter) and stores user projects locally in `~/storygrind_projects/`.

## Architecture Overview

### Core Application Structure
- **main.js**: Main Electron process, handles window management, IPC, and app initialization
- **renderer.js**: Main UI logic for the primary application window
- **preload.js**: Secure bridge between main and renderer processes
- **state.js**: Centralized application state management using electron-store

### AI Integration Layer
- **client.js**: Main AI service wrapper that delegates to specific providers
- **client-claude.js**, **client-gemini.js**, **client-openai.js**, **client-openrouter.js**: Provider-specific AI clients
- **tool-system.js**: Central tool loading and execution system
- **registry.js**: Tool registration and discovery system

### Tool Architecture
- **tool-base.js**: Base class for all AI-powered tools with common functionality
- **Individual tool files**: Each editing tool (e.g., `developmental-editing.js`, `line-editing.js`) extends ToolBase
- **tool-prompts-manager.js**: Manages AI prompts stored in `~/storygrind_projects/tool-prompts/`

### Project Management
- Projects are stored in `~/storygrind_projects/` directory
- Each project has its own folder with manuscripts and generated analysis files
- API keys are stored using saferStorage (secure encrypted storage)
- Supported API keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`

### Spellchecker Integration
- **lib/spellchecker/**: Local spellchecker implementation using Hunspell dictionaries
- **lib/spellchecker/dict/**: Bundled dictionary ZIP files for multiple languages
- Dictionaries are extracted to `~/storygrind_projects/tool-prompts/dictionaries/` on first run
- Supports 15 languages: en-US, en-GB, de-DE, es-ES, es-MX, fr-FR, it-IT, lt-LT, nl-NL, pl-PL, pt-BR, ru-RU, sv-SE, tr-TR, uk-UA

### Window System
- **Main Window**: Primary application interface (index.html)
- **Project Dialog**: Project selection/creation (project-dialog.html)
- **Project Settings**: Project settings for publishing manuscripts to: cover.jpg, .html, .epub, .pdf (like Vellum for KDP), .pdf for paperback KDP cover (project-settings.html)
- **Tool Setup Dialog**: Tool configuration and execution (tool-setup-run.html)
- **Editor Dialog**: Built-in text editor (editor-dialog.html)
- **Settings Dialog**: AI provider and model configuration (settings-dialog.html)

### File Processing
- DOCX ↔ TXT conversion built into main process
- Support for `.txt` and `.docx` manuscript formats

### Publish Manuscript System
- **Publish/Unpublish Manuscript**: Core publishing functionality that generates multiple output formats
- **Output Formats**: Creates cover.jpg, .html, .epub, and .pdf files for various publishing platforms
- **KDP Integration**: Generates files suitable for Kindle Direct Publishing (like Vellum) with the intent of having a set of default files that are ready to be sent and used by KDP
- **Project Integration**: All published files are saved to the current project folder in `~/storygrind_projects/`
- **Index Generation**: Updates the master book index at `~/storygrind_projects/index.html`
- **Prerequisites**: Requires project metadata to be configured via Project Settings dialog
- **Project Settings Fields**: Title, Author, Point of View, Publisher, Buy URL, Copyright, Dedication, About Author, PDF back cover blurb
- **Publishing Configuration Fields**: Manuscript File, Cover .jpg file, Back cover .jpg file, Max Chapters revealed in HTML, Show HTML and/or EPUB, Unpublish this book
- **Warning System**: Displays warnings to ensure users have configured project settings before publishing

## Key Patterns

### Tool Development
- All tools extend `ToolBase` class
- Tools are auto-discovered by filename pattern (underscore-separated names)
- Each tool has a corresponding prompt file in `tool-prompts/` directory
- Tools emit output through `this.emitOutput()` for real-time UI updates

### API Provider Management
- Provider selection persists in electron-store
- API keys are stored using saferStorage for secure encryption
- Provider switching requires app restart
- Graceful fallback to non-AI tools when no API provider configured

### IPC Communication
- All main ↔ renderer communication uses contextIsolation-safe patterns
- File operations restricted to `~/storygrind_projects/` directory for security
- Tool execution happens in main process with progress updates to renderer

### State Management
- Current project, API provider, and model selections stored in electron-store
- File paths always resolved relative to projects directory
- Clean separation between app state and user data

## Security Considerations
- API keys stored using saferStorage with secure encryption
- File access restricted to writing projects directory
- No automatic uploads or background processing
- User controls when AI services are accessed

## Testing Policy
- **NEVER offer to test code** - Testing is expensive and error-prone when done by AI
- All testing will be handled by the developer
- Focus on code implementation only, not test creation or execution



# StoryGrind

StoryGrind is a desktop application that helps writers, authors, and editors analyze and improve their manuscripts using AI-powered tools. Your manuscripts stay on your computer, and you control when and how A.I. (AI) assistance is applied to your work.

---

## Why StoryGrind Exists

This isn't a startup looking for users or a company planning to monetize later. I'm retired, I love books, and I wanted to help writers access AI editing without the usual tech industry nonsense. That's it. That's the business model, as in not one at all.

If you find StoryGrind helpful, just tell another writer about it.

*- From a retired programmer who reads too much*

---

## Wiki
[see Wiki for details](https://github.com/cleesmith/storygrind/wiki)

---

## TL;DR -> watch YouTube video:

https://www.youtube.com/live/honw_mQZpNw

---

## Key Features

- **Free Forever** - No subscriptions to StoryGrind itself
- **Your Words Stay Yours** - Everything is stored locally on your computer, no Cloud lock-in
- **100% Plain Text** - All the way down, it's about *words* (**yours**), plain ole text is easy for AI eyes 👀, and portable to everywhere
- **You Control Your AI Usage** - Use your own API keys with the AI provider of your choice
- **Professional-Grade Tools** - Comprehensive editing tools you can customize to match your writing style, plus add your own
- **Multiple AI Providers** - Choose from Claude, Gemini, OpenAI, or OpenRouter
- **Writer-Friendly** - Built by a writer, for writers

---

## Who It's For

- Fiction Writers crafting short stories, novellas, and novels
- Authors preparing manuscripts for publication
- Editors looking for AI-powered analysis tools
- Writing Groups who want to share editing resources
- Budget-Conscious Writers who want professional editing at AI prices with fast thorough 24/7 responses

---

## What You Need

- A Mac or Windows computer
- One AI API key from [Claude](https://console.anthropic.com/), [Gemini](https://aistudio.google.com/app/apikey), [OpenAI](https://platform.openai.com/), or [OpenRouter](https://openrouter.ai/)
- Your manuscript in any common format - we include converters for .docx ↔ .txt so you can use Word, Pages, Google Docs, Vellum, or any writing tool

StoryGrind is FREE - but AI features require an API key from one of the listed providers. You control your costs and choose your AI provider.

---

## Verification Option: Building from Source

*For writers who want to see exactly what code runs on their computer - like watching your meal being prepared in an open kitchen*:

**Fair warning**: This method involves using the command line, which can be intimidating if you've never done it before. Most writers prefer the pre-built downloads, which are created from this exact same code. Choose this path only if security verification is important enough to you to learn some technical skills.

**Note**: This method requires typing text commands instead of clicking buttons. It's more complex but gives you complete transparency.

### Steps:

1. **First, install Node.js** (this lets your computer understand JavaScript): https://nodejs.org/en/download
   - Choose the "LTS" version for your system
   - Run the installer just like any other program

2. **Get the StoryGrind source code**:
   - **Easier way**: Download ZIP from this page (green "Code" button above), then unzip
   - **Technical way**: Use `git clone https://github.com/cleesmith/storygrind.git`

3. **Open Terminal (Mac) or Command Prompt (Windows)**:
   - **Mac**: Find Terminal in Applications > Utilities
   - **Windows**: Search for "Command Prompt" in Start menu

4. **Navigate to the StoryGrind folder** by typing:
   ```
   cd storygrind
   ```
   *(This means "change directory to storygrind")*

5. **Install dependencies** by typing:
   ```
   npm install
   ```
   *(This downloads all the pieces StoryGrind needs to run - it may take a few minutes)*

6. **Start StoryGrind** by typing:
   ```
   npm start
   ```

### After the first time setup:
*Once you've done the above, starting StoryGrind is just:*

1. Open Terminal or Command Prompt
2. Type: `cd storygrind`
3. Type: `npm start`

### If you get stuck:
- The commands must be typed exactly as shown (computers are very literal)
- Make sure you're in the right folder - the terminal should show "storygrind" in its prompt
- Error messages often contain clues - don't panic, read them carefully
- Consider asking a tech-savvy friend for help - this is genuinely technical

Remember: The pre-built releases are created from this exact code. This verification option exists for those who prefer to confirm that themselves, but it's not necessary for safe use of StoryGrind.

---

Need More Help?

- Visit the full wiki for detailed guidance: https://github.com/cleesmith/storygrind/wiki

---

## Privacy & Security

- API keys are encrypted and stored on your computer
- You control when AI services are accessed
- No automatic uploads or background processing
- StoryGrind practices digital patience 🌴 🧘🏽‍♀️ 
  > *present but not intrusive, ready but not demanding, costing nothing while it awaits your return*

## Support

Having issues or suggestions? Please visit our [GitHub Issues page](https://github.com/cleesmith/storygrind/issues).

## About

StoryGrind speaks directly to the writer's experience of struggling to identify issues in their own work. This app makes the painful process more manageable, and is an integral part of creating great writing. It's honest about the process without being negative—editing is about improvement, after all.

"Everyone is a story and has stories in them, so this app can help us publish shiny ✨ new ones for all readers."

> ### *A free forever open source app.*

