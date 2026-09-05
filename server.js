const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statikus fájlok kiszolgálása a "public" mappából (ha külön HTML/CSS/JS fájlokat használsz)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// --- MONGOOSE ADATBÁZIS KAPCSOLÓDÁS ---
let dbStatus = "Csatlakozás folyamatban...";
let dbErrorDetails = "";

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      dbStatus = "SIKERES_CSATLAKOZÁS";
      console.log('>>> Sikeres MongoDB csatlakozás! <<<');
    })
    .catch(err => {
      dbStatus = "CSATLAKOZÁSI_HIBA";
      dbErrorDetails = err.message;
      console.error('MongoDB csatlakozási hiba:', err);
    });
} else {
  dbStatus = "HIÁNYZÓ_MONGO_URI";
  console.error("KRITIKUS: A MONGO_URI környezeti változó hiányzik!");
}

// --- ADATBÁZIS SCHEMÁK ÉS MODELL-EK ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 500.00 },
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

const User = mongoose.model('User', userSchema);

// --- SESSION MUNKAMENET BEÁLLÍTÁSAI ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'titkos_packdrop_mindenkinek_123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 hét
  }
}));

// --- LÁDÁK ÉS TÁRGYAK DEFINIÁLÁSA (VALÓDI STEAM CS2 KÉPEKKEL) ---
const CASES = {
  budget: {
    id: 'budget',
    name: 'Budget Case',
    price: 15.00,
    items: [
      { id: 'b_1', name: 'AK-47 | Slate', price: 45.00, color: '#d32ce6', chance: 5.0, img: 'https://community.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V7JkMPWBMWuZxuZi_rZsS3zgzU8isW3dnIr6eHKfPVAhDpojEe9YsUW4xta1Nuzm5FDci4NbjXKpmWVQppo' },
      { id: 'b_2', name: 'AWP | Atheris', price: 18.00, color: '#8847ff', chance: 15.0, img: 'https://community.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V6V-Kf2cGFidxOp_pewnF3nhxEt0sGnSzN76dH3GOg9xC8FyEORftRe-x9PuYurq71bW3d8UnjK-0H0YSTpMGQ' },
      { id: 'b_3', name: 'M4A1-S | Briefing', price: 8.50, color: '#4b69ff', chance: 30.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzllEwMb3mYjhncAOTUfAOD6Br912yWyRt4sI2A4Tk8e1Sfwzs4YrDO7B9Z9A3S8aB1I9_S3O' },
      { id: 'b_4', name: 'USP-S | Flashback', price: 3.20, color: '#4b69ff', chance: 25.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzllB4NrrpZmOaAwtUDvAOD_s13yW-VyI1xS5jM4Tk8-0Sfwzu4YrDO7B9P4d_Z86P' },
      { id: 'b_5', name: 'P250 | Sand Dune', price: 0.50, color: '#b0c3d9', chance: 25.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJznwUpNrr2aGM13sTUTq-G4A' }
    ]
  },
  weapon: {
    id: 'weapon',
    name: 'Weapon Case v1',
    price: 50.00,
    items: [
      { id: 'w_1', name: 'Karambit | Fade', price: 1200.00, color: '#ffd700', chance: 0.5, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzklA1Mb32aGM20v3UTqS9Y13v81u7WyRmXfM1AY1S45G4UOn2Iu34E' },
      { id: 'w_2', name: 'M4A4 | Howl', price: 850.00, color: '#eb4b4b', chance: 1.5, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzlkQ2Mr2wYjhS0ubm_q54XqfU13v81u7WyRmXfM1AY1S45G4UOn2Iu34E' },
      { id: 'w_3', name: 'AK-47 | Fire Serpent', price: 400.00, color: '#eb4b4b', chance: 3.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzllo3MbK-YjhncATpUaEODaRk13v81u7WyRmXfM1AY1S45G4UOn2Iu34E' },
      { id: 'w_4', name: 'AWP | Asiimov', price: 120.00, color: '#d32ce6', chance: 10.0, img: 'https://community.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf_jdk7uW-V6V-Kf2cGFidxOp_pewnF3nhxEt0sGnSzN76dH3GOg9xC8FyEORftRe-x9PuYurq71bW3d8UnjK-0H0YSTpMGQ' },
      { id: 'w_5', name: 'USP-S | Kill Confirmed', price: 65.00, color: '#8847ff', chance: 20.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJznlo3MryjZzNy2sOBU6E' },
      { id: 'w_6', name: 'Glock-18 | Water Elemental', price: 15.00, color: '#4b69ff', chance: 30.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzklEwMr-cZzJm5v54I3sO' },
      { id: 'w_7', name: 'P250 | Sand Dune', price: 1.50, color: '#b0c3d9', chance: 35.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJznwUpNrr2aGM13sTUTq-G4A' }
    ]
  },
  knife: {
    id: 'knife',
    name: 'Knife & Glove Case',
    price: 150.00,
    items: [
      { id: 'k_1', name: 'Butterfly Knife | Doppler', price: 2100.00, color: '#ffd700', chance: 1.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJz3xN1Nrr-aGM11vOTUqC32a2f81u7WyRmXfM1AY1S45G4UOn2Iu34E' },
      { id: 'k_2', name: 'Karambit | Marble Fade', price: 1600.00, color: '#ffd700', chance: 2.5, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzklA1Mb32aGM20v3UTqS9Y13v81u7WyRmXfM1AY1S45G4UOn2Iu34E' },
      { id: 'k_3', name: 'M9 Bayonet | Tiger Tooth', price: 950.00, color: '#eb4b4b', chance: 6.5, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzkl1sMb31aGM41_S_X6_vD_R2R12A2J-yS5S8' },
      { id: 'k_4', name: 'Sport Gloves | Vice', price: 1400.00, color: '#eb4b4b', chance: 4.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJ31v3-Nj75Yzh546OBCf_D_A12-vD219_mG-5U' },
      { id: 'k_5', name: 'Gut Knife | Doppler', price: 180.00, color: '#d32ce6', chance: 36.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzklN3NaL2Yjh2_KOBCOTeSFA8vD9u001c2-J0A' },
      { id: 'k_6', name: 'Navaja Knife | Safari Mesh', price: 80.00, color: '#8847ff', chance: 50.0, img: 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu55o2gvh82834uhggM4hdx4hLHjhX28Xdq9mnd1hA2sXf1Bwst31m83fC_SGC-30x84f4p5f3mJzl150N3z-aGMx2-f94F1-vR18uQy09c0O' }
    ]
  }
};

// --- SEGÉDFÜGGVÉNY A SORSOLÁSHOZ ---
function getRandomItemFromCase(caseKey) {
  const selectedCase = CASES[caseKey];
  if (!selectedCase) return null;

  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const item of selectedCase.items) {
    cumulative += item.chance;
    if (rand <= cumulative) {
      return item;
    }
  }
  return selectedCase.items[selectedCase.items.length - 1];
}

// --- API VÉGPONTOK (BACKEND) ---

app.get('/api/status', (req, res) => {
  res.json({ dbStatus, dbErrorDetails, readyState: mongoose.connection.readyState });
});

// Ládák adatainak lekérése
app.get('/api/cases', (req, res) => {
  res.json(CASES);
});

// Regisztráció
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: `Adatbázis csatlakozási hiba [${dbStatus}]` });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) return res.status(400).json({ error: 'Min. 3 karakteres név kell!' });

    const existingUser = await User.findOne({ username: new RegExp(`^${cleanUsername}$`, 'i') });
    if (existingUser) return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: cleanUsername, password: hashedPassword, balance: 500.00, inventory: [] });

    await newUser.save();
    req.session.userId = newUser._id;

    res.json({ success: true, username: newUser.username, balance: newUser.balance, inventory: newUser.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Szerveroldali hiba: ' + err.message });
  }
});

// Bejelentkezés
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Adja meg a felhasználónevet és a jelszót!' });

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    req.session.userId = user._id;
    res.json({ success: true, username: user.username, balance: user.balance, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba: ' + err.message });
  }
});

// Kijelentkezés
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Saját adatok lekérése
app.get('/api/me', async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username, balance: user.balance, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kiválasztott láda nyitása
app.post('/api/open-case', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Kérjük, jelentkezzen be!' });

    const { caseId } = req.body;
    const targetCase = CASES[caseId || 'weapon'];

    if (!targetCase) return res.status(400).json({ error: 'Érvénytelen láda kategória!' });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Felhasználó nem található!' });

    if (user.balance < targetCase.price) {
      return res.status(400).json({ error: `Nincs elegendő egyenlege! (Közösségi ár: ${targetCase.price} $)` });
    }

    user.balance -= targetCase.price;
    const wonItem = getRandomItemFromCase(targetCase.id);

    user.inventory.push({
      itemId: wonItem.id,
      name: wonItem.name,
      price: wonItem.price,
      color: wonItem.color,
      img: wonItem.img
    });

    await user.save();

    res.json({
      success: true,
      item: wonItem,
      newBalance: user.balance,
      inventory: user.inventory
    });
  } catch (err) {
    res.status(500).json({ error: 'Hiba a láda nyitása közben: ' + err.message });
  }
});

// Tárgy eladása
app.post('/api/sell-item', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Nem vagy bejelentkezve!' });

    const { itemIndex } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user || !user.inventory[itemIndex]) {
      return res.status(400).json({ error: 'A tárgy nem található a raktárban!' });
    }

    const itemToSell = user.inventory[itemIndex];
    user.balance += itemToSell.price;
    user.inventory.splice(itemIndex, 1);

    await user.save();

    res.json({ success: true, newBalance: user.balance, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Eladási hiba: ' + err.message });
  }
});

// Teszt pénz hozzáadása
app.post('/api/add-funds', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Nincs munkamenet.' });
    const user = await User.findById(req.session.userId);
    user.balance += 250.00;
    await user.save();
    res.json({ success: true, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FRONTEND ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PACKDROP - Multi Case Platform</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #0b0e14; color: #ffffff; min-height: 100vh; display: flex; flex-direction: column; }
        header { background: #151a23; border-bottom: 2px solid #222938; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffb400; letter-spacing: 2px; }
        .user-info { display: flex; align-items: center; gap: 20px; }
        .balance-badge { background: #1c2331; padding: 8px 16px; border-radius: 20px; border: 1px solid #ffb400; font-weight: bold; color: #ffb400; }
        
        button { cursor: pointer; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; transition: 0.2s; }
        .btn-primary { background: #ffb400; color: #000; }
        .btn-primary:hover { background: #e09e00; }
        .btn-danger { background: #eb4b4b; color: #fff; }
        .btn-success { background: #2ecc71; color: #fff; }
        .btn-case { background: #1c2331; color: #fff; border: 1px solid #2a354b; margin: 0 5px; }
        .btn-case.active { background: #ffb400; color: #000; border-color: #ffb400; }
        
        input { background: #1c2331; border: 1px solid #2a354b; padding: 10px; color: #fff; border-radius: 6px; margin-bottom: 10px; width: 100%; }
        main { flex: 1; padding: 40px; max-width: 1200px; margin: 0 auto; width: 100%; }
        .auth-container { max-width: 400px; margin: 50px auto; background: #151a23; padding: 30px; border-radius: 12px; border: 1px solid #222938; text-align: center; }
        
        .case-wrapper { position: relative; width: 100%; height: 200px; background: #151a23; border-radius: 12px; overflow: hidden; border: 2px solid #222938; margin: 20px 0; }
        .pointer { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: #ffb400; z-index: 10; transform: translateX(-50%); box-shadow: 0 0 10px #ffb400; }
        .spinner-track { display: flex; position: absolute; left: 0; top: 20px; height: 160px; transition: transform 5s cubic-bezier(0.1, 1, 0.1, 1); }
        
        .item-card { min-width: 140px; height: 160px; background: #1c2331; margin: 0 5px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 4px solid #fff; padding: 10px; text-align: center; font-size: 12px; }
        .item-card img { width: 100px; height: 80px; object-fit: contain; margin-bottom: 10px; }
        
        .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; margin-top: 20px; }
        .inv-item { background: #151a23; border-radius: 8px; padding: 15px; text-align: center; position: relative; border-bottom: 4px solid #555; }
        .inv-item img { width: 110px; height: 80px; object-fit: contain; }
        .inv-item .sell-btn { margin-top: 10px; font-size: 11px; padding: 6px 10px; width: 100%; }

        .hidden { display: none !important; }
        .case-selector { display: flex; justify-content: center; gap: 10px; margin-bottom: 30px; }
      </style>
    </head>
    <body>

      <header>
        <div class="logo">PACKDROP</div>
        <div id="user-nav" class="user-info hidden">
          <span>Üdv, <b id="display-username"></b>!</span>
          <div class="balance-badge"><span id="display-balance">0.00</span> $</div>
          <button onclick="addFunds()" class="btn-success" style="font-size: 11px; padding: 6px 10px;">+250$ Teszt</button>
          <button onclick="logout()" class="btn-danger">Kijelentkezés</button>
        </div>
      </header>

      <main>
        <div id="auth-box" class="auth-container">
          <h2 id="auth-title" style="margin-bottom: 20px;">Bejelentkezés</h2>
          <input type="text" id="auth-username" placeholder="Felhasználónév">
          <input type="password" id="auth-password" placeholder="Jelszó">
          <button id="auth-btn" onclick="submitAuth()" class="btn-primary" style="width: 100%; margin-top: 10px;">Bejelentkezés</button>
          <p style="margin-top: 20px; font-size: 13px; color: #888;">
            <span id="auth-toggle-text">Nincs még fiókod?</span> 
            <a href="#" onclick="toggleAuthMode()" style="color: #ffb400;">Váltás regisztrációra</a>
          </p>
        </div>

        <div id="game-box" class="hidden">
          
          <div class="case-selector">
            <button class="btn-case" id="btn-budget" onclick="selectCase('budget')">Budget Case (15$)</button>
            <button class="btn-case active" id="btn-weapon" onclick="selectCase('weapon')">Weapon Case (50$)</button>
            <button class="btn-case" id="btn-knife" onclick="selectCase('knife')">Knife & Glove (150$)</button>
          </div>

          <div style="text-align: center;">
            <h2 id="case-title">Weapon Case v1</h2>
            <p style="color: #888;">Nyitási ár: <b id="case-price">50.00 $</b></p>
          </div>

          <div class="case-wrapper">
            <div class="pointer"></div>
            <div class="spinner-track" id="spinner-track"></div>
          </div>

          <div style="text-align: center;">
            <button id="open-btn" onclick="openCase()" class="btn-primary" style="font-size: 18px; padding: 15px 40px;">LÁDA NYITÁSA</button>
          </div>

          <h3 style="margin-top: 50px; border-bottom: 1px solid #222938; padding-bottom: 10px;">Saját Raktár (Inventory)</h3>
          <div class="inventory-grid" id="inventory-grid"></div>

        </div>
      </main>

      <script>
        let isRegisterMode = false;
        let selectedCaseKey = 'weapon';
        let allCases = {};

        window.onload = async () => {
          await fetchCases();
          checkSession();
        };

        async function fetchCases() {
          const res = await fetch('/api/cases');
          allCases = await res.json();
          generateTrackItems();
        }

        function selectCase(key) {
          selectedCaseKey = key;
          document.querySelectorAll('.btn-case').forEach(b => b.classList.remove('active'));
          document.getElementById('btn-' + key).classList.add('active');
          
          const c = allCases[key];
          document.getElementById('case-title').innerText = c.name;
          document.getElementById('case-price').innerText = c.price.toFixed(2) + ' $';
          generateTrackItems();
        }

        function toggleAuthMode() {
          isRegisterMode = !isRegisterMode;
          document.getElementById('auth-title').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
          document.getElementById('auth-btn').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
          document.getElementById('auth-toggle-text').innerText = isRegisterMode ? 'Már van fiókod?' : 'Nincs még fiókod?';
        }

        async function checkSession() {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data.loggedIn) updateUI(data);
        }

        async function submitAuth() {
          const username = document.getElementById('auth-username').value;
          const password = document.getElementById('auth-password').value;
          const endpoint = isRegisterMode ? '/api/register' : '/api/login';

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
              updateUI({ loggedIn: true, username: data.username, balance: data.balance, inventory: data.inventory });
            }
          } catch(err) {
            alert("Hálózati hiba történt!");
          }
        }

        function updateUI(userData) {
          document.getElementById('auth-box').classList.add('hidden');
          document.getElementById('game-box').classList.remove('hidden');
          document.getElementById('user-nav').classList.remove('hidden');

          document.getElementById('display-username').innerText = userData.username;
          document.getElementById('display-balance').innerText = userData.balance.toFixed(2);

          renderInventory(userData.inventory);
        }

        async function logout() {
          await fetch('/api/logout', { method: 'POST' });
          window.location.reload();
        }

        function generateTrackItems() {
          const track = document.getElementById('spinner-track');
          track.innerHTML = '';
          const currentCase = allCases[selectedCaseKey] || allCases['weapon'];
          if(!currentCase) return;

          for (let i = 0; i < 60; i++) {
            const randItem = currentCase.items[Math.floor(Math.random() * currentCase.items.length)];
            const el = document.createElement('div');
            el.className = 'item-card';
            el.style.borderBottomColor = randItem.color;
            el.innerHTML = \`<img src="\${randItem.img}"><div><b>\${randItem.name}</b><br>\${randItem.price}$</div>\`;
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
            cards[45].innerHTML = \`<img src="\${data.item.img}"><div><b>\${data.item.name}</b><br>\${data.item.price}$</div>\`;

            setTimeout(() => {
              track.style.transition = 'transform 5s cubic-bezier(0.1, 1, 0.1, 1)';
              const cardWidth = 150;
              const targetOffset = -(45 * cardWidth - (document.querySelector('.case-wrapper').clientWidth / 2) + 75);
              track.style.transform = \`translateX(\${targetOffset}px)\`;
            }, 50);

            setTimeout(() => {
              alert(\`Gratulálunk! Megnyerted: \${data.item.name} (\${data.item.price} $)\`);
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
            grid.innerHTML = '<p style="color:#666;">A raktárad még üres.</p>';
            return;
          }

          inventory.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'inv-item';
            el.style.borderBottomColor = item.color || '#fff';
            el.innerHTML = \`
              <img src="\${item.img}">
              <div style="font-size:12px; font-weight:bold; margin-top:5px;">\${item.name}</div>
              <div style="color:#ffb400; font-size:12px;">\${item.price.toFixed(2)} $</div>
              <button onclick="sellItem(\${index})" class="btn-danger sell-btn">ELADÁS (\${item.price.toFixed(2)}$)</button>
            \`;
            grid.appendChild(el);
          });
        }

        async function sellItem(index) {
          const res = await fetch('/api/sell-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemIndex: index })
          });
          const data = await res.json();
          if (data.success) {
            document.getElementById('display-balance').innerText = data.newBalance.toFixed(2);
            renderInventory(data.inventory);
          } else {
            alert(data.error);
          }
        }

        async function addFunds() {
          const res = await fetch('/api/add-funds', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            document.getElementById('display-balance').innerText = data.newBalance.toFixed(2);
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> Szerver elindult a ${PORT} porton! <<<`);
});
});
