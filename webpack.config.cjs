const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.js',
    mode: argv.mode || 'development',
    // Source maps for debugging
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'bundle.[contenthash].js' : 'bundle.js',
      clean: true
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        minify: false // Disable HTML minification to avoid issues with inline JavaScript
      })
    ],
    devServer: {
      port: 3000,
      open: true,
      hot: true,
      compress: true,
      historyApiFallback: true
    }
  };
};