/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration for Stork SMS Web App
  
  // Exclude reference folder from compilation
  webpack: (config, { isServer }) => {
    // Exclude reference folder from TypeScript compilation
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Add rule to ignore reference folder files
    config.module.rules.push({
      test: /\.(tsx?|jsx?)$/,
      exclude: [/node_modules/, /reference/],
      use: config.module.rules.find(rule => rule.use && rule.use.loader === 'next-swc-loader')?.use || 'ignore-loader',
    });
    
    return config;
  },
  
  // Ignore reference folder completely during development
  experimental: {
    typedRoutes: true,
  }
}

module.exports = nextConfig