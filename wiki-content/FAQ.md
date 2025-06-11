# Frequently Asked Questions

## 🆓 About StoryGrind

### Is StoryGrind really free?
Yes! StoryGrind itself is completely free and open source. However, AI-powered tools require an API key from a provider (Google, Anthropic, or OpenAI), and those providers charge for usage. Non-AI tools (spell check, file conversion) work without any API key.

### What file formats does StoryGrind support?
StoryGrind works with `.txt` and `.docx` files. It can also convert between these formats. All output files are saved as `.txt` for maximum compatibility.

### Where are my files stored?
Everything is stored locally on your computer in the `~/writing_with_storygrind/` directory. StoryGrind cannot access files outside this directory for security reasons.

### Can I use StoryGrind offline?
The app itself runs offline, but AI tools require an internet connection to communicate with your chosen AI provider. Non-AI tools work completely offline.

## 🔑 API Keys & Setup

### Which AI provider should I choose?
All three providers (Google Gemini, Anthropic Claude, OpenAI) work well with StoryGrind. Choose based on your preference or familiarity. You can switch providers anytime.

### How do I get an API key?
Visit the provider's website:
- [Google Gemini](https://aistudio.google.com/app/apikey)
- [Anthropic Claude](https://console.anthropic.com/)
- [OpenAI](https://platform.openai.com/)

Follow our [API Setup Guide](API-Setup-Guide) for detailed instructions.

### Can I use multiple API keys?
You can have multiple keys in your `.env` file, but StoryGrind will use only one provider at a time. Switch by commenting/uncommenting lines in your `.env` file.

### Where do I put my API key?
Create a `.env` file in your home directory (`~/.env` on Mac, `C:\Users\YourName\.env` on Windows) and add your key. See the [API Setup Guide](API-Setup-Guide) for details.

## 🛠️ Using the Tools

### Which tool should I use first?
For most writers, start with "Tokens & Words Counter" to test your setup, then try "Developmental Editing" for a comprehensive analysis of your manuscript.

### Can I run multiple tools at once?
No, tools run one at a time. However, you can run them in sequence quickly since each tool operates independently.

### How long do tools take to run?
Most tools complete in 2-5 minutes for a full-length novel. Shorter works process faster. Processing time depends on your internet connection and the AI provider's response time.

### Can I stop a tool while it's running?
Yes, you can close the tool dialog to cancel a running process. Any partial results will not be saved.

## 📁 File Management

### Can I edit files directly in StoryGrind?
StoryGrind includes a basic text editor for viewing and making quick edits to results, but most writers prefer to make major edits in their primary writing software (Word, Google Docs, etc.).

### What happens to old tool results?
Every tool run creates a new timestamped file. Old results are never overwritten, so you can track your progress over time.

### Can I delete tool results?
Yes, you can delete any files in your project folders using your computer's file manager (Finder on Mac, File Explorer on Windows).

### How do I backup my projects?
Simply copy the entire `~/writing_with_storygrind/` folder to your backup location. Everything is stored in standard text files.

## 🔧 Technical Issues

### StoryGrind won't start on Mac
Try right-clicking the app and choosing "Open" instead of double-clicking. This bypasses Apple's security restrictions for unsigned apps.

### "API Key Not Found" error
Check that:
1. Your `.env` file is in the correct location (home directory)
2. You removed the `#` symbol from the key line
3. You restarted StoryGrind after creating/editing the `.env` file

### Tools produce strange results
This can happen if:
- Your manuscript has formatting issues
- The file is corrupted or contains non-text elements
- The AI provider is experiencing issues

Try running the tool on a smaller sample first.

### App is running slowly
- Close other programs to free up memory
- Check your internet connection
- Try switching AI providers if one seems slow

## 📝 Writing & Workflow

### Can I use StoryGrind for non-fiction?
While designed for fiction, many tools work well for creative non-fiction, memoirs, and narrative essays. Technical writing might not benefit as much.

### What about poetry or screenplays?
StoryGrind is optimized for prose fiction. Poetry and screenplay analysis might not provide useful results.

### Can multiple people use the same API key?
Technically yes, but each person should have their own StoryGrind installation and copy of the `.env` file. Usage will count against the shared account.

### How do I share results with beta readers or editors?
Tool results are saved as plain text files that can be shared via email, cloud storage, or any file sharing method.

## 🔄 Updates & Support

### How do I update StoryGrind?
Download the latest version from [GitHub Releases](https://github.com/cleesmith/storygrind/releases) and install it over your existing version. Your projects and settings will be preserved.

### Where can I get help?
1. Check this wiki for answers
2. Look at the [Troubleshooting guide](Troubleshooting)
3. Report issues on [GitHub](https://github.com/cleesmith/storygrind/issues)

### Can I request new features?
Yes! Submit feature requests on [GitHub Issues](https://github.com/cleesmith/storygrind/issues). The most requested features may be added in future versions.

### Is my data private?
StoryGrind stores everything locally on your computer. However, when using AI tools, your manuscript content is sent to the AI provider. Check each provider's privacy policy to understand how they handle your data.

## 🎯 Still Need Help?

Can't find your answer here? Try these resources:

- **[Troubleshooting Guide](Troubleshooting)** - Solutions to common problems
- **[Getting Started Guide](Getting-Started)** - Step-by-step setup instructions
- **[GitHub Issues](https://github.com/cleesmith/storygrind/issues)** - Report bugs or get community help

Remember: StoryGrind is made by writers, for writers. We want it to work well for you!