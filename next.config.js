/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'cdn.theatlantic.com',
      'static01.nyt.com',
      'www.washingtonpost.com',
      'media.npr.org',
      'cdn.cnn.com',
      'www.reuters.com',
      'ichef.bbci.co.uk',
      'images.wsj.net',
      'assets.bwbx.io', // Bloomberg
      'assets.time.com',
      'media.wired.com',
      'images.guardian.co.uk'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig 