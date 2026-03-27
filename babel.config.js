module.exports = function(api) {
  const isProd = api.env('production'); // Более надежный способ для Babel в RN

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      isProd ? 'transform-remove-console' : null,
    ].filter(Boolean),
  };
};
