// babel.config.js
// Expo + NativeWind (Tailwind para React Native) + Reanimated.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Preset padrão do Expo (transpila TS/JSX).
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated (3.10+) já inclui o plugin de worklets internamente.
      // Declarar 'react-native-worklets/plugin' separado causa "Duplicate plugin"
      // porque ambos resolvem para o mesmo arquivo. Manter só o do reanimated.
      'react-native-reanimated/plugin',
    ],
  };
};
