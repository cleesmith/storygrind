# Installation Guide

Getting StoryGrind up and running on your computer is straightforward. Follow the steps for your operating system.

## 🪟 Windows Installation

### Download
1. Go to the [StoryGrind Releases page](https://github.com/cleesmith/storygrind/releases/latest)
2. Download the latest `.zip` portable app file
3. The file will be named something like `Windows_StoryGrind_v???.zip`

### Install
1. Double-click the downloaded installer
2. Follow the installation prompts
3. StoryGrind will be installed and a desktop shortcut created
4. Click the desktop icon or find StoryGrind in your Start menu

### First Launch
- Windows may show a security warning since StoryGrind isn't code-signed
- Click "More info" then "Run anyway" to proceed
- This is normal for free, open-source software

## 🍎 Mac Installation

### Download
1. Go to the [StoryGrind Releases page](https://github.com/cleesmith/storygrind/releases/latest)
2. Download the latest `.dmg` installer file
3. The file will be named something like `Apple_Silicon_StoryGrind_v???.dmg`

### Install
1. Double-click the downloaded `.dmg` file
2. Drag StoryGrind to your Applications folder
3. Open Applications and find storygrind.app *(or similar)*

### First Launch (Important!)
When you first open the app (or after downloading an update), macOS will show a security message saying "Apple checked it for malicious software and none was detected." This is normal for any app downloaded outside the Mac App Store that has been signed and notarized using the Apple Developer Program.

Simply click "Open" and the app will launch. You'll see this message each time you download a new version of the app, but it's always safe to click "Open."

![StoryGrind dark](../blob/main/resources/storygrind_dmg_install.png?raw=true)

This message **confirms that Apple has verified the app is safe**, *read the small print*, so you can always click "Open" with confidence.

## 📁 What Gets Created

When you first run StoryGrind, it creates:

### In Your Home Directory
- **`storygrind_projects/` folder** - Contains all your projects

### File Access Restrictions
For security, StoryGrind can only access files in the `storygrind_projects` folder. This means:
- ✅ Your writing projects are safe and organized
- ✅ StoryGrind can't access other files on your computer
- ⚠️ You'll need to copy manuscripts into project folders

## 🔧 System Requirements

### Windows
- Windows 10 or 11 (64-bit)
- 4GB RAM minimum
- 500MB free disk space

### Mac
- macOS 10.15 (Catalina) or newer
- Intel or Apple Silicon (M1/M2) Macs supported
- 4GB RAM minimum
- 500MB free disk space

## ❗ Troubleshooting Installation

### Windows Issues
**"Windows protected your PC" message:**
- Click "More info" → "Run anyway"
- This is normal for unsigned software

**Antivirus blocking installation:**
- Temporarily disable antivirus
- Add StoryGrind to antivirus exceptions
- Re-enable antivirus after installation

### Mac Issues
**"StoryGrind cannot be opened" message:**
- Use the right-click → Open method described above
- Or check System Preferences > Security & Privacy

**"StoryGrind is damaged" message:**
- This can happen if the download was interrupted
- Delete the file and download again
- Make sure you downloaded from the official GitHub releases page

## 🎯 Next Steps

Once installed successfully:

1. **[Set up your API key](API-Setup-Guide)** - Required for AI tools
2. **[Create your first project](Getting-Started)** - Start organizing your work
3. **[Learn the interface](User-Interface-Guide)** - Get familiar with StoryGrind

## 🆘 Still Having Issues?

- Check the [Troubleshooting guide](Troubleshooting)
- Visit [GitHub Issues](https://github.com/cleesmith/storygrind/issues) to report problems
- Make sure you downloaded from the official GitHub releases page
