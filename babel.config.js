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
      // worklets deve vir ANTES do reanimated (dependência do reanimated 3.10+).
      'react-native-worklets/plugin',
      // Reanimated precisa vir por último para instrumentar corretamente o código.
      'react-native-reanimated/plugin',
    ],
  };
};
