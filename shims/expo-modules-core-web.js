/**
 * Web shim for expo-modules-core.
 * SDK 51's expo-modules-core@1.12.x does not export `registerWebModule`,
 * which expo-font@55.x (pulled by @expo/vector-icons@14.1) requires on web.
 * This shim re-exports everything from expo-modules-core and adds the missing
 * function so font loading works without upgrading expo-modules-core.
 *
 * Metro resolver redirects `expo-modules-core` → this file on `platform=web`.
 * The explicit relative path below avoids a circular-resolution loop.
 */
const real = require('../node_modules/expo-modules-core');

module.exports = {
  ...real,
  registerWebModule:
    real.registerWebModule ||
    function registerWebModule(NativeClass) {
      return NativeClass;
    },
};
