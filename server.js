const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cryptocasino';

// MongoDB Csatlakozás
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('✅ MongoDB Csatlakoztatva'))
  .catch(err => console.error('❌ MongoDB Csatlakozási Hiba:', err.message));

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 250.00 },
  inventory: [{
    name: String,
    price: Number,
    img: String,
    date: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Nincs token, lépj be!' });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(404).json({ error: 'Felhasználó nem található' });

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Érvénytelen vagy lejárt token' });
  }
};

// --- API ENDPOINTS ---

// Regisztráció
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Töltsd ki a felhasználónevet és a jelszót!' });
    }

    const cleanUsername = username.trim();
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username: cleanUsername, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: user.username, balance: user.balance });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Szerver hiba a regisztrációnál!' });
  }
});

// Bejelentkezés
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Töltsd ki a felhasználónevet és a jelszót!' });
    }

    const cleanUsername = username.trim();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: user.username, balance: user.balance });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Szerver hiba a bejelentkezésnél!' });
  }
});

// Saját adatok lekérése
app.get('/api/user/me', auth, (req, res) => {
  return res.json({
    username: req.user.username,
    balance: req.user.balance,
    inventory: req.user.inventory || []
  });
});

// Demo Egyenleg Feltöltés
app.post('/api/user/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Érvénytelen összeg' });

    req.user.balance += Number(amount);
    await req.user.save();
    return res.json({ balance: req.user.balance });
  } catch (err) {
    return res.status(500).json({ error: 'Hiba a feltöltés során' });
  }
});

// Szerveroldali biztonságos Ládanyitás
app.post('/api/cases/open', auth, async (req, res) => {
  try {
    const casePrice = 15.00;
    if (req.user.balance < casePrice) {
      return res.status(400).json({ error: 'Nincs elegendő egyenleged a nyitáshoz!' });
    }

    const pool = [
      { name: 'AK-47 | Neon Rider', price: 45.00, rarity: 'var(--rare-legendary)', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=300&auto=format&fit=crop&q=80' },
      { name: 'M4A4 | Cyber Dragon', price: 120.00, rarity: 'var(--rare-mythical)', img: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80' },
      { name: 'Karambit | Gold Crypto', price: 850.00, rarity: 'var(--rare-immortal)', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' }
    ];

    const wonItem = pool[Math.floor(Math.random() * pool.length)];

    req.user.balance -= casePrice;
    req.user.inventory.push(wonItem);
    await req.user.save();

    return res.json({
      wonItem,
      newBalance: req.user.balance
    });
  } catch (err) {
    console.error('Case open error:', err);
    return res.status(500).json({ error: 'Hiba történt a ládanyitás során!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Szerver fut a ${PORT}-es porton`));
