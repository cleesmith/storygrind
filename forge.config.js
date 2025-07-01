module.exports = {
  packagerConfig: {
    asar: true,
    name: 'StoryGrind',
    executableName: 'StoryGrind',
    appBundleId: 'com.slipthetrap.storygrind',
    // Platform-specific icon handling
    icon: process.platform === 'darwin' 
      ? './resources/storygrind.icns'
      : './resources/icons/win/icon',
    osxSign: false,
    osxNotarize: false,
    // Include embedded spellchecker dictionary files
    extraResource: [
      'lib/spellchecker/dict'
    ],
    ignore: [
      /^\/out$/,
      /^\/dist$/,
      /\.dmg$/,
      /\.zip$/,
      /\.exe$/,
      /\.deb$/,
      /\.AppImage$/,
      /^\/cls_/,
      /^\/\.git/,
      /^\/\.vscode/,
      /^\/\.idea/,
      /node_modules\/\.cache/,
      /\.map$/,
      /\.md$/,
      /\.log$/,
      /^\/test$/,
      /^\/tests$/,
      /^\/coverage$/,
      /^\/\.env$/,
      /^\/package-lock\.json$/,
      /^\/appdmg-config\.json$/,
      /^\/forge\.config\.js$/,
      /^\/\.gitignore$/,
      /^\/screencaps/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      // Don't ignore codemirror directory
      function(path) {
        return path.startsWith('/codemirror/') ? false : null;
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux'],
    }
  ]
};
