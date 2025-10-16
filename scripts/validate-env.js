#!/usr/bin/env node

/**
 * Validate environment variables on startup
 * Run with: node scripts/validate-env.js
 */

const required = [
  'DATABASE_URL',
  'SESSION_SECRET',
];

const productionOnly = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'GOTENBERG_URL',
  'PDF_STORAGE_PATH',
];

function validateEnv() {
  const missingRequired = [];
  const missingProduction = [];

  // Check required vars
  required.forEach((key) => {
    if (!process.env[key]) {
      missingRequired.push(key);
    }
  });

  // Check production vars
  if (process.env.NODE_ENV === 'production') {
    productionOnly.forEach((key) => {
      if (!process.env[key]) {
        missingProduction.push(key);
      }
    });
  }

  // Report errors
  if (missingRequired.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingRequired.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  if (missingProduction.length > 0) {
    console.error('❌ Missing production environment variables:');
    missingProduction.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Validate SESSION_SECRET strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.error('❌ SESSION_SECRET must be at least 32 characters long');
    console.error('   Generate with: openssl rand -hex 32');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
}

// Run validation
validateEnv();



