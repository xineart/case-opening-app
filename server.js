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
  balance: { type: Number, default: 100.00 }, // $100 kezdő egyenleg teszteléshez
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Munkamenet (Session) beállítása
app.use(session({
  secret: process.env.SESSION_SECRET || 'titkos_fejlesztoi_kulcs',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Játék Skinek (Szerveroldali adattár)
const items = [
  { id: 1, name: "P250 | Sand Dune", price: 0.10, color: "#b0c3d9", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_p250_cu_p250_sand_light_large.png" },
  { id: 2, name: "AK-47 | Redline", price: 15.00, color: "#e4ae39", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_ak47_cu_ak47_cobra_light_large.png" },
  { id: 3, name: "USP-S | Kill Confirmed", price: 50.00, color: "#d32ce6", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_usp_silencer_cu_usp_kill_confirmed_light_large.a3a7b8f19c9fb931b18c1edd7dd21d44e2c3c2e0.png" },
  { id: 4, name: "M4A4 | Howl", price: 1200.00, color: "#eb4b4b", img: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_m4a1_cu_m4a1_howl_light_large.png" }
];

// --- BACKEND API VÉGPONTOK ---

// Regisztráció
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Minden mező kötelező!' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Ez a felhasználónév már foglalt!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, balance: 100.00 });
    await newUser.save();

    req.session.userId = newUser._id;
    res.json({ success: true, username: newUser.username, balance: newUser.balance });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a regisztrációnál.' });
  }
});

// Bejelentkezés
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

// Saját profil lekérése
app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username, balance: user.balance });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

// Ládanyitás szerveroldalon
app.post('/api/open-case', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Be kell jelentkezned!' });
  
  try {
    const user = await User.findById(req.session.userId);
    const caseCost = 5.00;

    if (user.balance < caseCost) return res.status(400).json({ error: 'Nincs elég egyenleged!' });

    user.balance -= caseCost;
    const winningItem = items[Math.floor(Math.random() * items.length)];
    user.balance += winningItem.price;

    await user.save();

    res.json({ success: true, winningItem, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: 'Szerver hiba a nyitásnál.' });
  }
});

// Kijelentkezés
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// --- FRONTEND ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>PACKDROP - CS2 Platform</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background: #0b0e14; color: #fff; text-align: center; }
        header { background: #151a23; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222936; }
        .logo { font-size: 24px; font-weight: 900; color: #ffb400; }
        .auth-box { display: flex; gap: 10px; align-items: center; }
        input { padding: 8px 12px; border-radius: 4px; border: 1px solid #333; background: #222; color: #fff; }
        button { background: #ffb400; color: #000; border: none; padding: 8px 15px; font-weight: bold; border-radius: 4px; cursor: pointer; }
        .container { max-width: 800px; margin: 40px auto; padding: 30px; background: #151a23; border-radius: 8px; border: 1px solid #222936; }
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
        <h2 id="welcome-msg">Hozz létre egy fiókot vagy jelentkezz be!</h2>
        <h3 id="balance-msg" style="margin-top: 15px; color: #00e5ff;"></h3>
        <br>
        <button id="open-btn" onclick="openCase()" style="display:none; font-size: 18px; padding: 15px 30px; margin-top:20px;">
          LÁDA NYITÁSA ($5.00)
        </button>
        <p id="result-msg" style="margin-top:20px; font-weight:bold; font-size:18px;"></p>
      </div>

      <script>
        async function checkAuth() {
          const res = await fetch('/api/me');
          const data = await res.json();
          if (data.loggedIn) {
            document.getElementById('auth-section').innerHTML = \`
              <span>Üdv, <b>\${data.username}</b></span>
              <button onclick="logout()" style="background:#e02424; color:#fff;">Kijelentkezés</button>
            \`;
            document.getElementById('welcome-msg').innerText = "Adatbázis elve csatlakoztatva! Készen állsz a játékra.";
            document.getElementById('balance-msg').innerText = "MongoDB-ben tárolt Egyenleged: $" + data.balance.toFixed(2);
            document.getElementById('open-btn').style.display = "inline-block";
          }
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

        async function openCase() {
          const res = await fetch('/api/open-case', { method: 'POST' });
          const data = await res.json();
          if (data.error) {
            alert(data.error);
          } else {
            document.getElementById('balance-msg').innerText = "MongoDB-ben tárolt Egyenleged: $" + data.newBalance.toFixed(2);
            document.getElementById('result-msg').innerHTML = 'Nyereményed: <span style="color:' + data.winningItem.color + '">' + data.winningItem.name + '</span> ($' + data.winningItem.price + ')';
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
    console.log('Port beragadt, újrapróbálkozás...');
    setTimeout(() => {
      server.close();
      server.listen(PORT, '0.0.0.0');
    }, 1000);
  }
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
