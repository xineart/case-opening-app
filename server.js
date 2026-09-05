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
  category: { type: String, default: 'budget' }, // budget, premium, knife
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
    // Alapértelmezett ládák frissítése/létrehozása képekkel és kategóriákkal
    const defaultCases = [
      {
        caseId: 'budget_v1',
        name: 'Kezdő Budget Láda',
        price: 15.00,
        category: 'budget',
        items: [
          { id: 'b_1', name: 'AK-47 | Redline', price: 25.00, color: '#eb4b4b', chance: 5.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEp072T892m21a380A5ZW3zLYCQJwBvM1DVq1a_w-q915-1vM6ay3Vq7yR0s3_UygXbg04X_L8' },
          { id: 'b_2', name: 'M4A4 | Evil Daimyo', price: 8.00, color: '#d32ce6', chance: 15.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITfn2xZ_811eunH-4P33gzkrERpMG-mcdDHJwRrZV3Xq1jrl-e81JC5vZ2fySRnsic8pL_D20A1aU8' },
          { id: 'b_3', name: 'USP-S | Cyrex', price: 5.00, color: '#8847ff', chance: 30.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposwlur8111Ob3fj5R09S_m4y0m_7zO6-fzj9V7cd33OrApY2si1C1-xU-Nzz7d9fHdlU5Y1nX_Va_l-u7jcfvtMufyCQw7yQgs3jUnA' },
          { id: 'b_4', name: 'P250 | Sand Dune', price: 0.50, color: '#b0c3d9', chance: 50.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopujwezhjxszYI18du9hiRkS0m_7zO6-fxWpTupwjjL2Uptv30A3i_BNtY231ctPHcFA3NF_R-VK_yee7g5W97Z3PznJmsyFwtn3C00A2O1I' }
        ]
      },
      {
        caseId: 'premium_v1',
        name: 'TerBDrop Elite Premium',
        price: 75.00,
        category: 'premium',
        items: [
          { id: 'p_1', name: 'AWP | Asiimov', price: 130.00, color: '#eb4b4b', chance: 10.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0n_L1JaKfzzoGu5Ym373ErYr03gaw8xZsM2H3dtSWJw9tNAmD-QO7wb3qgp69vcmYmyFj6yNw-z-DyP2I6_8' },
          { id: 'p_2', name: 'AK-47 | Vulcan', price: 280.00, color: '#ffd700', chance: 5.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08y5mJh54ov3N4Tdn2xZ_Isp2L3C94iijA23-sBqZGrwcNTHJFc3ZwqC81K7l-fujMK87s7Mn3Yw4yR3-z-DyI4E9mVE' },
          { id: 'p_3', name: 'M4A1-S | Player Two', price: 60.00, color: '#d32ce6', chance: 25.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITfn2xZ_811eunH-4P33gzkrERpMG-mcdDHJwRrZV3Xq1jrl-e81JC5vZ2fySRnsic8pL_D20A1aU8' },
          { id: 'p_4', name: 'Desert Eagle | Printstream', price: 90.00, color: '#eb4b4b', chance: 20.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLATLxfBN311C7d21nImFm_bLP7LWqWdY78112-vFpYmkiwC1_0c4Ym_1cI_GJg87Y1zU-AO7ku-90ZTuvpzJnHFmv2A8537bzQv330_S0S16Uw' },
          { id: 'p_5', name: 'Glock-18 | Water Elemental', price: 12.00, color: '#8847ff', chance: 40.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0v73fyhB49C_l4men_vxI4Tck29Y_cg_373D8Y323A21-xE5a2v3LdDDegc4ZQ7Z-Vntwbq6jJXtvJ_JznMy43Urtn3D30vgTTrB7g' }
        ]
      },
      {
        caseId: 'knife_v1',
        name: 'Exkluzív Kés Láda',
        price: 250.00,
        category: 'knife',
        items: [
          { id: 'k_1', name: 'Karambit | Doppler', price: 1100.00, color: '#ffd700', chance: 2.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf28_3cz18492zkL-AmuP1Ia_um25V4dB8xOiW9Nis2A3t-UNrNW2mLI-cdQA7NFrYrVPvl7vmgce_6MzKn3d9-n51_y_z_5g' },
          { id: 'k_2', name: 'Butterfly Knife | Fade', price: 1800.00, color: '#ffd700', chance: 1.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJfw-beRDhR-921q5SEhfP3O4Tdn2xZ_Isg0r-U8Y-jjA3m-xA4NTj3ItCTdQ87YljV-lO8yOq6gMS_tZvAzXpquXEl537fmgv33083x9TXXg' },
          { id: 'k_3', name: 'M9 Bayonet | Autotronic', price: 650.00, color: '#eb4b4b', chance: 7.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJfw-beRDhR-_cnJ2SZm-bhI7TFhWld68p3m9aW94qjiQXsrkA4Ymv1d9fBdgJrZQyCqVm7xezmhcC6vZ7BzHRivD5iuyitvB_E0w' },
          { id: 'k_4', name: 'Gut Knife | Safari Mesh', price: 90.00, color: '#8847ff', chance: 90.0, img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf1Or3daFC0927q4KGhfP1Ia_um25V4dB8xOiU8dyh2AG3rhI4a2qncdOXdQRsaA7XqFC5wenohce9v5ucn3Rh6CEn-z-DyI4z5j4N' }
        ]
      }
    ];

    for (const cData of defaultCases) {
      const exists = await Case.findOne({ caseId: cData.caseId });
      if (!exists) {
        await Case.create(cData);
      }
    }
    console.log('>>> Alapértelmezett kategóriájú ládák betöltve! <<<');
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
    res.status(500).json({ error: 'Szerveroldali hiba.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Felhasználónév és jelszó kötelező!' });

    const cleanUsername = username.trim();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    req.session.userId = user._id;
    res.json({ success: true, username: user.username, balance: user.balance, isAdmin: user.isAdmin, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Szerveroldali hiba.' });
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
    res.json(cases);
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

// --- FRONTEND ---
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
    header { background: rgba(15, 17, 26, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #1f2430; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: 2px; background: linear-gradient(135deg, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(168, 85, 247, 0.4); cursor: pointer; }
    .user-info { display: flex; align-items: center; gap: 15px; position: relative; }
    .balance-badge { background: #131722; padding: 8px 18px; border-radius: 30px; border: 1px solid #a855f7; font-weight: 700; color: #22c55e; box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
    
    /* GOMBOK */
    button { cursor: pointer; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; transition: all 0.25s ease; font-size: 14px; text-transform: uppercase; }
    .btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6); }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-inventory { background: #1f2430; color: #a855f7; border: 1px solid #a855f7; }
    .btn-inventory:hover { background: rgba(168, 85, 247, 0.2); }

    /* KATEGÓRIÁK FÜL */
    .category-tabs { display: flex; justify-content: center; gap: 15px; margin-bottom: 25px; }
    .cat-tab { background: #0f111a; border: 1px solid #1f2430; padding: 12px 24px; border-radius: 10px; color: #9ca3af; cursor: pointer; font-weight: 700; transition: 0.2s; }
    .cat-tab.active, .cat-tab:hover { background: rgba(168, 85, 247, 0.15); border-color: #a855f7; color: #a855f7; }

    /* LAYOUT */
    main { flex: 1; padding: 40px; max-width: 1250px; margin: 0 auto; width: 100%; }
    .auth-container { max-width: 420px; margin: 60px auto; background: #0f111a; padding: 40px; border-radius: 16px; border: 1px solid #1f2430; text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6); }
    input { background: #131722; border: 1px solid #1f2430; padding: 12px; color: #fff; border-radius: 8px; margin-bottom: 12px; width: 100%; }

    /* LÁDANYITÓ SPINNER */
    .case-wrapper { position: relative; width: 100%; height: 210px; background: #0f111a; border-radius: 16px; overflow: hidden; border: 1px solid #1f2430; margin: 30px 0; box-shadow: inset 0 0 30px rgba(0,0,0,0.8); }
    .pointer { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: #22c55e; z-index: 10; transform: translateX(-50%); box-shadow: 0 0 15px #22c55e, 0 0 30px #22c55e; }
    .spinner-track { display: flex; position: absolute; left: 0; top: 15px; height: 180px; transition: transform 5s cubic-bezier(0.1, 1, 0.1, 1); }
    
    /* KÁRTYÁK & KÉPEK */
    .item-card { min-width: 160px; height: 180px; background: #131722; margin: 0 6px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; border-bottom: 4px solid #a855f7; padding: 12px; text-align: center; font-size: 12px; font-weight: 600; }
    .item-card img { width: 90px; height: 70px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); margin-top: 10px; }

    /* LENYITHATÓ RAKTÁR FIÓK (DRAWER) */
    .inventory-drawer { position: fixed; top: 0; right: -450px; width: 420px; height: 100vh; background: #0f111a; border-left: 1px solid #1f2430; z-index: 200; box-shadow: -10px 0 40px rgba(0,0,0,0.8); transition: right 0.3s ease; padding: 25px; display: flex; flex-direction: column; }
    .inventory-drawer.open { right: 0; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2430; padding-bottom: 15px; margin-bottom: 20px; }
    .drawer-content { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; align-content: start; }
    .inv-item { background: #131722; border-radius: 12px; padding: 12px; text-align: center; border: 1px solid #1f2430; border-bottom: 4px solid #a855f7; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
    .inv-item img { width: 80px; height: 60px; object-fit: contain; margin: 8px 0; }

    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 150; display: none; backdrop-filter: blur(4px); }
    .overlay.active { display: block; }

    .hidden { display: none !important; }
  </style>
</head>
<body>

  <header>
    <div class="logo" onclick="window.location.reload()">TerBDrop</div>
    <div id="user-nav" class="user-info hidden">
      <span>Üdv, <b id="display-username" style="color: #a855f7;"></b>!</span>
      <div class="balance-badge"><span id="display-balance">0.00</span> $</div>
      <button onclick="toggleInventoryDrawer()" class="btn-inventory">🎒 Raktáram (<span id="inv-count">0</span>)</button>
      <button onclick="logout()" class="btn-danger">Kijelentkezés</button>
    </div>
  </header>

  <!-- SAJÁT RAKTÁR LENYITHATÓ PANEL (DRAWER) -->
  <div id="overlay" class="overlay" onclick="toggleInventoryDrawer()"></div>
  <div id="inventory-drawer" class="inventory-drawer">
    <div class="drawer-header">
      <h2 style="font-size: 20px; font-weight: 800;">Saját Raktár</h2>
      <button onclick="toggleInventoryDrawer()" style="background: none; color: #9ca3af; font-size: 20px; padding: 0;">✕</button>
    </div>
    <div id="drawer-grid" class="drawer-content"></div>
  </div>

  <main>
    <!-- AUTH -->
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
      <!-- KATEGÓRIA VÁLASZTÓ -->
      <div class="category-tabs">
        <div class="cat-tab active" onclick="filterCategory('all', this)">Összes Láda</div>
        <div class="cat-tab" onclick="filterCategory('budget', this)">Olcsó (Budget)</div>
        <div class="cat-tab" onclick="filterCategory('premium', this)">Prémium</div>
        <div class="cat-tab" onclick="filterCategory('knife', this)">Kések</div>
      </div>

      <!-- LÁDA VÁLASZTÓ GOMBOK -->
      <div id="case-selector" style="display: flex; justify-content: center; gap: 12px; margin-bottom: 35px; flex-wrap: wrap;"></div>

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
    </div>
  </main>

  <script>
    let isRegisterMode = false;
    let selectedCaseKey = '';
    let allCases = [];
    let currentUser = null;
    let currentCategory = 'all';

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
        alert("Kérjük, töltsd ki a mezőket!");
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
        alert("Hálózati hiba!");
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
      } catch(e) { console.error("Session hiba", e); }
    }

    async function fetchCases() {
      try {
        const res = await fetch('/api/cases');
        allCases = await res.json();
        renderCaseButtons();
      } catch(e) { console.error("Láda betöltési hiba", e); }
    }

    function filterCategory(cat, element) {
      currentCategory = cat;
      document.querySelectorAll('.cat-tab').forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      renderCaseButtons();
    }

    function renderCaseButtons() {
      const container = document.getElementById('case-selector');
      container.innerHTML = '';

      const filteredCases = currentCategory === 'all' 
        ? allCases 
        : allCases.filter(c => c.category === currentCategory);

      if (filteredCases.length > 0) {
        if (!selectedCaseKey || !filteredCases.some(c => c.caseId === selectedCaseKey)) {
          selectedCaseKey = filteredCases[0].caseId;
        }
      }

      filteredCases.forEach(c => {
        const btn = document.createElement('button');
        btn.style.cssText = "background: #131722; color: #9ca3af; border: 1px solid #1f2430; padding: 10px 18px;";
        if (c.caseId === selectedCaseKey) {
          btn.style.cssText = "background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid #a855f7;";
        }
        btn.innerText = \`\${c.name} (\${c.price}$)\`;
        btn.onclick = () => selectCase(c.caseId);
        container.appendChild(btn);
      });

      if (selectedCaseKey) selectCase(selectedCaseKey);
    }

    function selectCase(caseId) {
      selectedCaseKey = caseId;
      const c = allCases.find(x => x.caseId === caseId);
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
      document.getElementById('inv-count').innerText = userData.inventory.length;

      renderDrawerInventory(userData.inventory);
    }

    async function logout() {
      await fetch('/api/logout', { method: 'POST' });
      window.location.reload();
    }

    function generateTrackItems() {
      const track = document.getElementById('spinner-track');
      track.innerHTML = '';
      const currentCase = allCases.find(c => c.caseId === selectedCaseKey);
      if(!currentCase || !currentCase.items || currentCase.items.length === 0) return;

      for (let i = 0; i < 60; i++) {
        const randItem = currentCase.items[Math.floor(Math.random() * currentCase.items.length)];
        const el = document.createElement('div');
        el.className = 'item-card';
        el.style.borderBottomColor = randItem.color || '#a855f7';
        el.innerHTML = \`
          <div style="font-size:11px; font-weight:bold;">\${randItem.name}</div>
          <img src="\${randItem.img || 'https://via.placeholder.com/90'}" alt="Skin">
          <div style="color:#22c55e; font-weight:bold;">\${randItem.price}$</div>
        \`;
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
        cards[45].innerHTML = \`
          <div style="font-size:11px; font-weight:bold;">\${data.item.name}</div>
          <img src="\${data.item.img || 'https://via.placeholder.com/90'}" alt="Skin">
          <div style="color:#22c55e; font-weight:bold;">\${data.item.price}$</div>
        \`;

        setTimeout(() => {
          track.style.transition = 'transform 5s cubic-bezier(0.1, 1, 0.1, 1)';
          const cardWidth = 172;
          const targetOffset = -(45 * cardWidth - (document.querySelector('.case-wrapper').clientWidth / 2) + 86);
          track.style.transform = \`translateX(\${targetOffset}px)\`;
        }, 50);

        setTimeout(() => {
          alert(\`Nyeremény: \${data.item.name} (\${data.item.price} $)\`);
          document.getElementById('display-balance').innerText = data.newBalance.toFixed(2);
          document.getElementById('inv-count').innerText = data.inventory.length;
          renderDrawerInventory(data.inventory);
          btn.disabled = false;
        }, 5200);

      } catch (err) {
        alert('Hiba történt!');
        btn.disabled = false;
      }
    }

    function toggleInventoryDrawer() {
      document.getElementById('inventory-drawer').classList.toggle('open');
      document.getElementById('overlay').classList.toggle('active');
    }

    function renderDrawerInventory(inventory) {
      const grid = document.getElementById('drawer-grid');
      grid.innerHTML = '';

      if (!inventory || inventory.length === 0) {
        grid.innerHTML = '<p style="color:#6b7280; grid-column: span 2; text-align:center;">A raktárad üres.</p>';
        return;
      }

      inventory.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.style.borderBottomColor = item.color || '#a855f7';
        el.innerHTML = \`
          <div style="font-size:11px; font-weight:bold;">\${item.name}</div>
          <img src="\${item.img || 'https://via.placeholder.com/80'}" alt="Skin">
          <div style="color:#22c55e; font-size:12px; font-weight:bold; margin-bottom:8px;">\${item.price.toFixed(2)} $</div>
          <button onclick="sellItem(\${index})" class="btn-danger" style="font-size: 10px; padding: 6px; width: 100%;">ELADÁS</button>
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
        document.getElementById('inv-count').innerText = data.inventory.length;
        renderDrawerInventory(data.inventory);
      } catch (err) {
        alert('Hiba a tárgy eladásakor!');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> TerBDrop Szerver elindult a ${PORT} porton! <<<`);
});
