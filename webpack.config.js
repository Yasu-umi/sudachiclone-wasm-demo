const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WorkerPlugin = require('worker-plugin');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV;

module.exports = {
  mode: NODE_ENV === "production" ? "production" : "development",
  devServer: {
    publicPath: '/',
  },
  entry: path.resolve(__dirname, 'src/index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'self',
    filename: "[chunkhash].[name].js",
  },
  resolve: {
    extensions: ["*", ".js", ".ts", ".tsx", ".wasm"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WorkerPlugin(),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, 'crate'),
      extraArgs: NODE_ENV !== "production" ? "--no-typescript -- --features wee_alloc" : "--no-typescript -- --features wee_alloc --features console_error_panic_hook",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
    }),
  ],
};
