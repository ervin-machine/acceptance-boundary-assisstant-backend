const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '005_add_action_metadata.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
