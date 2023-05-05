/** @type {import('next').NextConfig} */

const CopyPlugin = require('copy-webpack-plugin')
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, {isServer}) => {
    if (isServer) {
      return config
    }
    config.plugins.push(new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "tailscale/cmd/tsconnect/pkg/main.wasm"),
          to: path.resolve(__dirname, "public/main.wasm")},
      ]
    }));
    return config
  }
}

module.exports = nextConfig
