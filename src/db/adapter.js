/**
 * Synchronous better-sqlite3-compatible adapter on top of sql.js (WebAssembly SQLite).
 * No native compilation required — works on any platform.
 */
const fs = require('fs');
const path = require('path');

let _db = null;
let _SQL = null;
let _dbPath = null;

class Statement {
  constructor(sql) {
    this._sql = sql;
  }

  _exec(params) {
    const flat = Array.isArray(params) ? params : Object.values(params || {});
    return _db.exec(this._sql, flat);
  }

  get(...args) {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const stmt = _db.prepare(this._sql);
    let row;
    try {
      stmt.bind(params.length ? params : []);
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
    } finally {
      stmt.free();
    }
    return row || undefined;
  }

  all(...args) {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    const stmt = _db.prepare(this._sql);
    const rows = [];
    try {
      stmt.bind(params.length ? params : []);
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  run(...args) {
    const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    _db.run(this._sql, params.length ? params : []);
    const lastId = _db.exec('SELECT last_insert_rowid() as id');
    const changes = _db.exec('SELECT changes() as n');
    _saveDb();
    return {
      lastInsertRowid: lastId[0]?.values[0]?.[0] ?? 0,
      changes: changes[0]?.values[0]?.[0] ?? 0,
    };
  }
}

function _saveDb() {
  if (_dbPath && _dbPath !== ':memory:') {
    const data = _db.export();
    fs.writeFileSync(_dbPath, Buffer.from(data));
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  pragma(pragma) {
    _db.run(`PRAGMA ${pragma}`);
  },
  exec(sql) {
    _db.run(sql);
    _saveDb();
  },
};

async function initDB(dbPath) {
  _dbPath = dbPath === ':memory:' ? ':memory:' : path.resolve(dbPath);
  const initSqlJs = require('sql.js');
  _SQL = await initSqlJs();

  let fileBuffer = null;
  if (_dbPath !== ':memory:' && fs.existsSync(_dbPath)) {
    fileBuffer = fs.readFileSync(_dbPath);
  }

  _db = fileBuffer ? new _SQL.Database(fileBuffer) : new _SQL.Database();
  return db;
}

module.exports = { initDB, db };
