require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDB, db: sqlDb } = require('./adapter');

const DB_PATH = process.env.DATABASE_URL || './kmh.db';
let initialized = false;

async function getDB() {
  if (!initialized) {
    await initDB(DB_PATH);
    initialized = true;
    sqlDb.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const stmts = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try { sqlDb.exec(stmt); } catch (_) {}
    }
    console.log('✅ Database ready at', DB_PATH);
  }
  return sqlDb;
}

// Forwarding methods — safe to require before init, called only after init by routes
const db = {
  getDB,
  prepare: (sql) => sqlDb.prepare(sql),
  pragma: (p) => sqlDb.pragma(p),
  exec: (sql) => sqlDb.exec(sql),
};

module.exports = db;
