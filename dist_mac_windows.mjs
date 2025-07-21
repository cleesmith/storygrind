
// === WINDOWS ===
// does both package & tar
// git clone 
// npm install
// npm run make 

// Windows_win32_x64_StoryGrind_v6.0.0_July_18_2025.zip


// previously:
//  npm run package
//  tar -a -c -f StoryGrind-Windows.zip -C out storygrind-win32-x64

// put .zip on github Releases
// users download and extract a portable app = .exe

// 1. Upload `StoryGrind-Windows.zip` to GitHub Releases
// 2. Add release notes mentioning "Download, extract, and run StoryGrind.exe"

// For users:
// 1. Download `StoryGrind-Windows.zip` from your GitHub Releases
// 2. Right-click → "Extract All" (or use any unzip tool)
// 3. Navigate into the extracted `storygrind-win32-x64` folder
// 4. Double-click `StoryGrind.exe` to run the app

// User experience:
// - Windows will show security warnings (unsigned app)
// - Users click "More info" → "Run anyway"
// - App runs normally after that
// - They can create a desktop shortcut to the .exe if they want

// Portable app benefits:
// - No installation required
// - Users can put it anywhere
// - Easy to delete (just delete the folder)
// - No registry entries or system changes

// This is how most free/open source Windows software distributes - simple zip with executable inside.


// === MAC ===
// node -v = v24.2.0
// npm -v = 11.3.0

// ... total clean:
// - remove dev settings:
// rm -rf ~/Library/Application\ Support/storygrind
// rm *.dmg
// rm *.zip
// rm package-lock.json
// rm -rf node_modules/
// npm install
// npm list

// ... clean before signing/notarizing:
// rm -rf out/
// npm run package

// security find-identity -v -p codesigning

// node dist_mac_windows.mjs

// codesign --display --verbose "out/StoryGrind-darwin-arm64/StoryGrind.app"

// ditto -c -k --keepParent "out/StoryGrind-darwin-arm64/StoryGrind.app" "StoryGrind.zip"

// xcrun notarytool submit "StoryGrind.zip" --keychain-profile "notarytool-profile" --wait

// xcrun notarytool history --keychain-profile "notarytool-profile"

// xcrun stapler staple "out/StoryGrind-darwin-arm64/StoryGrind.app"

// xcrun stapler validate "out/StoryGrind-darwin-arm64/StoryGrind.app"

// change name for Silicon or Intel:
// create-dmg --volname "StoryGrind" --window-size 600 400 --icon-size 100 --icon "StoryGrind.app" 175 200 --app-drop-link 425 200 "Apple_Silicon_arm64_StoryGrind_v6.0.0_July_21_2025.dmg" "out/StoryGrind-darwin-arm64/StoryGrind.app"

// open out/storygrind-darwin-arm64/storygrind.app

// to test .dmg thoroughly delete anything to do with: storygrind
// mdfind storygrind
// then download .dmg and install/run it = what most users will see

import { sign } from '@electron/osx-sign'

const opts = {
  // silicon:
  app: 'out/StoryGrind-darwin-arm64/StoryGrind.app',

  // intel:
  // app: 'out/storygrind-darwin-x64/storygrind.app',

  // rm -rf out/
  // npm run package
  // node dist_mac_windows.mjs
  // ditto -c -k --keepParent "out/StoryGrind-darwin-x64/StoryGrind.app" "StoryGrind.zip"
  // xcrun notarytool submit "StoryGrind.zip" --keychain-profile "notarytool-profile" --wait
  // xcrun stapler staple "out/StoryGrind-darwin-x64/StoryGrind.app"
  // create-dmg --volname "StoryGrind" --window-size 600 400 --icon-size 100 --icon "StoryGrind.app" 175 200 --app-drop-link 425 200 "Apple_Intel_x64_StoryGrind_v6.0.0_July_21_2025.dmg" "out/StoryGrind-darwin-x64/StoryGrind.app"

  // Required for notarization
  optionsForFile: (filePath) => {
    return {
      hardenedRuntime: true
    }
  },
};

sign(opts)
  .then(function () {
    console.log('Application signed successfully');
    console.log('Ready for notarization');
  })
  .catch(function (err) {
    console.error('Error signing application:', err);
  });

