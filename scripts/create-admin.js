#!/usr/bin/env node
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function createAdmin() {
  console.log('👤 Admin Account Setup\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get admin details
    const email = await prompt('Email: ');
    const password = await prompt('Password: ');
    const fullName = await prompt('Full Name: ');
    const companyName = await prompt('Company Name: ');
    const ico = await prompt('IČO: ');

    console.log('\n🔄 Creating admin account...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, ico, address_street, address_city, address_zip)
       VALUES ($1, $2, 'TBD', 'TBD', '00000')
       RETURNING id`,
      [companyName, ico]
    );
    const organizationId = orgResult.rows[0].id;
    console.log(`✅ Organization created (ID: ${organizationId})`);

    // Create admin user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, organization_id)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id`,
      [email, passwordHash, fullName, organizationId]
    );
    const userId = userResult.rows[0].id;
    console.log(`✅ Admin user created (ID: ${userId})`);

    console.log('\n✅ Admin account successfully created!');
    console.log(`   Email: ${email}`);
    console.log(`   Organization: ${companyName}`);
    console.log('\n📝 Remember to complete onboarding at: https://bussapp.cz/onboarding');
  } catch (error) {
    console.error('\n❌ Failed to create admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdmin();

