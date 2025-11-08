/**
 * Database Setup Script
 * This script helps set up the database tables for the MindCare application
 * 
 * Usage: node setup-db.js
 */

require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let conn;
  let tempPool;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🏠 Host: ${process.env.DB_HOST}`);
    
    // Connect without specifying database first (in case it doesn't exist)
    tempPool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 1,
    });
    
    conn = await tempPool.getConnection();
    console.log('✅ Connected to MariaDB server');
    
    // Create database if it doesn't exist
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`✅ Database '${process.env.DB_NAME}' ready`);
    
    // Use the database
    await conn.query(`USE \`${process.env.DB_NAME}\``);
    
    // Read and execute the init.sql file
    const initSql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
    
    // Split by semicolons and execute each statement
    // Remove comments and empty lines
    const statements = initSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('CREATE DATABASE') &&
        !stmt.startsWith('USE')
      );
    
    console.log('📝 Creating tables...');
    
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await conn.query(statement);
          if (statement.includes('CREATE TABLE')) {
            const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
            if (tableName) {
              console.log(`  ✅ Created table: ${tableName}`);
            }
          }
        } catch (err) {
          // Ignore "table already exists" errors
          if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.errno !== 1050) {
            console.error(`  ❌ Error executing statement:`, err.message);
            throw err;
          } else {
            const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
            if (tableName) {
              console.log(`  ℹ️  Table already exists: ${tableName}`);
            }
          }
        }
      }
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('📋 Tables created:');
    console.log('   - users (for authentication)');
    console.log('   - moods (for mood tracking)');
    console.log('   - journal_entries (for journal entries)');
    
  } catch (err) {
    console.error('❌ Database setup failed:');
    console.error('   Error:', err.message);
    console.error('   Code:', err.code);
    console.error('\n💡 Make sure:');
    console.error('   1. MariaDB/MySQL is running');
    console.error('   2. Database credentials in .env are correct');
    console.error('   3. The database user has CREATE privileges');
    process.exit(1);
  } finally {
    if (conn) {
      conn.release();
    }
    if (tempPool) {
      await tempPool.end();
    }
  }
}

// Run the setup
setupDatabase();

