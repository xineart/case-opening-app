const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'casino_production.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('CRITICAL: Adatbázis csatlakozási hiba:', err.message);
  } else {
    console.log('[DATABASE] Sikeresen csatlakozva az SQLite Adatbázishoz.');
  }
});

// Adatbázis sémák inicializálása
db.serialize(() => {
  // 1. FELHASZNÁLÓK TÁBLA (Jelszó hash-sel, Steam helyett saját auth)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance REAL DEFAULT 100.0,
    role TEXT DEFAULT 'user',
    client_seed TEXT NOT NULL,
    server_seed TEXT NOT NULL,
    nonce INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. INVENTORY (Leltár) TÁBLA
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_price REAL NOT NULL,
    item_color TEXT NOT NULL,
    item_image TEXT NOT NULL,
    is_sold INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 3. PROVABLY FAIR JÁTÉKTÖRTÉNET TÁBLA
  db.run(`CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    case_id TEXT NOT NULL,
    won_item_name TEXT NOT NULL,
    won_item_price REAL NOT NULL,
    server_seed TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    roll_number INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 4. TRANZAKCIÓK TÁBLA (Kripto / Egyenleg feltöltés)
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdrawal'
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    payment_provider TEXT NOT NULL,
    payment_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// Ígéreteken (Promises) alapuló Adatbázis Wrapper-ek a tiszta async/await kódért
const dbQuery = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = { db, dbQuery };
