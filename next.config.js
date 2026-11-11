/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async redirects() {
    return [
      { source: '/news-stories', destination: '/', permanent: true },
      { source: '/explore-story', destination: '/', permanent: false },
      { source: '/stories/explore', destination: '/', permanent: false },
      { source: '/community', destination: '/', permanent: true },
      { source: '/analyze/results', destination: '/analyze', permanent: true },
      { source: '/youtube', destination: '/scroll-feed', permanent: true },
    ]
  },
}

module.exports = nextConfig
