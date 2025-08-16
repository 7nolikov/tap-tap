/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: "/tap-tap/",
  basePath: "/tap-tap",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
