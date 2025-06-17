module.exports = {
  packagerConfig: {
    "win32metadata": {
      "ProductName": "HiLoop",
    },
    icon: './inm_assistant/src/assets/app',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: "inmai"
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
