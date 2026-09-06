const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { dbQuery } = require('./database');
const ProvablyFair = require('./provablyFair');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_ENTERPRISE_JWT_KEY_998877';

// --- MIDDLEWARE-EK ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting (DDoS és Brute Force elleni védelem)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 100, // max 100 kérés IP-nként
  message: { error: 'Túl sok kérés erről az IP címről, próbáld újra később!' }
});
app.use('/api/', apiLimiter);

// --- AUTH MIDDLEWARE (JWT Ellenőrzés) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Azonosítás szükséges (Nincs Token)!' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Érvénytelen vagy lejárt Token!' });
    req.user = user;
    next();
  });
};

// --- LÁDA KATALÓGUS ÉS NYEREMÉNY ESÉLYEK ---
const CASES_CATALOG = {
  "hyper_beast": {
    id: "hyper_beast",
    name: "Hyper Beast Edition Case",
    price: 25.00,
    items: [
      { id: "p250_ripple", name: "P250 | Ripple", price: 1.20, weight: 75000, color: "#4b69ff", img: "https://via.placeholder.com/150/4b69ff?text=P250" },
      { id: "ak47_point_disarray", name: "AK-47 | Point Disarray", price: 18.50, weight: 18000, color: "#8847ff", img: "https://via.placeholder.com/150/8847ff?text=AK-47" },
      { id: "m4a4_desolate_space", name: "M4A4 | Desolate Space", price: 45.00, weight: 5500, color: "#d32ce6", img: "https://via.placeholder.com/150/d32ce6?text=M4A4" },
      { id: "awp_hyper_beast", name: "AWP | Hyper Beast", price: 120.00, weight: 1400, color: "#eb4b4b", img: "https://via.placeholder.com/150/eb4b4b?text=AWP+Hyper" },
      { id: "karambit_gamma_doppler", name: "★ Karambit | Gamma Doppler", price: 1450.00, weight: 100, color: "#caab05", img: "https://via.placeholder.com/150/caab05?text=Karambit" }
    ]
  }
};

// --- API ENDPOINTOK ---

// 1. REGISZTRÁCIÓ
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });
    }

    const existingUser = await dbQuery.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Ez a felhasználónév vagy email már foglalt!' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const clientSeed = ProvablyFair.generateClientSeed();
    const serverSeed = ProvablyFair.generateServerSeed();

    const result = await dbQuery.run(
      `INSERT INTO users (username, email, password_hash, client_seed, server_seed) VALUES (?, ?, ?, ?, ?)`,
      [username, email, passwordHash, clientSeed, serverSeed]
    );

    const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: result.lastID, username, balance: 100.0, clientSeed }
    });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a regisztráció során!' });
  }
});

// 2. BEJELENTKEZÉS
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await dbQuery.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        clientSeed: user.client_seed
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a bejelentkezéskor!' });
  }
});

// 3. PROFILE ÉS EGYENLEG LEKÉRÉSE
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbQuery.get('SELECT id, username, email, balance, client_seed, server_seed, nonce FROM users WHERE id = ?', [req.user.id]);
    res.json({
      ...user,
      serverSeedHash: ProvablyFair.hashServerSeed(user.server_seed)
    });
  } catch (err) {
    res.status(500).json({ error: 'Nem sikerült lekérni a profil adatokat.' });
  }
});

// 4. LÁDANYITÁS (PROVABLY FAIR GAMBLING ENGINE)
app.post('/api/game/open-case', authenticateToken, async (req, res) => {
  try {
    const { caseId } = req.body;
    const caseData = CASES_CATALOG[caseId || "hyper_beast"];

    if (!caseData) {
      return res.status(404).json({ error: 'A kért láda nem létezik!' });
    }

    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (user.balance < caseData.price) {
      return res.status(400).json({ error: 'Nincs elegendő egyenleged a ládanyitáshoz!' });
    }

    // Számítások
    const newBalance = user.balance - caseData.price;
    const currentNonce = user.nonce + 1;
    const roll = ProvablyFair.calculateRoll(user.server_seed, user.client_seed, currentNonce);
    const wonItem = ProvablyFair.determineOutcome(caseData.items, roll);

    // ADATBÁZIS TRANZAKCIÓ LÉPÉSEK
    await dbQuery.run('UPDATE users SET balance = ?, nonce = ? WHERE id = ?', [newBalance, currentNonce, user.id]);

    await dbQuery.run(
      `INSERT INTO inventory (user_id, item_id, item_name, item_price, item_color, item_image) VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, wonItem.id, wonItem.name, wonItem.price, wonItem.color, wonItem.img]
    );

    await dbQuery.run(
      `INSERT INTO game_history (user_id, case_id, won_item_name, won_item_price, server_seed, client_seed, nonce, roll_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, caseData.id, wonItem.name, wonItem.price, user.server_seed, user.client_seed, currentNonce, roll]
    );

    res.json({
      success: true,
      wonItem,
      newBalance,
      provablyFair: {
        serverSeedHash: ProvablyFair.hashServerSeed(user.server_seed),
        clientSeed: user.client_seed,
        nonce: currentNonce,
        roll
      },
      allItems: caseData.items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hiba történt a pörgetés közben!' });
  }
});

// 5. INVENTORY LEKÉRÉS
app.get('/api/user/inventory', authenticateToken, async (req, res) => {
  try {
    const items = await dbQuery.all('SELECT * FROM inventory WHERE user_id = ? AND is_sold = 0 ORDER BY id DESC', [req.user.id]);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Hiba a leltár lekérésekor.' });
  }
});

// 6. TÁRGY ELADÁSA EGYENLEGÉRT
app.post('/api/user/sell-item', authenticateToken, async (req, res) => {
  try {
    const { inventoryId } = req.body;
    const item = await dbQuery.get('SELECT * FROM inventory WHERE id = ? AND user_id = ? AND is_sold = 0', [inventoryId, req.user.id]);

    if (!item) {
      return res.status(404).json({ error: 'A tárgy nem található vagy már eladtad!' });
    }

    await dbQuery.run('UPDATE inventory SET is_sold = 1 WHERE id = ?', [inventoryId]);
    await dbQuery.run('UPDATE users SET balance = balance + ? WHERE id = ?', [item.item_price, req.user.id]);

    const updatedUser = await dbQuery.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);

    res.json({ success: true, newBalance: updatedUser.balance });
  } catch (err) {
    res.status(500).json({ error: 'Hiba az eladás során.' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Enterprise Kaszinó Szerver elindult a ${PORT}-es porton!`);
});
app.listen(PORT, () => {
  console.log(`Lootbox Enterprise Szerver fut a ${PORT}-es porton!`);
});
