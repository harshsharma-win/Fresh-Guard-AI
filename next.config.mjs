/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.37.160.240'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
