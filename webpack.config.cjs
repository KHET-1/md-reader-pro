const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shouldAnalyze = argv.analyze || process.env.ANALYZE_BUNDLE === 'true';

  const plugins = [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: false // Disable HTML minification to avoid issues with inline JavaScript
    })
  ];

  // Add bundle analyzer plugin when requested
  if (shouldAnalyze) {
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
        generateStatsFile: true,
        statsFilename: 'bundle-analysis-report.html'
      })
    );
  }

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
    plugins,
    devServer: {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || 'localhost',
      open: false,
      hot: true,
      compress: true,
      historyApiFallback: true,
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }
        // Ensure logs directory exists
        const logsDir = path.resolve(__dirname, 'logs');
        try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir); } catch (_) {}
        const reqLogPath = path.join(logsDir, 'dev-requests.log');
        let reqStream;
        try { reqStream = fs.createWriteStream(reqLogPath, { flags: 'a' }); } catch (_) {}

        // Basic request logger with duration and status
        devServer.app.use((req, res, next) => {
          const start = Date.now();
          res.on('finish', () => {
            const dur = Date.now() - start;
            const line = `[${new Date().toISOString()}] ${res.statusCode} ${req.method} ${req.originalUrl} ${dur}ms UA=${req.headers['user-agent'] || '-'}\n`;
            try { if (reqStream) reqStream.write(line); } catch (_) {}
            // Keep console succinct; still helpful for local debugging
            try { console.log(line.trim()); } catch (_) {}
          });
          next();
        });

        return middlewares;
      }
    }
  };
};
