module.exports = {
  packagerConfig: {
    asar: {
      unpack: "**/{*.node,*.dylib,*.so,*.dll}"
    },
    name: 'StoryGrind',
    executableName: 'StoryGrind',
    appBundleId: 'com.slipthetrap.storygrind',
    icon: './resources/storygrind.icns',
    // Platform-specific icon
    // icon: process.platform === 'darwin' 
    //   ? './resources/storygrind.icns'
    //   : './resources/icons/win/icon',
    // Only sign/notarize on Mac
    ...(process.platform === 'darwin' && {
      osxSign: false,
      osxNotarize: false
    }),
    // Windows-specific metadata
    ...(process.platform === 'win32' && {
      win32metadata: {
        CompanyName: 'Chris Smith',
        FileDescription: 'StoryGrind - Creative Fiction Writing Tool',
        OriginalFilename: 'StoryGrind.exe',
        ProductName: 'StoryGrind',
        InternalName: 'StoryGrind'
      }
    }),
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
      function(path) {
        return path.startsWith('/codemirror/') ? false : null;
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32']
    }
  ]
};