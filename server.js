const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey12345';
const MONGO_URI = process.env.MONGO_URI || '';

let isMongoConnected = false;

// In-memory fallback adatbázis (ha nincs MongoDB kapcsolat)
const localUsers = new Map();

if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log('✅ MongoDB Csatlakoztatva!');
      isMongoConnected = true;
    })
    .catch(err => {
      console.warn('⚠️ MongoDB csatlakozási hiba, átváltás helyi memóriára:', err.message);
      isMongoConnected = false;
    });
} else {
  console.log('ℹ️ Nincs MONGO_URI megadva, helyi memóriás adatbázis fut.');
}

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 500.00 },
  inventory: [{
    name: String,
    price: Number,
    rarity: String,
    img: String,
    date: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Hiányzó token! Lépj be újra.' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isMongoConnected) {
      req.user = await User.findById(decoded.id);
    } else {
      req.user = localUsers.get(decoded.id);
    }

    if (!req.user) return res.status(404).json({ error: 'Felhasználó nem található!' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Érvénytelen vagy lejárt token!' });
  }
};

// --- API ENDPOINTS ---

// Regisztráció
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Add meg a felhasználónevet és a jelszót!' });
    }

    const cleanName = username.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isMongoConnected) {
      const existing = await User.findOne({ username: cleanName });
      if (existing) return res.status(400).json({ error: 'Ez a név már foglalt!' });

      const newUser = new User({ username: cleanName, password: hashedPassword, balance: 500.00, inventory: [] });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: newUser.username, balance: newUser.balance });
    } else {
      for (let u of localUsers.values()) {
        if (u.username.toLowerCase() === cleanName.toLowerCase()) {
          return res.status(400).json({ error: 'Ez a név már foglalt!' });
        }
      }

      const userId = 'user_' + Date.now();
      const newUser = { _id: userId, username: cleanName, password: hashedPassword, balance: 500.00, inventory: [] };
      localUsers.set(userId, newUser);

      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: newUser.username, balance: newUser.balance });
    }
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Szerver hiba regisztrációkor: ' + err.message });
  }
});

// Bejelentkezés
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Add meg a felhasználónevet és a jelszót!' });
    }

    const cleanName = username.trim();
    let targetUser = null;

    if (isMongoConnected) {
      targetUser = await User.findOne({ username: cleanName });
    } else {
      for (let u of localUsers.values()) {
        if (u.username.toLowerCase() === cleanName.toLowerCase()) {
          targetUser = u;
          break;
        }
      }
    }

    if (!targetUser) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const isMatch = await bcrypt.compare(password, targetUser.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const token = jwt.sign({ id: targetUser._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: targetUser.username, balance: targetUser.balance });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Szerver hiba bejelentkezéskor: ' + err.message });
  }
});

// Profil adatok
app.get('/api/user/me', auth, (req, res) => {
  res.json({
    username: req.user.username,
    balance: req.user.balance,
    inventory: req.user.inventory || []
  });
});

// Demo Feltöltés
app.post('/api/user/deposit', auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount) || 100;
    req.user.balance += amount;

    if (isMongoConnected) {
      await req.user.save();
    }

    return res.json({ balance: req.user.balance });
  } catch (err) {
    return res.status(500).json({ error: 'Feltöltési hiba!' });
  }
});

// Ládanyitás poolok definíciója
const CASE_POOLS = {
  'c1': [
    { name: 'AK-47 | Redline', price: 18.50, rarity: 'var(--rare-rare)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'M4A4 | Cyber Security', price: 28.00, rarity: 'var(--rare-mythical)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'USP-S | Neo-Noir', price: 42.00, rarity: 'var(--rare-legendary)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'AWP | Atheris', price: 12.00, rarity: 'var(--rare-uncommon)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' }
  ],
  'c2': [
    { name: 'AWP | Asiimov', price: 110.00, rarity: 'var(--rare-legendary)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'AK-47 | Vulcan', price: 240.00, rarity: 'var(--rare-legendary)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'Desert Eagle | Printstream', price: 95.00, rarity: 'var(--rare-mythical)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' }
  ],
  'c3': [
    { name: '★ Karambit | Fade', price: 1450.00, rarity: 'var(--rare-immortal)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: '★ Butterfly Knife | Marble Fade', price: 2100.00, rarity: 'var(--rare-immortal)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' },
    { name: 'AWP | Dragon Lore', price: 4500.00, rarity: 'var(--rare-immortal)', img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a115ea2a2f5f6d2b5025a75103a830953ef8d6e3f28cf954a7c1cdb21c4b14d87214f49e4d58804919d71c4c92b23467472fa998a4d46816fa8a7f0e340d04c/360fx360f' }
  ]
};

const CASE_PRICES = { 'c1': 15.00, 'c2': 75.00, 'c3': 350.00 };

app.post('/api/cases/open', auth, async (req, res) => {
  try {
    const { caseId } = req.body;
    const price = CASE_PRICES[caseId] || 15.00;
    const pool = CASE_POOLS[caseId] || CASE_POOLS['c1'];

    if (req.user.balance < price) {
      return res.status(400).json({ error: 'Nincs elég egyenleged a ládanyitáshoz!' });
    }

    const wonItem = pool[Math.floor(Math.random() * pool.length)];

    req.user.balance -= price;
    req.user.inventory.push(wonItem);

    if (isMongoConnected) {
      await req.user.save();
    }

    return res.json({ wonItem, newBalance: req.user.balance });
  } catch (err) {
    return res.status(500).json({ error: 'Hiba a láda nyitásakor!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Szerver fut a ${PORT}-es porton`));
