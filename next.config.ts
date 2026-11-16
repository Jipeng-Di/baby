import type {NextConfig} from 'next';

// `CAPACITOR=1 next build` produces the static bundle the iOS app ships inside (see capacitor.config.ts);
// the normal build is what Vercel serves.
const native = process.env.CAPACITOR === '1';
const nextConfig: NextConfig = native
  ? {output: 'export', distDir: 'out-native', trailingSlash: true, images: {unoptimized: true}}
  : {};
export default nextConfig;
