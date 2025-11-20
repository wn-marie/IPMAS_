const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'production',
  entry: './public/index.html', // Entry point for webpack
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true, // Clean output directory before emit
  },
  // Since we're just copying static files, minimal processing
  module: {
    rules: [
      {
        test: /\.html$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      {
        test: /\.css$/,
        type: 'asset/resource',
        generator: {
          filename: 'styles/[name][ext]',
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    // Copy all files from public/ to dist/
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
};

