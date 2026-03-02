/**
 * suppress-web-warnings.js
 *
 * Must be the FIRST import in App.js so it runs before any other module's
 * StyleSheet.create calls (where react-native-web emits deprecation warnings
 * about shadow* props and props.pointerEvents from library internals).
 *
 * LogBox.ignoreLogs() is a no-op on web, so we patch console directly.
 * Only the specific library-generated deprecations are suppressed; all other
 * warnings and errors remain visible.
 */

const SUPPRESSED = [
  '"shadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
  'Animated: `useNativeDriver`',
];

if (typeof console !== 'undefined') {
  ['warn', 'error'].forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      const msg = args[0];
      if (
        typeof msg === 'string' &&
        SUPPRESSED.some((s) => msg.includes(s))
      ) {
        return;
      }
      original(...args);
    };
  });
}
