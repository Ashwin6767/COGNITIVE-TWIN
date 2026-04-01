/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    // Strip trailing /api if present to get the base URL for rewrites
    const backendBase = apiUrl.endsWith('/api')
      ? apiUrl.slice(0, -4)
      : apiUrl.replace('/api', '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
