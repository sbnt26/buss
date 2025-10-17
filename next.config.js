/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config, { isServer }) => {
    config.externals.push({
      'pg-native': 'commonjs pg-native',
    })
    
    // Ensure webpack resolves @ alias correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }
    
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

// Environment variables validation (relaxed for deployment)
// Only warn about missing vars, don't fail the build
const optionalEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET'
]

const missingVars = optionalEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`)
  console.warn('Application will use fallback values')
}

module.exports = nextConfig

