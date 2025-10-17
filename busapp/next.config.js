/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config) => {
    config.externals.push({
      'pg-native': 'commonjs pg-native',
    })
    return config
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

// Environment variables validation
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
]

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET')
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`)
  console.warn('Application may not function correctly')
}

module.exports = nextConfig

