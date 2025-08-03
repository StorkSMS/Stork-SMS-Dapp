/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration for Stork SMS Web App
  
  // Disable static optimization to avoid SSR issues with wallet components
  output: 'standalone',
  
  // Experimental features
  experimental: {
    typedRoutes: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle wallet adapter ESM modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Exclude Netlify Edge Functions from compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/netlify/edge-functions/**']
    };
    
    return config;
  },
}

module.exports = nextConfig