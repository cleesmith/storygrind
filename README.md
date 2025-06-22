# StoryGrind

StoryGrind is a desktop application that helps writers/authors/editors analyze and improve their manuscripts using AI-powered tools. Your manuscripts stay on your computer, and you control when and how A.I. (AI) assistance is applied to your work.

---

## Wiki
[see Wiki for details](https://github.com/cleesmith/storygrind/wiki)

---

## TL;DR Quick Start

### Installing StoryGrind on Your Mac

#### Step 1: 
- Download StoryGrind at: https://github.com/cleesmith/storygrind/releases/latest
- Click on StoryGrind_Apple_silicon.dmg (not for Intel Mac's)
- Wait for download

#### Step 2: Install the App
- Find the downloaded .dmg file (probably in your Downloads folder)
- Double-click it
- Drag StoryGrind into the Applications folder
- Close the installer window

#### Step 3: Open StoryGrind for the First Time
- Open Finder, click Applications
- Double-click StoryGrind
- You'll see a dialog asking:
	"Are you sure you want to open it?"
	"Apple checked it for malicious software and none was detected"
	*This means StoryGrind was signed and notarized by Apple Developer Program*

> The security dialog is normal - it appears for all apps downloaded from the internet, even when Apple has verified them as safe. Always click "Open" when you see this message.

- Click "Open"
	StoryGrind will open and show a welcome screen asking you to choose an **AI provider**
	Pick one (highly recommned **OpenRouter**), and StoryGrind will tell you to restart the app
	It will also remind you that you need to add your API key to the **.env** file

> That's it! StoryGrind will now open like any other app.

### What StoryGrind Creates on Your Computer:
A **.env** file in your home folder where you'll put your API keys
A folder called "**writing_with_storygrind**" in your home folder
This is where all your writing projects will live
You'll copy your manuscript files into project folders using Finder

### How to Edit Your API Key (One-Time Setup):
1. Open Terminal by using Finder, click Applications, click Utilities
2. Type: **open .env**
3. Press Enter
4. The file opens in **TextEdit** automatically
5. Follow the instructions in the file to add your API key

### Your .env and API keys are setup so to use them:
1. launch StoryGrind again: use Finder, click Applications, double click **storygrind.app** 
1. Click "**Select Project**" to create your first writing project
2. Copy your manuscript (.txt or .docx file) into the project folder
4. Choose an editing tool and **Setup & Run** it on your manuscript

Need Help?
Visit the full wiki for detailed guides: https://github.com/cleesmith/storygrind/wiki

---

## Privacy & Security

- API keys are stored in your home directory's .env file
- You control when AI services are accessed
- No automatic uploads or background processing

## Support

Having issues or suggestions? Please visit our [GitHub Issues page](https://github.com/cleesmith/storygrind/issues).

## About

StoryGrind speaks directly to the writer's experience of struggling to identify issues in their own work. This app makes the painful process more manageable, and is an integral part of creating great writing. It's honest about the process without being negative—editing is about improvement, after all.
