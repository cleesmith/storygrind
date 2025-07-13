# Frequently Asked Questions

## 🆓 About StoryGrind

### Is StoryGrind really free?
Yes! StoryGrind itself is completely free and open source. However, AI-powered tools require an API key from a provider (Anthropic, Google, OpenAI, or OpenRouter), and those providers charge for usage. Non-AI tools (spell check, file conversion) work without any API key.

### What file formats does StoryGrind support?
StoryGrind works with plain text only- `.txt` files, and the Tools only use `.txt`. For convenience, it can also convert between these formats: `.docx` to `.txt` and vice versa. All output files are saved as `.txt` for maximum compatibility.

### Where are my files stored?
Everything is stored locally on your computer in the `~/storygrind_projects/` directory. Where `~` is `C:\` or root drive on Windows, well kind of 🤥.

Inside the main `~/storygrind_projects/` folder, you'll find individual subfolders for each of your projects. Each subfolder represents a separate story, book, novel, or writing project. Along with the editable tool prompts. For example:

```
~/storygrind_projects/
  ├── TheNecklace/
  ├── JawsAndMobyDick/
  ├── MirrorMeTheMemoir/
  ├── HairlessPotter/
  └── tool-prompts
      ├── Core Editing Tools
      │   ├── copy_editing.txt
      │   ├── developmental_editing.txt
      │   ├── line_editing.txt
      │   ├── narrative_integrity.txt
      │   ├── proofreader_plot_consistency.txt
      │   └── proofreader_punctuation.txt
      ├── Other Editing Tools
      │   ├── adjective_adverb_optimizer.txt
      │   ├── character_analyzer.txt
      │   ├── conflict_analyzer.txt
      │   ├── crowding_leaping_evaluator.txt
      │   ├── dangling_modifier_checker.txt
      │   ├── drunken.txt
      │   ├── foreshadowing_tracker.txt
      │   ├── kdp_publishing_prep.txt
      │   ├── manuscript_to_characters.txt
      │   ├── manuscript_to_outline.txt
      │   ├── manuscript_to_world.txt
      │   ├── plot_thread_tracker.txt
      │   ├── rhythm_analyzer.txt
      │   └── tense_consistency_checker.txt
      ├── User Tools
      │   ├── list_chapters.txt
      │   ├── nonfiction_SelfHelp_editing.txt
      │   ├── nonfiction_creative_editing.txt
      │   ├── nonfiction_integrity_editing.txt
      │   └── nonfiction_sourcing_audit.txt
      └── dictionaries
          ├── de-DE.dic
          ├── en-GB.dic
          ├── en-US.dic
          ├── es-ES.dic
          ├── es-MX.dic
          ├── fr-FR.dic
          ├── it-IT.dic
          ├── lt-LT.dic
          ├── nl-NL.dic
          ├── pl-PL.dic
          ├── pt-BR.dic
          ├── ru-RU.dic
          ├── sv-SE.dic
          ├── tr-TR.dic
          └── uk-UA.dic
```

This organization keeps your different writing projects completely separate and organized, making it easy to manage multiple stories at once.

While StoryGrind's tools work only with .txt plain text files, your project subfolders may also contain .docx files (which can be converted to .txt), .vellum files, images, or other related files from your other writing apps like Word, Pages, Google Docs, Scrivener, Vellum, and similar programs. StoryGrind will ignore these non-.txt files, but keeping everything related to a writing project in a single subfolder helps you stay organized and ensures all your project materials are in one place.

For backing up your work, you can sync your writing folder to cloud storage services like iCloud, Dropbox, or Google Drive. This protects your manuscripts and lets you access them from other devices. For writers who want to track changes to their work over time, GitHub is another option that saves every version of your files automatically.

### Can I use StoryGrind offline?
A little bit, but not really, as it's the AI that's providing the editing 🪄 magic. File converters, spell checking, the built-in editor; are all usable offline.

## 🔑 API Keys & Setup

### Which AI provider should I choose?
All four providers (OpenRouter, Anthropic Claude, Google Gemini, OpenAI) work well with StoryGrind. Given you have multiple AI API keys, you can switch providers anytime.

### How do I get an API key?
Visit the provider's website:
- [OpenRouter](https://openrouter.ai/) - money upfront, but access to lots of AI models
- [Anthropic Claude](https://console.anthropic.com/) - money upfront
- [Google Gemini](https://aistudio.google.com/app/apikey) - pay-as-you-go
- [OpenAI](https://platform.openai.com/) - money upfront

Follow the [API Setup Guide](API-Setup-Guide) for detailed instructions.

### Can I use multiple API keys?
Yes, but StoryGrind will use only one provider/model at a time. You can use **Settings** in StoryGrind to switch between your AI providers/models.

### Where do I put my API key?
You can only use **Settings** in StoryGrind to encrypt and store your API keys. Your API keys are not stored in plain sight and unreadable by humans.

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
Yes, you can delete any files in your project folders using your computer's file manager (Finder on Mac, File Explorer on Windows). You have full control over your writing and subfolders within `~/storygrind_projects/` and if you delete a subfolder then StoryGrind is no longer aware of that writing project.

### How do I backup my projects?
Simply copy the entire `~/storygrind_projects/` folder to your backup location. Everything is stored in standard text files. Even better, create a repository on Github for  `~/storygrind_projects/` and use the Github Desktop app to commit/push your writing. That repository then serves as a backup with a history (you can view and restore old writing). So your precious words are taken of care, a legacy, and the repository can be made private so only you can see.

## 🔧 Technical Issues

### Tools produce strange results
- AI's and their providers and their API services are not perfect

### App is running slowly
- AI's have a lot of outages
- Check your internet connection
- If you have multiple API keys; try switching AI providers if one seems slow
- Restart your computer

## 📝 Writing & Workflow

### Can I use StoryGrind for nonfiction?
While designed for fiction, there are a few prompts/tools included in **Users Tools** specifically for nonfiction.

### How do I share results with beta readers or other editors?
Tool results/reports are saved as plain text files that can be shared.

## 🔄 Updates & Support

### How do I update StoryGrind?
Download the latest version from [GitHub Releases](https://github.com/cleesmith/storygrind/releases) and install it over your existing version. Your projects and settings will be preserved.

### Where can I get help?
1. Check this wiki for answers
2. Report issues on [GitHub](https://github.com/cleesmith/storygrind/issues)

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
