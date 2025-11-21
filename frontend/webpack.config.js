const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'production',
  // Use a dummy entry point since we're just copying files
  entry: path.resolve(__dirname, 'public/scripts/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/bundle.js',
    clean: true, // Clean output directory before emit
  },
  // Minimal processing - we're mainly copying files
  module: {
    rules: [],
  },
  plugins: [
    // Copy all files from public/ to dist/ maintaining structure
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['**/node_modules/**'],
          },
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
  },
  // Performance hints
  performance: {
    hints: false,
  },
  // Optimize for faster builds
  optimization: {
    minimize: false, // Don't minify since we're just copying
  },
};

