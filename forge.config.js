module.exports = {
  packagerConfig: {
    asar: true,
    name: 'storygrind',
    executableName: 'storygrind',
    // Platform-specific icon handling
    icon: process.platform === 'darwin' 
      ? './resources/storygrind.icns'
      : './resources/icons/win/icon',
    osxSign: false,
    osxNotarize: false,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      icon: './resources/storygrind.icns',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux'],
    }
  ]
};
