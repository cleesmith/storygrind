# StoryGrind

StoryGrind is a desktop application that helps writers/authors/editors analyze and improve their manuscripts using AI-powered tools. Your manuscripts stay on your computer, and you control when and how A.I. (AI) assistance is applied to your work.

## See Wiki for details:
[Releases page](https://github.com/cleesmith/storygrind/wiki)

## Installation

### For Mac Users
1. Download the latest `.dmg` file from the [Releases page](https://github.com/cleesmith/storygrind/releases)
2. Double-click the downloaded file
3. Drag storygrind to your Applications folder
4. The first time you open it, right-click the app and choose "Open" (this is required for apps not from the App Store)

### For Windows Users  
1. Download the latest `.exe` installer from the [Releases page](https://github.com/cleesmith/storygrind/releases)
2. Double-click the installer and follow the prompts
3. storygrind will be installed and a shortcut created on your desktop

## Getting Started

### Setting Up Your API Key

StoryGrind uses AI to analyze your manuscripts.

1. Create a file named `.env` in your **home directory**:
   - Mac: `~/.env`
   - Windows: `C:\Users\YourUsername\.env`

2. Open the file with TextEdit (Mac) or Notepad (Windows)

3. Add at least one of these lines:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Save the file and launch storygrind

#### Getting API Keys:

You'll need at least one API key from these providers:

**Google Gemini (Inexpensive)**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Click "Create API Key"
- Copy the key

**Anthropic Claude**
- Create account at [Anthropic Console](https://console.anthropic.com/)
- Navigate to API Keys section
- Create new API key

**OpenAI**
- Sign up at [OpenAI Platform](https://platform.openai.com/)
- Go to API Keys in your account
- Create new secret key

---

## Privacy & Security

- API keys are stored in your home directory's .env file
- You control when AI services are accessed
- No automatic uploads or background processing

## Support

Having issues or suggestions? Please visit our [GitHub Issues page](https://github.com/cleesmith/storygrind/issues).

## About

StoryGrind speaks directly to the writer's experience of struggling to identify issues in their own work. This app makes the painful process more manageable, and is an integral part of creating great writing. It's honest about the process without being negative—editing is about improvement, after all.
