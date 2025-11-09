import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const applyMigration = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
  });

  try {
    const client = await pool.connect();
    console.log('Connected to the database!');

    const migrationFilePath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');

    console.log('Applying initial schema migration...');
    await client.query(migrationSql);
    console.log('Initial schema migration applied successfully!');

    client.release();
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

applyMigration();