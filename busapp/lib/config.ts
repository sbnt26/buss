/**
 * Centralized configuration from environment variables
 */

export const config = {
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Application
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.PORT || '3000', 10),
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/bussapp',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },

  // Authentication
  auth: {
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-key-minimum-32-characters-long',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // WhatsApp Cloud API
  whatsapp: {
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    apiBaseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
  },

  messenger: {
    pageId: process.env.MESSENGER_PAGE_ID || '',
    accessToken: process.env.MESSENGER_ACCESS_TOKEN || '',
  },

  // File Storage
  storage: {
    pdfPath: process.env.PDF_STORAGE_PATH || '/tmp/invoicer-pdfs',
    pdfUrlPrefix: process.env.PDF_URL_PREFIX || '/api/invoices',
  },

  // Rate Limiting
  rateLimit: {
    waMessagesPerMin: parseInt(process.env.RATE_LIMIT_WA_MESSAGES_PER_MIN || '10', 10),
    apiPerIpPerMin: parseInt(process.env.RATE_LIMIT_API_PER_IP_PER_MIN || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    requests: process.env.LOG_REQUESTS === 'true',
  },

  // Monitoring
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },

  // Feature Flags
  features: {
    emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
    auditLog: process.env.FEATURE_AUDIT_LOG !== 'false', // Enabled by default
    csvExport: process.env.FEATURE_CSV_EXPORT !== 'false', // Enabled by default
    darkMode: process.env.FEATURE_DARK_MODE !== 'false', // Enabled by default
  },
} as const;

// Validation helper (relaxed for deployment)
export function validateConfig(): void {
  const warnings: string[] = [];

  if (!config.database.url || config.database.url.includes('dummy')) {
    warnings.push('DATABASE_URL not properly configured');
  }

  if (!config.auth.sessionSecret || config.auth.sessionSecret.includes('your-session-secret')) {
    warnings.push('SESSION_SECRET not properly configured');
  }

  if (warnings.length > 0) {
    console.warn(`Configuration warnings:\n${warnings.map((w) => `  - ${w}`).join('\n')}`);
  }
}
