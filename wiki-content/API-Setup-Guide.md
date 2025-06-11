# API Setup Guide

To use StoryGrind's AI-powered editing tools, you'll need an API key from at least one AI provider. This guide explains how to get one.

## 🤔 Which Provider Should I Choose?

StoryGrind supports three major AI providers. You only need to choose one to get started:

### Google Gemini
- Easy to get started
- Good for general editing tasks
- [Get API Key](https://aistudio.google.com/app/apikey)

### Anthropic Claude  
- Known for detailed analysis
- Strong with creative writing
- [Get API Key](https://console.anthropic.com/)

### OpenAI (GPT Models)
- Widely used and familiar to many
- Good all-around option
- [Get API Key](https://platform.openai.com/)

> **💡 Pro Tip**: Pick whichever provider you're most comfortable with. You can always switch later.

## 🔑 Getting Your API Key

### Option 1: Google Gemini

1. **Sign up**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Create key**: Click "Create API Key"
3. **Copy key**: Copy the generated key (starts with `AIza...`)
4. **Save it**: You'll need this for StoryGrind setup

### Option 2: Anthropic Claude

1. **Sign up**: Go to [Anthropic Console](https://console.anthropic.com/)
2. **Add credit**: Add funds to your account 
3. **Create key**: Navigate to API Keys section → Create new key
4. **Copy key**: Copy the generated key (starts with `sk-ant-...`)

### Option 3: OpenAI

1. **Sign up**: Go to [OpenAI Platform](https://platform.openai.com/)
2. **Add credit**: Add funds to your account
3. **Create key**: Go to API Keys → Create new secret key
4. **Copy key**: Copy the generated key (starts with `sk-...`)

## 🔧 Setting Up StoryGrind

### Step 1: Create Your .env File

StoryGrind looks for API keys in a special file in your home directory:

**Windows**: `C:\Users\YourUsername\.env`  
**Mac**: `~/.env`

### Step 2: Add Your API Key

Open the `.env` file with any text editor (Notepad, TextEdit, etc.) and add ONE of these lines:

```
# For Gemini:
GEMINI_API_KEY=your_actual_api_key_here

# For Claude:
ANTHROPIC_API_KEY=your_actual_api_key_here

# For OpenAI:
OPENAI_API_KEY=your_actual_api_key_here
```

**Important notes:**
- Remove the `#` symbol and space before the line you want to use
- Replace `your_actual_api_key_here` with your real API key
- Don't use quotes around the key
- You only need ONE provider to get started

### Step 3: Example .env File

Here's what a working `.env` file looks like:

```
# StoryGrind API Configuration
# Created on: Mon Jan 15, 2024 3:45pm

GEMINI_API_KEY=AIzaSyDexample123key456here789
```

### Step 4: Save and Restart

1. Save the `.env` file
2. **Restart StoryGrind** (this is important!)
3. StoryGrind should now detect your API key

## ✅ Testing Your Setup

1. Open StoryGrind
2. Create a test project
3. Try running "Tokens & Words Counter" on a small text file
4. If it works, your API key is set up correctly!

## 🔄 Switching Providers

You can change providers anytime:

1. Edit your `.env` file
2. Comment out the old key (add `#` at the start)
3. Add the new provider's key
4. Restart StoryGrind

## ❗ Troubleshooting

### "API Key Not Found" Error
- Check that your `.env` file is in the right location
- Make sure you removed the `#` symbol
- Verify there are no extra spaces or quotes
- Restart StoryGrind after making changes

### "Invalid API Key" Error  
- Double-check you copied the key correctly
- Make sure the key is still valid (hasn't expired)
- Verify you have credit in your provider account

## 🎯 Next Steps

Once your API key is working:

1. **[Create your first project](Getting-Started)**
2. **[Learn about the editing tools](AI-Editing-Tools)**
3. **[Understand the interface](User-Interface-Guide)**

## 🔒 Security Notes

- Your API keys are stored only on your computer
- StoryGrind never sees or stores your keys
- Keep your `.env` file private (don't share it)
- Each provider has different privacy policies for your manuscript content
