/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration for Stork SMS Web App
  
  // Exclude reference folder from compilation
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /reference\//,
      use: 'ignore-loader'
    });
    return config;
  },
  
  // Also exclude from page directory scanning
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => ext),
  
  // Ignore reference folder completely
  experimental: {
    typedRoutes: true
  }
}

module.exports = nextConfig