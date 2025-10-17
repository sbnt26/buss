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
    url: process.env.DATABASE_URL || '',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },

  // Authentication
  auth: {
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-here-minimum-32-characters',
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

// Validation helper
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.auth.sessionSecret || config.auth.sessionSecret.length < 32) {
    errors.push('SESSION_SECRET is required and must be at least 32 characters');
  }

  if (config.isProduction) {
    if (!config.whatsapp.accessToken) {
      errors.push('WHATSAPP_ACCESS_TOKEN is required in production');
    }
    if (!config.whatsapp.appSecret) {
      errors.push('WHATSAPP_APP_SECRET is required in production');
    }
    if (!config.whatsapp.verifyToken) {
      errors.push('WHATSAPP_VERIFY_TOKEN is required in production');
    }
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    console.error(errorMessage);

    // In development, only warn; in production, throw error
    if (config.isProduction) {
      throw new Error(errorMessage);
    }
  }
}
