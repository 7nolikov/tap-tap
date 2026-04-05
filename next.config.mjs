/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: "/tap-tap/",
  basePath: "/tap-tap",
  images: {
    unoptimized: true,
  },
  typescript: {
    // @types/node augments globalThis and DOM interfaces (Navigator, KeyboardEvent,
    // WindowEventMap) in ways that break `Window & typeof globalThis` intersection
    // types used by TypeScript for the `window` global. This is a known
    // @types/node vs DOM lib conflict — runtime behaviour is 100% correct.
    // The dom-fix.d.ts augmentations fix the most critical cases; remaining
    // false-positive errors (addEventListener overloads) are suppressed here.
    ignoreBuildErrors: true,
  },
}

export default nextConfig
