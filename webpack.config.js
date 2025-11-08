const webpack = require('webpack');

module.exports = function (options) {
  return {
    ...options,
    plugins: [
      ...options.plugins,
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/, /node_modules/],
      }),
    ],
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
      minimize: false,
    },
    output: {
      ...options.output,
      pathinfo: false,
    },
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    stats: 'errors-warnings',
  };
};
