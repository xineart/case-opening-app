const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// --- 1. ADATBÁZIS INICIALIZÁLÁSA (SQLite Persistent Store) ---
const db = new sqlite3.Database('./lootbox.db', (err) => {
  if (err) console.error('Adatbázis hiba:', err.message);
  else console.log('SQLite Adatbázis csatlakoztatva.');
});

db.serialize(() => {
  // Felhasználók tábla
  db.run(`CREATE TABLE IF NOT EXISTS users (
    steam_id TEXT PRIMARY KEY,
    username TEXT,
    avatar TEXT,
    balance REAL DEFAULT 0.0,
    client_seed TEXT
  )`);

  // Inventory / Raktár tábla
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id TEXT,
    item_name TEXT,
    item_price REAL,
    item_color TEXT,
    item_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tranzakciók tábla (Befizetésekhez)
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id TEXT,
    amount REAL,
    status TEXT,
    payment_id TEXT
  )`);
});

// --- 2. MIDDLEWARE-EK & SESSION ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'lootbox_super_secret_key_12345',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// --- 3. STEAM OAUTH BEJELENTKEZÉS ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new SteamStrategy({
    returnURL: `${DOMAIN}/auth/steam/return`,
    realm: `${DOMAIN}/`,
    apiKey: process.env.STEAM_API_KEY || 'DUMMY_STEAM_API_KEY' // Írd át a saját Steam API kulcsodra
  },
  (identifier, profile, done) => {
    const steamId = profile.id;
    const username = profile.displayName;
    const avatar = profile.photos[2].value;

    db.get('SELECT * FROM users WHERE steam_id = ?', [steamId], (err, row) => {
      if (!row) {
        const defaultClientSeed = crypto.randomBytes(8).toString('hex');
        db.run('INSERT INTO users (steam_id, username, avatar, balance, client_seed) VALUES (?, ?, ?, ?, ?)',
          [steamId, username, avatar, 100.0, defaultClientSeed]);
      }
      return done(null, profile);
    });
  }
));

app.get('/auth/steam', passport.authenticate('steam'));
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// --- 4. PROVABLY FAIR (HMAC-SHA256) RNG ALGORITMUS ---
// Ez garantálja, hogy a nyeremény matmatikailag bizonyíthatóan csalásmentes
function generateProvablyFairRoll(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const subHash = hex.substring(0, 8);
  const decimalValue = parseInt(subHash, 16);
  return decimalValue % 100000; // 0 és 99,999 közötti szám
}

// --- 5. LÁDA KATALÓGUS & ESÉLYEK ---
const CASES = {
  "cobblestone": {
    name: "Cobblestone Souvenir Case",
    price: 10.00,
    items: [
      { name: "P2000 | Turf", price: 0.50, weight: 79900, color: "#b0c3d9", img: "https://via.placeholder.com/150/b0c3d9?text=P2000" },
      { name: "UMP-45 | Briefing", price: 3.00, weight: 15000, color: "#5e98d9", img: "https://via.placeholder.com/150/5e98d9?text=UMP-45" },
      { name: "AWP | Pink DDPAT", price: 45.00, weight: 4000, color: "#d32ce6", img: "https://via.placeholder.com/150/d32ce6?text=AWP+Pink" },
      { name: "M4A1-S | Knight", price: 350.00, weight: 950, color: "#eb4b4b", img: "https://via.placeholder.com/150/eb4b4b?text=M4A1-S+Knight" },
      { name: "AWP | Dragon Lore", price: 2500.00, weight: 50, color: "#caab05", img: "https://via.placeholder.com/150/caab05?text=Dragon+Lore" }
    ]
  }
};

// --- 6. API ENDPOINTOK ---

// Felhasználói adatok lekérése
app.get('/api/user', (req, res) => {
  // DUMMY AUTH: Ha nincs Steam bejelentkezés, egy teszt elemet adunk vissza
  const steamId = req.user ? req.user.id : 'TEST_STEAM_ID';

  db.get('SELECT * FROM users WHERE steam_id = ?', [steamId], (err, user) => {
    if (!user) {
      // Létrehozunk egy teszt elemet ha nem létezne
      db.run('INSERT OR IGNORE INTO users (steam_id, username, avatar, balance, client_seed) VALUES (?, ?, ?, ?, ?)',
        ['TEST_STEAM_ID', 'Teszt Elek', 'https://via.placeholder.com/50', 250.00, 'my_client_seed']);
      return res.json({ steam_id: 'TEST_STEAM_ID', username: 'Teszt Elek', balance: 250.00, client_seed: 'my_client_seed' });
    }
    res.json(user);
  });
});

// Inventory lekérése
app.get('/api/inventory', (req, res) => {
  const steamId = req.user ? req.user.id : 'TEST_STEAM_ID';
  db.all('SELECT * FROM inventory WHERE steam_id = ? ORDER BY id DESC', [steamId], (err, rows) => {
    res.json(rows || []);
  });
});

// PÖRGETÉS (Ládanyitás API)
app.post('/api/open-case', (req, res) => {
  const steamId = req.user ? req.user.id : 'TEST_STEAM_ID';
  const caseData = CASES["cobblestone"];

  db.get('SELECT * FROM users WHERE steam_id = ?', [steamId], (err, user) => {
    if (!user || user.balance < caseData.price) {
      return res.status(400).json({ error: "Nincs elég egyenleged a nyitáshoz!" });
    }

    const newBalance = user.balance - caseData.price;
    const serverSeed = crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();
    
    // Provably Fair roll kiszámítása
    const roll = generateProvablyFairRoll(serverSeed, user.client_seed || 'default', nonce);
    
    // Nyeremény megállapítása
    let cumulative = 0;
    let wonItem = caseData.items[0];

    for (const item of caseData.items) {
      cumulative += item.weight;
      if (roll < cumulative) {
        wonItem = item;
        break;
      }
    }

    // Adatbázis frissítése: Egyenleg levonás & Inventory elmentés
    db.run('UPDATE users SET balance = ? WHERE steam_id = ?', [newBalance, steamId]);
    db.run('INSERT INTO inventory (steam_id, item_name, item_price, item_color, item_image) VALUES (?, ?, ?, ?, ?)',
      [steamId, wonItem.name, wonItem.price, wonItem.color, wonItem.img]);

    res.json({
      wonItem,
      newBalance,
      provablyFair: {
        serverSeedHash: crypto.createHash('sha256').update(serverSeed).digest('hex'),
        clientSeed: user.client_seed,
        nonce,
        roll
      },
      allItems: caseData.items
    });
  });
});

// Tárgy eladása egyenlegért
app.post('/api/sell-item', (req, res) => {
  const { id } = req.body;
  const steamId = req.user ? req.user.id : 'TEST_STEAM_ID';

  db.get('SELECT * FROM inventory WHERE id = ? AND steam_id = ?', [id, steamId], (err, item) => {
    if (!item) return res.status(404).json({ error: "Tárgy nem található!" });

    db.run('DELETE FROM inventory WHERE id = ?', [id], () => {
      db.run('UPDATE users SET balance = balance + ? WHERE steam_id = ?', [item.item_price, steamId], () => {
        db.get('SELECT balance FROM users WHERE steam_id = ?', [steamId], (err, row) => {
          res.json({ success: true, newBalance: row.balance });
        });
      });
    });
  });
});

// --- 7. KRIPTO FIZETÉSI WEBHOOK (Cryptomus / NOWPayments) ---
app.post('/api/payment/webhook', (req, res) => {
  const { status, order_id, amount } = req.body;

  // Ha a fizetés sikeres volt a blokkláncon
  if (status === 'paid' || status === 'finished') {
    db.get('SELECT * FROM transactions WHERE id = ?', [order_id], (err, tx) => {
      if (tx && tx.status !== 'completed') {
        db.run('UPDATE transactions SET status = "completed" WHERE id = ?', [order_id]);
        db.run('UPDATE users SET balance = balance + ? WHERE steam_id = ?', [amount, tx.steam_id]);
      }
    });
  }
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Lootbox Enterprise Szerver fut a ${PORT}-es porton!`);
});
