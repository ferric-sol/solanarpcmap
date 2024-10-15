/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        util: false,
        net: false,
      };
    }
    return config;
  },
  images: {
    domains: ['ip-api.com'],
  },
};

module.exports = nextConfig;
