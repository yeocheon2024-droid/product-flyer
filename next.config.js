/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages 호환
  experimental: {
    // ISR 없이 정적 빌드
  },
};

module.exports = nextConfig;
