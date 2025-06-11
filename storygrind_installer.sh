#!/bin/bash

echo "storygrind Installation Helper"
echo "==============================="
echo ""
echo "Why do you need this installer?"
echo ""
echo "storygrind is free, independent software that doesn't go through"
echo "Apple's App Store. This keeps it completely free for writers, but"
echo "means macOS treats it as 'unverified' software and blocks it from"
echo "running normally."
echo ""
echo "This installer simply:"
echo "• Copies storygrind to your Applications folder"
echo "• Tells macOS that you trust this software to run"
echo ""
echo "This is a one-time setup. After this, storygrind works like"
echo "any other app on your Mac."
echo ""
echo "============================================================"
echo ""

# Check if the app bundle exists
if [ ! -d "storygrind.app" ]; then
    echo "ERROR: storygrind.app not found in current directory!"
    echo "Please make sure this installer is in the same folder as storygrind.app"
    echo ""
    echo "Press Enter to close..."
    read
    exit 1
fi

# Check if already installed
if [ -d "/Applications/storygrind.app" ]; then
    echo "storygrind is already installed in Applications."
    echo "Do you want to replace it? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        echo "Press Enter to close..."
        read
        exit 0
    fi
    echo ""
fi

echo "You will be asked for your Mac login password"
echo "(the same password you use to unlock your computer)"
echo "This is normal for installing apps to the Applications folder."
echo ""

# Move the app to Applications (needs admin rights)
echo "Moving to Applications folder..."
if sudo cp -R "storygrind.app" "/Applications/"; then
    echo "✓ Successfully copied to Applications"
else
    echo "✗ Failed to copy to Applications folder"
    echo "Press Enter to close..."
    read
    exit 1
fi

# Remove quarantine attributes (needs admin rights for system folders)
echo "Removing security restrictions..."
if sudo xattr -rd com.apple.quarantine "/Applications/storygrind.app" 2>/dev/null; then
    echo "✓ Security restrictions removed"
else
    echo "✓ No security restrictions to remove (or already removed)"
fi

# Set proper permissions
echo "Setting permissions..."
if sudo chmod -R 755 "/Applications/storygrind.app"; then
    echo "✓ Permissions set correctly"
else
    echo "⚠ Warning: Could not set permissions (app may still work)"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "storygrind is now in your Applications folder and ready to use."
echo "You can find it in Launchpad or the Applications folder in Finder."
echo ""
echo "Press Enter to close..."
read