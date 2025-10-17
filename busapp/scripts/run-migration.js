#!/usr/bin/env node

const { readFileSync } = require('fs');
const { query } = require('../lib/db');

async function runMigration() {
  try {
    console.log('🚀 Spouštím migraci pro opravu databázového schématu...');

    // Načtu obsah migrace
    const migrationSQL = readFileSync('./migrations/003_fix_schema_columns.sql', 'utf8');

    // Rozdělím na jednotlivé příkazy (podle ;)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    console.log(`📋 Spouštím ${commands.length} příkazů...`);

    // Spustím každý příkaz
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (!command) continue;

      console.log(`⚡ Spouštím příkaz ${i + 1}/${commands.length}...`);
      await query(command);
    }

    console.log('✅ Migrace dokončena úspěšně!');
    console.log('🔄 Restartujte aplikaci v Railway dashboardu');

  } catch (error) {
    console.error('❌ Chyba při spouštění migrace:', error.message);
    process.exit(1);
  }
}

runMigration();
