const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Include expo's own nested node_modules in the resolver search path.
 * This prevents "Unable to resolve" errors for packages that npm nests
 * inside expo rather than hoisting to the project root.
 */
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, 'node_modules', 'expo', 'node_modules'),
];

/**
 * On web, redirect `expo-modules-core` to a shim that adds the missing
 * `registerWebModule` function (required by expo-font on web but absent
 * from expo-modules-core@1.12.x shipped with Expo SDK 51).
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-modules-core') {
    return {
      filePath: path.resolve(__dirname, 'shims', 'expo-modules-core-web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
