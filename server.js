const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// --- ADATBÁZIS KAPCSOLÓDÁS ---
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('>>> Sikeres MongoDB csatlakozás! <<<');
      await initAdminUser();
      await initDefaultCases();
    })
    .catch(err => {
      console.error('MongoDB csatlakozási hiba:', err);
    });
} else {
  console.error("KRITIKUS: A MONGO_URI környezeti változó hiányzik!");
}

// --- ADATBÁZIS SCHEMÁK ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 500.00 },
  isAdmin: { type: Boolean, default: false },
  inventory: [{
    itemId: String,
    name: String,
    price: Number,
    color: String,
    img: String,
    obtainedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const caseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  items: [{
    id: String,
    name: String,
    price: Number,
    color: String,
    chance: Number,
    img: String
  }]
});

const User = mongoose.model('User', userSchema);
const Case = mongoose.model('Case', caseSchema);

// --- SESSION ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'titkos_terbdrop_mindenkinek_123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// --- KEZDŐ ADATOK INICIALIZÁLÁSA ---
async function initAdminUser() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        balance: 10000.00,
        isAdmin: true
      });
      console.log('>>> Alapértelmezett admin fiók létrehozva: admin / admin123 <<<');
    }
  } catch (err) {
    console.error('Hiba az admin fiók inicializálásakor:', err);
  }
}

async function initDefaultCases() {
  try {
    const caseCount = await Case.countDocuments();
    if (caseCount === 0) {
      await Case.create({
        caseId: 'weapon',
        name: 'TerBDrop Premium v1',
        price: 50.00,
        items: [
          { id: 'w_1', name: 'Karambit | Fade', price: 1200.00, color: '#ffd700', chance: 1.0, img: '' },
          { id: 'w_2', name: 'AK-47 | Fire Serpent', price: 400.00, color: '#eb4b4b', chance: 4.0, img: '' },
          { id: 'w_3', name: 'AWP | Asiimov', price: 120.00, color: '#d32ce6', chance: 15.0, img: '' },
          { id: 'w_4', name: 'USP-S | Kill Confirmed', price: 65.00, color: '#8847ff', chance: 30.0, img: '' },
          { id: 'w_5', name: 'P250 | Sand Dune', price: 1.50, color: '#b0c3d9', chance: 50.0, img: '' }
        ]
      });
      console.log('>>> Alapértelmezett láda létrehozva! <<<');
    }
  } catch (err) {
    console.error('Hiba a ládák inicializálásakor:', err);
  }
}

// --- MIDDLEWARE ---
async function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Bejelentkezés szükséges!' });
  const user = await User.findById(req.session.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Hozzáférés megtagadva!' });
  next();
}

function getRandomItemFromCase(caseData) {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const item of caseData.items) {
    cumulative += item.chance;
    if (rand <= cumulative) return item;
  }
  return caseData.items[caseData.items.length - 1];
}

// --- BIZTONSÁGOS ADMIN-JOG ADÓ LINK ---
app.get('/make-me-admin', async (req, res) => {
  const secretKey = req.query.secret;
  if (secretKey !== 'TitkosAdminKod123') {
    return res.status(403).send('<h1>403 - Hibás titkos kód!</h1>');
  }
  if (!req.session.userId) {
    return res.send('<h1>Először jelentkezz be az oldalon!</h1>');
  }
  await User.findByIdAndUpdate(req.session.userId, { isAdmin: true });
  res.send('<h1>Sikeresen Admin lettél! Menj vissza a főoldalra és frissíts (F5).</h1>');
});

// --- AUTH API VÉGPONTOK ---

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

    const cleanUsername = username.trim();
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: cleanUsername, password: hashedPassword, balance: 500.00, isAdmin: false });

    await newUser.save();
    req.session.userId = newUser._id;

    res.json({ success: true, username: newUser.username, balance: newUser.balance, isAdmin: newUser.isAdmin, inventory: newUser.inventory });
  } catch (err) {
    console.error('Regisztrációs hiba:', err);
    res.status(500).json({ error: 'Szerveroldali hiba történt a regisztráció során.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező!' });

    const cleanUsername = username.trim();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    req.session.userId = user._id;
    res.json({ success: true, username: user.username, balance: user.balance, isAdmin: user.isAdmin, inventory: user.inventory });
  } catch (err) {
    console.error('Bejelentkezési hiba:', err);
    res.status(500).json({ error: 'Szerveroldali hiba történt a bejelentkezés során.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/me', async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username, balance: user.balance, isAdmin: user.isAdmin, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- JÁTÉK API ---

app.get('/api/cases', async (req, res) => {
  try {
    const cases = await Case.find();
    const caseMap = {};
    cases.forEach(c => { caseMap[c.caseId] = c; });
    res.json(caseMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/open-case', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Kérjük, jelentkezzen be!' });

    const { caseId } = req.body;
    const targetCase = await Case.findOne({ caseId: caseId });
    if (!targetCase) return res.status(400).json({ error: 'Érvénytelen láda!' });

    const user = await User.findById(req.session.userId);
    if (user.balance < targetCase.price) return res.status(400).json({ error: `Nincs elegendő egyenleg! (${targetCase.price} $)` });

    user.balance -= targetCase.price;
    const wonItem = getRandomItemFromCase(targetCase);

    user.inventory.push({
      itemId: wonItem.id,
      name: wonItem.name,
      price: wonItem.price,
      color: wonItem.color,
      img: wonItem.img
    });

    await user.save();
    res.json({ success: true, item: wonItem, newBalance: user.balance, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sell-item', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Nem vagy bejelentkezve!' });

    const { itemIndex } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user || !user.inventory[itemIndex]) return res.status(400).json({ error: 'A tárgy nem található!' });

    const itemToSell = user.inventory[itemIndex];
    user.balance += itemToSell.price;
    user.inventory.splice(itemIndex, 1);

    await user.save();
    res.json({ success: true, newBalance: user.balance, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN API ---

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await User.find({}, '-password').sort({ createdAt: -1 });
  res.json(users);
});

app.post('/api/admin/update-balance', requireAdmin, async (req, res) => {
  const { userId, newBalance } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'Felhasználó nem található!' });

  user.balance = parseFloat(newBalance);
  await user.save();
  res.json({ success: true });
});

app.post('/api/admin/save-case', requireAdmin, async (req, res) => {
  try {
    const { caseId, name, price, items } = req.body;

    let targetCase = await Case.findOne({ caseId });
    if (targetCase) {
      targetCase.name = name;
      targetCase.price = parseFloat(price);
      targetCase.items = items;
      await targetCase.save();
    } else {
      await Case.create({ caseId, name, price: parseFloat(price), items });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FRONTEND (HTML + NEW DESIGN CSS + CLIENT JS) ---
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TerBDrop - Premium Case Opening</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; }
    body { background: #08090d; color: #f3f4f6; min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
    
    /* FEJLÉC */
    header { background: rgba(15, 17, 26, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #1f2430; padding: 18px 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: 2px; background: linear-gradient(135deg, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(168, 85, 247, 0.4); }
    .user-info { display: flex; align-items: center; gap: 15px; }
    .balance-badge { background: #131722; padding: 8px 18px; border-radius: 30px; border: 1px solid #a855f7; font-weight: 700; color: #22c55e; box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
    
    /* GOMBOK */
    button { cursor: pointer; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 700; transition: all 0.25s ease; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6); }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-admin { background: #3b82f6; color: #fff; }
    .btn-case { background: #131722; color: #9ca3af; border: 1px solid #1f2430; margin: 0 5px; }
    .btn-case:hover, .btn-case.active { background: rgba(168, 85, 247, 0.15); color: #a855f7; border-color: #a855f7; }
    
    /* INPUTOK */
    input, select { background: #131722; border: 1px solid #1f2430; padding: 12px; color: #fff; border-radius: 8px; margin-bottom: 12px; width: 100%; transition: 0.2s; }
    input:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }

    /* LAYOUT */
    main { flex: 1; padding: 40px; max-width: 1250px; margin: 0 auto; width: 100%; }
    .auth-container { max-width: 420px; margin: 60px auto; background: #0f111a; padding: 40px; border-radius: 16px; border: 1px solid #1f2430; text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6); }
    
    /* LÁDANYITÓ SPINNER */
    .case-wrapper { position: relative; width: 100%; height: 200px; background: #0f111a; border-radius: 16px; overflow: hidden; border: 1px solid #1f2430; margin: 30px 0; box-shadow: inset 0 0 30px rgba(0,0,0,0.8); }
    .pointer { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: #22c55e; z-index: 10; transform: translateX(-50%); box-shadow: 0 0 15px #22c55e, 0 0 30px #22c55e; }
    .spinner-track { display: flex; position: absolute; left: 0; top: 20px; height: 160px; transition: transform 5s cubic-bezier(0.1, 1, 0.1, 1); }
    
    /* KÁRTYÁK */
    .item-card { min-width: 150px; height: 160px; background: #131722; margin: 0 6px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 4px solid #a855f7; padding: 12px; text-align: center; font-size: 13px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 20px; margin-top: 25px; }
    .inv-item { background: #0f111a; border-radius: 12px; padding: 18px; text-align: center; border: 1px solid #1f2430; border-bottom: 4px solid #a855f7; transition: transform 0.2s; }
    .inv-item:hover { transform: translateY(-3px); }
    
    /* ADMIN PANEL */
    .admin-panel { background: #0f111a; border: 1px solid #1f2430; padding: 30px; border-radius: 16px; margin-top: 20px; }
    .admin-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .admin-table th, .admin-table td { border: 1px solid #1f2430; padding: 12px; text-align: left; }
    .admin-table th { background: #131722; color: #a855f7; }

    .hidden { display: none !important; }
    .nav-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid #1f2430; padding-bottom: 12px; }
  </style>
</head>
<body>

  <header>
    <div class="logo">TerBDrop</div>
    <div id="user-nav" class="user-info hidden">
      <span>Üdv, <b id="display-username" style="color: #a855f7;"></b>!</span>
      <div class="balance-badge"><span id="display-balance">0.00</span> $</div>
      <button id="admin-tab-btn" onclick="toggleAdminPanel()" class="btn-admin hidden">Admin Panel</button>
      <button onclick="logout()" class="btn-danger">Kijelentkezés</button>
    </div>
  </header>

  <main>
    <!-- BEJELENTKEZÉS / REGISZTRÁCIÓ -->
    <div id="auth-box" class="auth-container">
      <h2 id="auth-title" style="margin-bottom: 25px; font-weight: 800; font-size: 28px;">Bejelentkezés</h2>
      <input type="text" id="auth-username" placeholder="Felhasználónév">
      <input type="password" id="auth-password" placeholder="Jelszó">
      <button id="auth-btn" onclick="submitAuth()" class="btn-primary" style="width: 100%; margin-top: 15px; padding: 14px;">Bejelentkezés</button>
      <p style="margin-top: 25px; font-size: 14px; color: #6b7280;">
        <span id="auth-toggle-text">Nincs még fiókod?</span> 
        <a href="javascript:void(0)" onclick="toggleAuthMode()" style="color: #a855f7; font-weight: bold; text-decoration: none;">Váltás regisztrációra</a>
      </p>
    </div>

    <!-- JÁTÉK FELÜLET -->
    <div id="game-box" class="hidden">
      <div id="case-selector" style="display: flex; justify-content: center; gap: 12px; margin-bottom: 35px;"></div>

      <div style="text-align: center;">
        <h2 id="case-title" style="font-size: 32px; font-weight: 800;">-</h2>
        <p style="color: #6b7280; font-size: 16px; margin-top: 5px;">Nyitási ár: <b id="case-price" style="color: #22c55e;">0.00 $</b></p>
      </div>

      <div class="case-wrapper">
        <div class="pointer"></div>
        <div class="spinner-track" id="spinner-track"></div>
      </div>

      <div style="text-align: center;">
        <button id="open-btn" onclick="openCase()" class="btn-primary" style="font-size: 18px; padding: 16px 50px; border-radius: 30px;">LÁDA NYITÁSA</button>
      </div>

      <h3 style="margin-top: 60px; border-bottom: 1px solid #1f2430; padding-bottom: 12px; font-size: 22px;">Saját Raktár (Inventory)</h3>
      <div class="inventory-grid" id="inventory-grid"></div>
    </div>

    <!-- ADMIN PANEL FELÜLET -->
    <div id="admin-box" class="admin-panel hidden">
      <h2 style="margin-bottom: 20px;">TerBDrop Adminisztráció</h2>
      
      <div class="nav-tabs">
        <button class="btn-case active" onclick="showAdminSection('users')">Felhasználók</button>
        <button class="btn-case" onclick="showAdminSection('cases')">Ládák Kezelése</button>
      </div>

      <div id="admin-users-section">
        <h3>Felhasználók egyenlegének módosítása</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Felhasználónév</th>
              <th>Jelenlegi Egyenleg</th>
              <th>Admin?</th>
              <th>Új Egyenleg ($)</th>
              <th>Művelet</th>
            </tr>
          </thead>
          <tbody id="admin-users-list"></tbody>
        </table>
      </div>

      <div id="admin-cases-section" class="hidden">
        <h3>Láda Hozzáadása / Szerkesztése</h3>
        <div style="max-width: 500px; margin-top: 20px;">
          <input type="text" id="admin-case-id" placeholder="Láda azonosító (pl: budget_v2)">
          <input type="text" id="admin-case-name" placeholder="Láda megjelenő neve (pl: Budget Case)">
          <input type="number" id="admin-case-price" placeholder="Ár ($)">
          <button onclick="saveCase()" class="btn-primary" style="width: 100%; margin-top: 10px;">Láda Mentése</button>
        </div>
      </div>
    </div>
  </main>

  <script>
    let isRegisterMode = false;
    let selectedCaseKey = '';
    let allCases = {};
    let currentUser = null;

    window.onload = function() {
      checkSession();
    };

    function toggleAuthMode() {
      isRegisterMode = !isRegisterMode;
      document.getElementById('auth-title').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
      document.getElementById('auth-btn').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
      document.getElementById('auth-toggle-text').innerText = isRegisterMode ? 'Már van fiókod?' : 'Nincs még fiókod?';
    }

    async function submitAuth() {
      const username = document.getElementById('auth-username').value;
      const password = document.getElementById('auth-password').value;
      const endpoint = isRegisterMode ? '/api/register' : '/api/login';

      if (!username || !password) {
        alert("Kérjük, töltsd ki a felhasználónevet és a jelszót!");
        return;
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.error) {
          alert(data.error);
        } else {
          currentUser = data;
          await fetchCases();
          updateUI(data);
        }
      } catch(err) {
        alert("Hálózati hiba a csatlakozás során!");
      }
    }

    async function checkSession() {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.loggedIn) {
          currentUser = data;
          await fetchCases();
          updateUI(data);
        }
      } catch(e) {
        console.error("Session hiba", e);
      }
    }

    async function fetchCases() {
      try {
        const res = await fetch('/api/cases');
        allCases = await res.json();
        
        const keys = Object.keys(allCases);
        if (keys.length > 0 && !selectedCaseKey) {
          selectedCaseKey = keys[0];
        }

        renderCaseButtons();
        if (selectedCaseKey && allCases[selectedCaseKey]) {
          selectCase(selectedCaseKey);
        }
      } catch(e) {
        console.error("Láda betöltési hiba", e);
      }
    }

    function renderCaseButtons() {
      const container = document.getElementById('case-selector');
      container.innerHTML = '';
      
      Object.keys(allCases).forEach(key => {
        const c = allCases[key];
        const btn = document.createElement('button');
        btn.className = \`btn-case \${key === selectedCaseKey ? 'active' : ''}\`;
        btn.innerText = \`\${c.name} (\${c.price}$)\`;
        btn.onclick = () => selectCase(key);
        container.appendChild(btn);
      });
    }

    function selectCase(key) {
      selectedCaseKey = key;
      renderCaseButtons();
      
      const c = allCases[key];
      if (c) {
        document.getElementById('case-title').innerText = c.name;
        document.getElementById('case-price').innerText = \`\${c.price.toFixed(2)} $\`;
        generateTrackItems();
      }
    }

    function updateUI(userData) {
      document.getElementById('auth-box').classList.add('hidden');
      document.getElementById('game-box').classList.remove('hidden');
      document.getElementById('user-nav').classList.remove('hidden');

      document.getElementById('display-username').innerText = userData.username;
      document.getElementById('display-balance').innerText = userData.balance.toFixed(2);

      if (userData.isAdmin) {
        document.getElementById('admin-tab-btn').classList.remove('hidden');
      }

      renderInventory(userData.inventory);
    }

    async function logout() {
      await fetch('/api/logout', { method: 'POST' });
      window.location.reload();
    }

    function generateTrackItems() {
      const track = document.getElementById('spinner-track');
      track.innerHTML = '';
      const currentCase = allCases[selectedCaseKey];
      if(!currentCase || !currentCase.items || currentCase.items.length === 0) return;

      for (let i = 0; i < 60; i++) {
        const randItem = currentCase.items[Math.floor(Math.random() * currentCase.items.length)];
        const el = document.createElement('div');
        el.className = 'item-card';
        el.style.borderBottomColor = randItem.color || '#a855f7';
        el.innerHTML = \`<div><b>\${randItem.name}</b><br><span style="color:#22c55e; margin-top:5px; display:inline-block;">\${randItem.price}$</span></div>\`;
        track.appendChild(el);
      }
    }

    async function openCase() {
      const btn = document.getElementById('open-btn');
      btn.disabled = true;

      try {
        const res = await fetch('/api/open-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: selectedCaseKey })
        });
        const data = await res.json();

        if (data.error) {
          alert(data.error);
          btn.disabled = false;
          return;
        }

        const track = document.getElementById('spinner-track');
        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';
        
        generateTrackItems();
        const cards = track.children;
        
        cards[45].style.borderBottomColor = data.item.color;
        cards[45].innerHTML = \`<div><b>\${data.item.name}</b><br><span style="color:#22c55e; margin-top:5px; display:inline-block;">\${data.item.price}$</span></div>\`;

        setTimeout(() => {
          track.style.transition = 'transform 5s cubic-bezier(0.1, 1, 0.1, 1)';
          const cardWidth = 162;
          const targetOffset = -(45 * cardWidth - (document.querySelector('.case-wrapper').clientWidth / 2) + 81);
          track.style.transform = \`translateX(\${targetOffset}px)\`;
        }, 50);

        setTimeout(() => {
          alert(\`Nyeremény: \${data.item.name} (\${data.item.price} $)\`);
          document.getElementById('display-balance').innerText = data.newBalance.toFixed(2);
          renderInventory(data.inventory);
          btn.disabled = false;
        }, 5200);

      } catch (err) {
        alert('Hiba történt!');
        btn.disabled = false;
      }
    }

    function renderInventory(inventory) {
      const grid = document.getElementById('inventory-grid');
      grid.innerHTML = '';

      if (!inventory || inventory.length === 0) {
        grid.innerHTML = '<p style="color:#6b7280;">A raktárad még üres.</p>';
        return;
      }

      inventory.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.style.borderBottomColor = item.color || '#a855f7';
        el.innerHTML = \`
          <div style="font-size:13px; font-weight:bold;">\${item.name}</div>
          <div style="color:#22c55e; font-size:14px; font-weight:bold; margin: 12px 0;">\${item.price.toFixed(2)} $</div>
          <button onclick="sellItem(\${index})" class="btn-danger" style="font-size: 11px; padding: 8px; width: 100%;">ELADÁS (\${item.price.toFixed(2)}$)</button>
        \`;
        grid.appendChild(el);
      });
    }

    async function sellItem(index) {
      try {
        const res = await fetch('/api/sell-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIndex: index })
        });
        const data = await res.json();

        if (data.error) {
          alert(data.error);
          return;
        }

        document.getElementById('display-balance').innerText = data.newBalance.toFixed(2);
        renderInventory(data.inventory);
      } catch (err) {
        alert('Hiba a tárgy eladásakor!');
      }
    }

    function toggleAdminPanel() {
      const gameBox = document.getElementById('game-box');
      const adminBox = document.getElementById('admin-box');

      if (adminBox.classList.contains('hidden')) {
        adminBox.classList.remove('hidden');
        gameBox.classList.add('hidden');
        loadAdminUsers();
      } else {
        adminBox.classList.add('hidden');
        gameBox.classList.remove('hidden');
      }
    }

    function showAdminSection(section) {
      document.getElementById('admin-users-section').classList.toggle('hidden', section !== 'users');
      document.getElementById('admin-cases-section').classList.toggle('hidden', section !== 'cases');
    }

    async function loadAdminUsers() {
      const res = await fetch('/api/admin/users');
      const users = await res.json();
      
      const tbody = document.getElementById('admin-users-list');
      tbody.innerHTML = '';

      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${u.username}</td>
          <td style="color:#22c55e; font-weight:bold;">\${u.balance.toFixed(2)} $</td>
          <td>\${u.isAdmin ? 'Igen' : 'Nem'}</td>
          <td><input type="number" id="bal-\${u._id}" value="\${u.balance}" style="width: 100px; margin:0;"></td>
          <td><button onclick="updateUserBalance('\${u._id}')" class="btn-primary" style="padding: 6px 12px; font-size:12px;">Mentés</button></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function updateUserBalance(userId) {
      const val = document.getElementById(\`bal-\${userId}\`).value;
      const res = await fetch('/api/admin/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newBalance: val })
      });
      const data = await res.json();
      if (data.success) {
        alert('Egyenleg frissítve!');
        loadAdminUsers();
      } else {
        alert(data.error);
      }
    }

    async function saveCase() {
      const caseId = document.getElementById('admin-case-id').value;
      const name = document.getElementById('admin-case-name').value;
      const price = document.getElementById('admin-case-price').value;

      if(!caseId || !name || !price) {
        alert('Kérjük töltsd ki az összes mezőt!');
        return;
      }

      const defaultItems = [
        { id: \`\${caseId}_1\`, name: 'Ritka Skin', price: 100.00, color: '#ffd700', chance: 10.0, img: '' },
        { id: \`\${caseId}_2\`, name: 'Közepes Skin', price: 20.00, color: '#d32ce6', chance: 30.0, img: '' },
        { id: \`\${caseId}_3\`, name: 'Gyakori Skin', price: 2.00, color: '#3b82f6', chance: 60.0, img: '' }
      ];

      const res = await fetch('/api/admin/save-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, name, price, items: defaultItems })
      });
      const data = await res.json();
      if (data.success) {
        alert('Láda sikeresen elmentve!');
        await fetchCases();
      } else {
        alert(data.error);
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> TerBDrop Szerver elindult a ${PORT} porton! <<<`);
});
