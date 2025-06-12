// ... for Windows:
// npm run package
// tar -a -c -f StoryGrind-Windows.zip -C out storygrind-win32-x64

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
// ###


// ... for Mac:
// rm -rf out/
// npm run package

// security find-identity -v -p codesigning

// node cls_sign_appleDevPgm.mjs
//  (base) cleesmith:~$ node cls_sign_appleDevPgm.mjs
//                      Application signed successfully
//                      Ready for notarization

// codesign --verify --verbose "out/StoryGrind-darwin-arm64/StoryGrind.app"
// codesign --display --verbose "out/StoryGrind-darwin-arm64/StoryGrind.app"
// spctl --assess --verbose "out/StoryGrind-darwin-arm64/StoryGrind.app"

// open "out/StoryGrind-darwin-arm64/StoryGrind.app"

// ditto -c -k --keepParent "out/StoryGrind-darwin-arm64/StoryGrind.app" "StoryGrind.zip"

// xcrun notarytool submit "StoryGrind.zip" --keychain-profile "notarytool-profile"
//     (base) cleesmith:~$ xcrun notarytool submit "StoryGrind.zip" --keychain-profile "notarytool-profile" 
//     Conducting pre-submission checks for StoryGrind.zip and initiating connection to the Apple notary service...
//     Submission ID received
//       id: 77ecb5fb-2e38-4ffa-bc0c-bf4a6756d92e
//     Upload progress: 100.00% (140 MB of 140 MB)   
//     Successfully uploaded file
//       id: 77ecb5fb-2e38-4ffa-bc0c-bf4a6756d92e
//       path: /Users/cleesmith/storygrind/StoryGrind.zip
//     (base) cleesmith:~$ time
//     shell  0.60s user 1.00s system 0% cpu 144:10:47.80 total
//     children  756.54s user 242.52s system 0% cpu 144:10:47.80 total
//     (base) cleesmith:~$ date 
//     Thu Jun 12 11:21:11 EDT 2025

// xcrun notarytool history --keychain-profile "notarytool-profile"
//   (base) cleesmith:~$ xcrun notarytool history --keychain-profile "notarytool-profile"
//   Successfully received submission history.
//     history
//       --------------------------------------------------
//       createdDate: 2025-06-12T15:19:08.776Z
//       id: 77ecb5fb-2e38-4ffa-bc0c-bf4a6756d92e
//       name: StoryGrind.zip
//       status: Accepted
//       --------------------------------------------------
//       createdDate: 2025-06-06T13:51:05.235Z
//       id: 46623cae-a024-4101-8567-1b29dd07909b
//       name: StoryGrinder.zip
//       status: Accepted
// ... very fast today: Thu Jun 12, 2025 11:19 AM EDT

// Stapler automatically retrieves the notarization ticket from Apple's servers based on the app's signature and attaches it to the .app bundle. No IDs needed.
// xcrun stapler staple "out/StoryGrind-darwin-arm64/StoryGrind.app"
//   (base) cleesmith:~$ xcrun stapler staple "out/StoryGrind-darwin-arm64/StoryGrind.app"
//   Processing: /Users/cleesmith/storygrind/out/StoryGrind-darwin-arm64/StoryGrind.app
//   Processing: /Users/cleesmith/storygrind/out/StoryGrind-darwin-arm64/StoryGrind.app
//   The staple and validate action worked!

// create-dmg out/StoryGrind-darwin-arm64/StoryGrind.app"
//   (base) cleesmith:~$ create-dmg  "out/StoryGrind-darwin-arm64/StoryGrind.app" 
//   ℹ Code signing identity: Developer ID Application: Chris Smith (Y9HNT7R2W4)
//   ✔ Created “storygrind 2.0.1.dmg”

// put .dmg on github Releases
// ###

import { sign } from '@electron/osx-sign'

const opts = {
  app: 'out/StoryGrind-darwin-arm64/StoryGrind.app',
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

