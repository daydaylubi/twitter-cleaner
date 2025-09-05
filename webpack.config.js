const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');

const baseConfig = {
  entry: {
    popup: './src/popup/popup.js',
    background: './src/background/background.js',
    content: './src/content/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/assets',
          to: 'assets'
        }
      ]
    })
  ]
};

const developmentConfig = {
  mode: 'development',
  devtool: 'inline-source-map'
};

const productionConfig = {
  mode: 'production',
  devtool: 'source-map'
};

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  return merge(baseConfig, isProduction ? productionConfig : developmentConfig);
};