const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    secure: false, // HTTPS esetén a Renderen élesben átállítható true-ra
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 hét
  }
}));

// --- LÁDA / CASE ELEMEK MAFC (ITEMS) ---
const AVAILABLE_ITEMS = [
  { id: 'item_1', name: 'Karambit | Fade', price: 1200.00, color: '#ffd700', chance: 0.5, img: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=150' },
  { id: 'item_2', name: 'M4A4 | Howl', price: 850.00, color: '#eb4b4b', chance: 1.5, img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=150' },
  { id: 'item_3', name: 'AK-47 | Fire Serpent', price: 400.00, color: '#eb4b4b', chance: 3.0, img: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=150' },
  { id: 'item_4', name: 'AWP | Asiimov', price: 120.00, color: '#d32ce6', chance: 10.0, img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150' },
  { id: 'item_5', name: 'USP-S | Kill Confirmed', price: 65.00, color: '#8847ff', chance: 20.0, img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
  { id: 'item_6', name: 'Glock-18 | Water Elemental', price: 15.00, color: '#4b69ff', chance: 30.0, img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150' },
  { id: 'item_7', name: 'P250 | Sand Dune', price: 1.50, color: '#b0c3d9', chance: 35.0, img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=150' }
];

const CASE_PRICE = 50.00;

// --- SEGÉDFÜGGVÉNYEK ---
function getRandomItem() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const item of AVAILABLE_ITEMS) {
    cumulative += item.chance;
    if (rand <= cumulative) {
      return item;
    }
  }
  return AVAILABLE_ITEMS[AVAILABLE_ITEMS.length - 1];
}

// --- API VÉGPONTOK (BACKEND) ---

// Status Check API
app.get('/api/status', (req, res) => {
  res.json({
    dbStatus: dbStatus,
    dbErrorDetails: dbErrorDetails,
    readyState: mongoose.connection.readyState
  });
});

// Regisztráció
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Minden mező kitöltése kötelező!' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: `Adatbázis csatlakozási hiba [${dbStatus}]: ${dbErrorDetails || 'Nincs aktív kapcsolat.'}` 
      });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'A felhasználónévnek legalább 3 karakteresnek kell lennie!' });
    }

    const existingUser = await User.findOne({ username: new RegExp(`^${cleanUsername}$`, 'i') });
    if (existingUser) {
      return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: cleanUsername,
      password: hashedPassword,
      balance: 500.00,
      inventory: []
    });

    await newUser.save();
    req.session.userId = newUser._id;

    res.json({ 
      success: true, 
      username: newUser.username, 
      balance: newUser.balance,
      inventory: newUser.inventory
    });
  } catch (err) {
    console.error("REGISZTRÁCIÓS HIBA:", err);
    res.status(500).json({ error: 'Szerveroldali hiba: ' + err.message });
  }
});

// Bejelentkezés
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Adja meg a felhasználónevet és a jelszót!' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'Adatbázis jelenleg nem elérhető!' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Hibás felhasználónév vagy jelszó!' });
    }

    req.session.userId = user._id;
    res.json({
      success: true,
      username: user.username,
      balance: user.balance,
      inventory: user.inventory
    });
  } catch (err) {
    console.error("BEJELENTKEZÉSI HIBA:", err);
    res.status(500).json({ error: 'Szerver hiba: ' + err.message });
  }
});

// Kijelentkezés
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Nem sikerült kijelentkezni!' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Saját adatok lekérése (Session check)
app.get('/api/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ loggedIn: false });
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.json({ loggedIn: false });
    }
    res.json({
      loggedIn: true,
      username: user.username,
      balance: user.balance,
      inventory: user.inventory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Láda nyitása
app.post('/api/open-case', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Kérjük, jelentkezzen be a nyitáshoz!' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Felhasználó nem található!' });

    if (user.balance < CASE_PRICE) {
      return res.status(400).json({ error: 'Nincs elegendő egyenlege a láda kinyitásához! (Ár: 50.00 $)' });
    }

    // Vonjuk le az árat és sorsoljunk
    user.balance -= CASE_PRICE;
    const wonItem = getRandomItem();

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
    console.error("NYITÁSI HIBA:", err);
    res.status(500).json({ error: 'Hiba a láda nyitása közben: ' + err.message });
  }
});

// Tárgy eladása az Invertory-ból
app.post('/api/sell-item', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nem vagy bejelentkezve!' });
    }

    const { itemIndex } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user || !user.inventory[itemIndex]) {
      return res.status(400).json({ error: 'A tárgy nem található a raktárban!' });
    }

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
    res.status(500).json({ error: 'Eladási hiba: ' + err.message });
  }
});

// Ingyen egyenleg teszteléshez (Faucet/Refill)
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

// --- FULL FRONTEND HTML / CS / JS KÓD ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PACKDROP - Case Opening Platform</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #0b0e14; color: #ffffff; min-height: 100vh; display: flex; flex-direction: column; }
        
        /* HEADER */
        header { background: #151a23; border-bottom: 2px solid #222938; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffb400; letter-spacing: 2px; }
        .user-info { display: flex; align-items: center; gap: 20px; }
        .balance-badge { background: #1c2331; padding: 8px 16px; border-radius: 20px; border: 1px solid #ffb400; font-weight: bold; color: #ffb400; }
        
        /* BUTTONS & INPUTS */
        button { cursor: pointer; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; transition: 0.2s; }
        .btn-primary { background: #ffb400; color: #000; }
        .btn-primary:hover { background: #e09e00; }
        .btn-danger { background: #eb4b4b; color: #fff; }
        .btn-success { background: #2ecc71; color: #fff; }
        
        input { background: #1c2331; border: 1px solid #2a354b; padding: 10px; color: #fff; border-radius: 6px; margin-bottom: 10px; width: 100%; }
        
        /* MAIN CONTAINERS */
        main { flex: 1; padding: 40px; max-width: 1200px; margin: 0 auto; width: 100%; }
        .auth-container { max-width: 400px; margin: 50px auto; background: #151a23; padding: 30px; border-radius: 12px; border: 1px solid #222938; text-align: center; }
        
        /* ROULETTE / CASE ANIMATION */
        .case-wrapper { position: relative; width: 100%; height: 200px; background: #151a23; border-radius: 12px; overflow: hidden; border: 2px solid #222938; margin: 30px 0; }
        .pointer { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: #ffb400; z-index: 10; transform: translateX(-50%); box-shadow: 0 0 10px #ffb400; }
        .spinner-track { display: flex; position: absolute; left: 0; top: 20px; height: 160px; transition: transform 5s cubic-bezier(0.1, 1, 0.1, 1); }
        
        .item-card { min-width: 140px; height: 160px; background: #1c2331; margin: 0 5px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 4px solid #fff; padding: 10px; text-align: center; font-size: 12px; }
        .item-card img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
        
        /* INVENTORY GRID */
        .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; margin-top: 20px; }
        .inv-item { background: #151a23; border-radius: 8px; padding: 15px; text-align: center; position: relative; border-bottom: 4px solid #555; }
        .inv-item img { width: 90px; height: 90px; object-fit: contain; }
        .inv-item .sell-btn { margin-top: 10px; font-size: 11px; padding: 6px 10px; width: 100%; }

        .hidden { display: none !important; }
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
        <!-- BEJELENTKEZÉS / REGISZTRÁCIÓ ABLAK -->
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

        <!-- JÁTÉK ÉS RAK TÁR ABLAK (Csak bejelentkezve látszik) -->
        <div id="game-box" class="hidden">
          
          <div style="text-align: center;">
            <h2>Weapon Case v1</h2>
            <p style="color: #888;">Nyitási ár: <b>50.00 $</b></p>
          </div>

          <!-- LÁDA SPINNER -->
          <div class="case-wrapper">
            <div class="pointer"></div>
            <div class="spinner-track" id="spinner-track"></div>
          </div>

          <div style="text-align: center;">
            <button id="open-btn" onclick="openCase()" class="btn-primary" style="font-size: 18px; padding: 15px 40px;">LÁDA NYITÁSA (50$)</button>
          </div>

          <h3 style="margin-top: 50px; border-bottom: 1px solid #222938; padding-bottom: 10px;">Saját Raktár (Inventory)</h3>
          <div class="inventory-grid" id="inventory-grid">
            <!-- Dinamikusan töltődik be -->
          </div>

        </div>
      </main>

      <script>
        let isRegisterMode = false;
        let currentUser = null;

        const AVAILABLE_ITEMS = [
          { id: 'item_1', name: 'Karambit | Fade', price: 1200.00, color: '#ffd700', img: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=150' },
          { id: 'item_2', name: 'M4A4 | Howl', price: 850.00, color: '#eb4b4b', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=150' },
          { id: 'item_3', name: 'AK-47 | Fire Serpent', price: 400.00, color: '#eb4b4b', img: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=150' },
          { id: 'item_4', name: 'AWP | Asiimov', price: 120.00, color: '#d32ce6', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150' },
          { id: 'item_5', name: 'USP-S | Kill Confirmed', price: 65.00, color: '#8847ff', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
          { id: 'item_6', name: 'Glock-18 | Water Elemental', price: 15.00, color: '#4b69ff', img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150' },
          { id: 'item_7', name: 'P250 | Sand Dune', price: 1.50, color: '#b0c3d9', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=150' }
        ];

        // Indításkor ellenőrizzük, hogy be van-e lépve a felhasználó
        window.onload = async () => {
          generateTrackItems();
          checkSession();
        };

        function toggleAuthMode() {
          isRegisterMode = !isRegisterMode;
          document.getElementById('auth-title').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
          document.getElementById('auth-btn').innerText = isRegisterMode ? 'Regisztráció' : 'Bejelentkezés';
          document.getElementById('auth-toggle-text').innerText = isRegisterMode ? 'Már van fiókod?' : 'Nincs még fiókod?';
        }

        async function checkSession() {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data.loggedIn) {
            updateUI(data);
          }
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
            alert("Hálózati hiba történt a csatlakozás során!");
          }
        }

        function updateUI(userData) {
          currentUser = userData;
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
          for (let i = 0; i < 60; i++) {
            const randItem = AVAILABLE_ITEMS[Math.floor(Math.random() * AVAILABLE_ITEMS.length)];
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
            const res = await fetch('/api/open-case', { method: 'POST' });
            const data = await res.json();

            if (data.error) {
              alert(data.error);
              btn.disabled = false;
              return;
            }

            // Animáció lefuttatása
            const track = document.getElementById('spinner-track');
            track.style.transition = 'none';
            track.style.transform = 'translateX(0px)';
            
            // Újra generáljuk, hogy a nyert elem a 45. pozícióba essen
            generateTrackItems();
            const cards = track.children;
            
            // Beállítjuk a 45. kártyát a megnyert tárgyra
            cards[45].style.borderBottomColor = data.item.color;
            cards[45].innerHTML = \`<img src="\${data.item.img}"><div><b>\${data.item.name}</b><br>\${data.item.price}$</div>\`;

            setTimeout(() => {
              track.style.transition = 'transform 5s cubic-bezier(0.1, 1, 0.1, 1)';
              // Eltolás kiszámítása középre
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

// Szerver indítása
app.listen(PORT, '0.0.0.0', () => {
  console.log(`>>> Szerver elindult a ${PORT} porton! <<<`);
});
