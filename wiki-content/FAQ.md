# Frequently Asked Questions

## 🆓 About StoryGrind

### Is StoryGrind really free?
Yes! StoryGrind itself is completely free and open source. However, AI-powered tools require an API key from a provider (Anthropic, Google, or OpenAI), and those providers charge for usage. Non-AI tools (spell check, file conversion) work without any API key.

### What file formats does StoryGrind support?
StoryGrind works with plain text only- `.txt` files, and the Tools only use `.txt`. For convenience, it can also convert between these formats: `.docx` to `.txt` and vice versa. All output files are saved as `.txt` for maximum compatibility.

### Where are my files stored?
Everything is stored locally on your computer in the `~/writing_with_storygrind/` directory. Where `~` is `C:\` your home on Windows.

Inside the main `~/writing_with_storygrind/` folder, you'll find individual subfolders for each of your projects. Each subfolder represents a separate story, book, novel, or writing project. For example:

```
~/writing_with_storygrind/
  ├── my-first-novel/
  ├── short-story-collection/
  ├── memoir-draft/
  └── fantasy-series-book-1/
```

This organization keeps your different writing projects completely separate and organized, making it easy to manage multiple stories at once.

While StoryGrind's tools work only with .txt plain text files, your project subfolders may also contain .docx files (which can be converted to .txt), .vellum files, images, or other related files from your other writing apps like Word, Pages, Google Docs, Scrivener, Vellum, and similar programs. StoryGrind will ignore these non-.txt files, but keeping everything related to a writing project in a single subfolder helps you stay organized and ensures all your project materials are in one place.

For backing up your work, you can sync your writing folder to cloud storage services like iCloud, Dropbox, or Google Drive. This protects your manuscripts and lets you access them from other devices. For writers who want to track changes to their work over time, GitHub is another option that saves every version of your files automatically.

### Can I use StoryGrind offline?
No, not really, as it's the AI that's providing the editing 🪄 magic.

## 🔑 API Keys & Setup

### Which AI provider should I choose?
All three providers (Anthropic Claude, Google Gemini, OpenAI) work well with StoryGrind. Given you have multiple AI API keys, you can switch providers anytime.

### How do I get an API key?
Visit the provider's website:
- [Anthropic Claude](https://console.anthropic.com/) - money upfront
- [Google Gemini](https://aistudio.google.com/app/apikey) - pay-as-you-go
- [OpenAI](https://platform.openai.com/) - money upfront

Follow the [API Setup Guide](API-Setup-Guide) for detailed instructions.

### Can I use multiple API keys?
You can have multiple keys in your `.env` file, but StoryGrind will use only one provider/model at a time. You can use **Settings** in StoryGrind to switch between your AI providers/models.

### Where do I put my API key?
Create a `.env` file in your home directory (`~/.env` on Mac, `C:\Users\YourName\.env` on Windows) and add your key. See the [API Setup Guide](API-Setup-Guide) for details.

## 🛠️ Using the Tools

### Which tool should I use first?
For most writers, start with "Tokens & Words Counter" to test your setup.

### Can I run multiple tools at once?
No, tools run one at a time.

### How long do tools take to run?
Most tools complete in about 2 minutes for about 50,000 words. Shorter works process faster. Processing time is unpredictable and depends on many factors.

### Can I stop a tool while it's running?
Yes, you can click **Force Quit** in every Tool's `Setup & Run` window to cancel a running process. Any partial results will not be saved, and your AI provider may or may not charge you depending on the issue! Also, StoryGrind's **Force Quit** quits immediately and disconnects from the AI provider too (*avoiding charges for odd AI behavior*).

## 📁 File Management

### Can I edit files directly in StoryGrind?
StoryGrind includes a basic text editor for viewing and making quick edits to results, but most writers prefer to make major edits in their primary writing software of choice (Word, Pages, Google Docs, Vellum).

### What happens to old tool results?
Every tool run creates a new timestamped file. Old results are never overwritten, so you can track your progress over time.

### Can I delete tool results?
Yes, you can delete any files in your project folders using your computer's file manager (Finder on Mac, File Explorer on Windows). You have full control over your writing and subfolders within `~/writing_with_storygrind/` and if you delete a subfolder then StoryGrind is no longer aware of that writing project.

### How do I backup my projects?
Simply copy the entire `~/writing_with_storygrind/` folder to your backup location. Everything is stored in standard text files. Even better, create a repository on Github for  `~/writing_with_storygrind/` and use the Github Desktop app to commit/push your writing. That repository then serves as a backup with a history (you can view and restore old writing). So your precious words are taken of care, a legacy, and the repository can be made private so only you can see.

## 🔧 Technical Issues

### "API Key Not Found" error
Check that:
1. Your `.env` file is in the correct location (home directory)
2. You removed the `#` symbol from the key line
3. You restarted StoryGrind after creating/editing the `.env` file

### Tools produce strange results
- AI's and their providers are not perfect

### App is running slowly
- Close other programs to free up memory
- Check your internet connection
- Try switching AI providers if one seems slow
- Restart your computer

## 📝 Writing & Workflow

### Can I use StoryGrind for non-fiction?
While designed for fiction, many tools work well for creative non-fiction, memoirs, and narrative essays. Technical writing might not benefit as much. You can also over-write a default prompt to make it more suitable for non-fiction. If you change your mind, just edit the prompt file and make it blank/empty which will restore the default prompt.

### How do I share results with beta readers or other editors?
Tool results are saved as plain text files that can be shared.

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

Remember: StoryGrind is made by a writer, for writers. I want it to work well for you!
