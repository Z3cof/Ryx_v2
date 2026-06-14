const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enableVisualizer: false,
};

config.watchFolders = [__dirname];

config.resolver.blockList = [
  /ios\/Pods\/.*/,
  /ios\/build\/.*/,
  /android\/.*/,
];

module.exports = config;