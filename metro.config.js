// metro.config.js — integra o NativeWind v4 ao bundler do Expo.
// Sem isso, as classes Tailwind (className="bg-canvas", etc.) não são compiladas
// e o app aparece sem nenhuma estilização.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
