const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// --- ADATBÁZIS CSATLAKOZÁS ---
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('>>> Sikeres MongoDB csatlakozás! <<<'))
    .catch(err => console.error('MongoDB csatlakozási hiba:', err));
} else {
  console.warn('FIGYELEM: A MONGO_URI környezeti változó nincs beállítva!');
}

// Felhasználói Modell (MongoDB Schema)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 100.00 },
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

// Munkamenet (Session)
app.use(session({
  secret: process.env.SESSION_SECRET || 'titkos_fejlesztoi_kulcs',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Skinek adattára
const items = [
  { id: "1", name: "P250 | Sand Dune", price: 0.10, color: "#b0c3d9", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_p250_cu_p250_sand_light_large.png" },
  { id: "2", name: "AK-47 | Redline", price: 15.00, color: "#e4ae39", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_ak47_cu_ak47_cobra_light_large.png" },
  { id: "3", name: "USP-S | Kill Confirmed", price: 50.00, color: "#d32ce6", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_usp_silencer_cu_usp_kill_confirmed_light_large.a3a7b8f19c9fb931b18c1edd7dd21d44e2c3c2e0.png" },
  { id: "4", name: "M4A4 | Howl", price: 1200.00, color: "#eb4b4b", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_m4a1_cu_m4a1_howl_light_large.png" }
];

// --- BACKEND API VÉGPONTOK ---

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Minden mező kötelező!' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, balance: 100.00, inventory: [] });
    await newUser.save();

    req.session.userId = newUser._id;
    res.json({ success: true, username: newUser.username, balance: newUser.balance });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a regisztrációnál.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });

    req.session.userId = user._id;
    res.json({ success: true, username: user.username, balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a bejelentkezésnél.' });
  }
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ 
      loggedIn: true, 
      username: user.username, 
      balance: user.balance,
      inventory: user.inventory 
    });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

app.post('/api/open-case', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Be kell jelentkezned!' });
  
  try {
    const user = await User.findById(req.session.userId);
    const caseCost = 5.00;

    if (user.balance < caseCost) return res.status(400).json({ error: 'Nincs elég egyenleged!' });

    user.balance -= caseCost;
    const winningItem = items[Math.floor(Math.random() * items.length)];

    user.inventory.push({
      itemId: winningItem.id,
      name: winningItem.name,
      price: winningItem.price,
      color: winningItem.color,
      img: winningItem.img
    });

    await user.save();

    res.json({ 
      success: true, 
      winningItem, 
      allItems: items,
      newBalance: user.balance,
      inventory: user.inventory 
    });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a nyitásnál.' });
  }
});

app.post('/api/sell-item', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Be kell jelentkezned!' });
  
  try {
    const { inventoryItemId } = req.body;
    const user = await User.findById(req.session.userId);

    const itemIndex = user.inventory.findIndex(item => item._id.toString() === inventoryItemId);
    if (itemIndex === -1) return res.status(400).json({ error: 'A tárgy nem található a leltárodban!' });

    const itemToSell = user.inventory[itemIndex];
    user.balance += itemToSell.price;
    user.inventory.splice(itemIndex, 1);

    await user.save();

    res.json({ 
      success: true, 
      newBalance: user.balance, 
      inventory: user.inventory 
    });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba az eladásnál.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// --- FRONTEND ANIMÁCIÓVAL ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>PACKDROP - CS2 Platform</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background: #0b0e14; color: #fff; text-align: center; overflow-x: hidden; }
        header { background: #151a23; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222936; }
        .logo { font-size: 24px; font-weight: 900; color: #ffb400; }
        .auth-box { display: flex; gap: 10px; align-items: center; }
        input { padding: 8px 12px; border-radius: 4px; border: 1px solid #333; background: #222; color: #fff; }
        button { background: #ffb400; color: #000; border: none; padding: 8px 15px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .container { max-width: 1000px; margin: 30px auto; padding: 20px; }
        .box { background: #151a23; border-radius: 8px; border: 1px solid #222936; padding: 25px; margin-bottom: 25px; }

        /* LÁDANYITÓ SPINNER CONTAINER */
        .spinner-wrapper {
          position: relative;
          width: 100%;
          height: 160px;
          background: #0d1117;
          border: 2px solid #222936;
          border-radius: 8px;
          overflow: hidden;
          margin: 20px 0;
        }

        /* Középső mutató nyíl / vonal */
        .pointer {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 100%;
          background: #ffb400;
          z-index: 10;
          box-shadow: 0 0 10px #ffb400;
        }

        /* Pörgő sor */
        .spinner-track {
          display: flex;
          gap: 10px;
          position: absolute;
          left: 0;
          top: 10px;
          will-change: transform;
        }

        /* Egyedi skin kártya a spinnerben */
        .spinner-card {
          width: 130px;
          height: 140px;
          background: #161b22;
          border-radius: 6px;
          padding: 10px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-bottom: 4px solid #fff;
        }
        .spinner-card img { width: 75px; height: 75px; object-fit: contain; }
        .spinner-card .card-name { font-size: 11px; font-weight: bold; margin-top: 5px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }

        /* LELTÁR GRID */
        .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 15px; }
        .item-card { background: #1a202c; border-radius: 6px; padding: 15px; border-bottom: 4px solid #fff; position: relative; display: flex; flex-direction: column; align-items: center; }
        .item-card img { width: 100px; height: 100px; object-fit: contain; }
        .item-name { font-size: 13px; font-weight: bold; margin: 10px 0 5px 0; }
        .item-price { color: #ffb400; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
        .sell-btn { background: #e02424; color: white; padding: 5px 10px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; width: 100%; }
      </style>
    </head>
    <body>

      <header>
        <div class="logo">PACKDROP</div>
        <div id="auth-section" class="auth-box">
          <input type="text" id="username" placeholder="Felhasználónév">
          <input type="password" id="password" placeholder="Jelszó">
          <button onclick="login()">Bejelentkezés</button>
          <button onclick="register()" style="background:#00e5ff;">Regisztráció</button>
        </div>
      </header>

      <div class="container">
        
        <div class="box">
          <h2 id="welcome-msg">Lépj be a játékhoz!</h2>
          <h3 id="balance-msg" style="margin-top: 10px; color: #00e5ff;"></h3>
          
          <!-- Ládanyitó Animációs Terület -->
          <div id="case-area" style="display:none;">
            <div class="spinner-wrapper">
              <div class="pointer"></div>
              <div id="spinner-track" class="spinner-track"></div>
            </div>

            <button id="open-btn" onclick="openCase()" style="font-size: 18px; padding: 12px 30px; margin-top:10px;">
              LÁDA NYITÁSA ($5.00)
            </button>
          </div>

          <p id="result-msg" style="margin-top:15px; font-weight:bold; font-size:16px; min-height: 24px;"></p>
        </div>

        <div id="inventory-box" class="box" style="display:none; text-align: left;">
          <h3>Saját Leltár (Inventory)</h3>
          <div id="inventory-grid" class="inventory-grid"></div>
        </div>

      </div>

      <script>
        let isSpinning = false;

        function renderInventory(items) {
          const grid = document.getElementById('inventory-grid');
          grid.innerHTML = '';
          
          if (!items || items.length === 0) {
            grid.innerHTML = '<p style="color:#777;">Még nincs tárgy a leltárodba. Nyiss egy ládát!</p>';
            return;
          }

          items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.style.borderBottomColor = item.color;
            card.innerHTML = \`
              <img src="\${item.img}" alt="\${item.name}">
              <div class="item-name">\${item.name}</div>
              <div class="item-price">$\${item.price.toFixed(2)}</div>
              <button class="sell-btn" onclick="sellItem('\${item._id}')">ELADÁS ($\${item.price.toFixed(2)})</button>
            \`;
            grid.appendChild(card);
          });
        }

        async function checkAuth() {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data.loggedIn) {
            document.getElementById('auth-section').innerHTML = \`
              <span>Üdv, <b>\${data.username}</b></span>
              <button onclick="logout()" style="background:#e02424; color:#fff;">Kijelentkezés</button>
            \`;
            document.getElementById('welcome-msg').innerText = "Sok sikert a nyitáshoz!";
            document.getElementById('balance-msg').innerText = "Egyenleged: $" + data.balance.toFixed(2);
            document.getElementById('case-area').style.display = "block";
            document.getElementById('inventory-box').style.display = "block";
            renderInventory(data.inventory);
          }
        }

        async function openCase() {
          if (isSpinning) return;

          const openBtn = document.getElementById('open-btn');
          const track = document.getElementById('spinner-track');
          const resultMsg = document.getElementById('result-msg');

          resultMsg.innerText = "";
          openBtn.disabled = true;

          const res = await fetch('/api/open-case', { method: 'POST' });
          const data = await res.json();

          if (data.error) {
            alert(data.error);
            openBtn.disabled = false;
            return;
          }

          isSpinning = true;

          // Generálunk 50 kártyát, ahol a nyertes tárgy pontosan a 45. pozícióban lesz
          const cardList = [];
          for (let i = 0; i < 50; i++) {
            if (i === 44) {
              cardList.push(data.winningItem);
            } else {
              const randomItem = data.allItems[Math.floor(Math.random() * data.allItems.length)];
              cardList.push(randomItem);
            }
          }

          // Feltöltjük a spinnert kártyákkal
          track.style.transition = 'none';
          track.style.transform = 'translateX(0px)';
          track.innerHTML = cardList.map(item => \`
            <div class="spinner-card" style="border-bottom-color: \${item.color}">
              <img src="\${item.img}">
              <div class="card-name">\${item.name}</div>
            </div>
          \`).join('');

          // Kiszámoljuk a pontos eltolási távolságot a 45. elem közepére
          // Card szélessége = 130px, Gap = 10px -> Elem lépték = 140px
          // A szülő container szélessége ~960px, közepe ~480px
          const cardWidth = 140; 
          const targetOffset = (44 * cardWidth) - 400 + (Math.random() * 60 - 30); 

          // Animáció indítása CSS Cubic-Bezier görbével (lassuló forgás)
          setTimeout(() => {
            track.style.transition = 'transform 5s cubic-bezier(0.1, 1, 0.1, 1)';
            track.style.transform = \`translateX(-\${targetOffset}px)\`;
          }, 50);

          // Amikor lejárt az 5 másodperces pörgés:
          setTimeout(() => {
            isSpinning = false;
            openBtn.disabled = false;
            document.getElementById('balance-msg').innerText = "Egyenleged: $" + data.newBalance.toFixed(2);
            resultMsg.innerHTML = 'Kinyitottad: <span style="color:' + data.winningItem.color + '">' + data.winningItem.name + '</span>!';
            renderInventory(data.inventory);
          }, 5250);
        }

        async function register() {
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();
          if(data.error) alert(data.error);
          else location.reload();
        }

        async function login() {
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();
          if(data.error) alert(data.error);
          else location.reload();
        }

        async function logout() {
          await fetch('/api/logout', { method: 'POST' });
          location.reload();
        }

        async function sellItem(inventoryItemId) {
          const res = await fetch('/api/sell-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventoryItemId })
          });
          const data = await res.json();
          if (data.error) {
            alert(data.error);
          } else {
            document.getElementById('balance-msg').innerText = "Egyenleged: $" + data.newBalance.toFixed(2);
            renderInventory(data.inventory);
          }
        }

        checkAuth();
      </script>
    </body>
    </html>
  `);
});

// --- INDÍTÁS ÉS PORT KEZELÉS ---
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> Szerver elindult a ${PORT} porton! <<<`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    setTimeout(() => {
      server.close();
      server.listen(PORT, '0.0.0.0');
    }, 1000);
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
