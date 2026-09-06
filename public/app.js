// --- HELYI images/ MAPPÁBÓL BETÖLTŐ NYÍLT CS2 SKINEK ÉS LÁDÁK ---
const SKIN_DATABASE = [
  { id: 1, name: "P250 | Sand Dune", price: 0.50, color: "#4b69ff", img: "images/p250_sanddune.png" },
  { id: 2, name: "Glock-18 | Water Elemental", price: 8.50, color: "#8847ff", img: "images/glock_waterelemental.png" },
  { id: 3, name: "AK-47 | Redline", price: 22.00, color: "#d32ce6", img: "images/ak47_redline.png" },
  { id: 4, name: "M4A4 | Neo-Noir", price: 35.00, color: "#eb4b4b", img: "images/m4a4_neonoir.png" },
  { id: 5, name: "AWP | Asiimov", price: 110.00, color: "#eb4b4b", img: "images/awp_asiimov.png" },
  { id: 6, name: "AK-47 | Vulcan", price: 280.00, color: "#eb4b4b", img: "images/ak47_vulcan.png" },
  { id: 7, name: "★ Karambit | Fade", price: 2400.00, color: "#ffd700", img: "images/karambit_fade.png" }
];

const OFFICIAL_CASES = [
  { id: 'terb-starter', name: 'Starter Case', price: 2.50, color: "#4b69ff", img: "images/case_starter.png" },
  { id: 'terb-neon', name: 'Neon Collection', price: 12.00, color: "#8847ff", img: "images/case_neon.png" },
  { id: 'terb-classified', name: 'Covert Case', price: 35.00, color: "#d32ce6", img: "images/case_covert.png" },
  { id: 'terb-knife', name: 'Knife & Gold Box', price: 250.00, color: "#ffd700", img: "images/case_knife.png" }
];

// TRANSLATIONS
const TRANSLATIONS = {
  hu: {
    liveDrops: "ÉLŐ DROPOK", navCases: "LÁDÁK", navBattles: "CASE BATTLES", navUpgrader: "UPGRADER",
    balanceLabel: "EGYENLEG", loginBtn: "BEJELENTKEZÉS", casesTitle: "LOOTBOX STÍLUSÚ LÁDÁK",
    casesSub: "Exkluzív skinek a legmagasabb nyerési esélyekkel", multiOpen: "Nyitási darabszám:",
    caseContents: "LÁDA TARTALMA ÉS DROPRATE", inventoryTitle: "SAJÁT LELTÁR (INVENTORY)",
    emptyInv: "Még nem nyertél tárgyat.", battlesSub: "Átlátható csaták, real-time multiplayer élmény és 80/20 Borrow szponzoráció.",
    openBattles: "NYITOTT CSATÁK (LOBBY)", borrowDesc: "Finanszírozd más játékos belépőjének 80%-át! Cserébe a nyereményének 80%-a a tiéd lesz.",
    upgraderSub: "Tedd kockára meglévő skinedet vagy egyenlegedet a magasabb értékű tárgyakért!",
    yourStake: "1. SAJÁT TÉT", chanceLabel: "ESÉLY", targetSkin: "2. CÉLZOTT SKIN"
  },
  en: {
    liveDrops: "LIVE DROPS", navCases: "CASES", navBattles: "CASE BATTLES", navUpgrader: "UPGRADER",
    balanceLabel: "BALANCE", loginBtn: "LOGIN", casesTitle: "LOOTBOX STYLE CASES",
    casesSub: "Exclusive skins with highest drop rates", multiOpen: "Open quantity:",
    caseContents: "CASE CONTENTS & DROPRATES", inventoryTitle: "YOUR INVENTORY",
    emptyInv: "No items in inventory yet.", battlesSub: "Transparent battles, real-time multiplayer experience and 80/20 Borrow feature.",
    openBattles: "OPEN BATTLES (LOBBY)", borrowDesc: "Sponsor 80% of another player's entry fee! Get 80% of their winnings in return.",
    upgraderSub: "Risk your existing skin or balance for higher value items!",
    yourStake: "1. YOUR STAKE", chanceLabel: "CHANCE", targetSkin: "2. TARGET SKIN"
  }
};

// STATE & LOCAL STORAGE DATABASE
let currentLang = 'hu';
let currentUser = localStorage.getItem('cs2_active_user') || null;
let isLoggedIn = !!currentUser;
let usersDb = JSON.parse(localStorage.getItem('cs2_users_db')) || {};

let userBalance = (isLoggedIn && usersDb[currentUser]) ? usersDb[currentUser].balance : 0.00;
let userInventory = (isLoggedIn && usersDb[currentUser]) ? usersDb[currentUser].inventory : [];

let isSpinning = false;
let activeCase = null;
let activeBattle = null;
let multiOpenCount = 1;

// MENTÉS A LOCALSTORAGE-BA
function saveUserData() {
  if (!isLoggedIn || !currentUser) return;
  
  if (!usersDb[currentUser]) {
    usersDb[currentUser] = { password: "", balance: 100.00, inventory: [] };
  }
  
  usersDb[currentUser].balance = userBalance;
  usersDb[currentUser].inventory = userInventory;

  localStorage.setItem('cs2_users_db', JSON.stringify(usersDb));
  localStorage.setItem('cs2_active_user', currentUser);
}

// AUDIO SYSTEM
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playClickSound() {
  if (!document.getElementById('sfx-toggle')?.checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (!document.getElementById('sfx-toggle')?.checked) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.4);
}

function getRarityClass(price) {
  if (price >= 1000) return 'gold';
  if (price >= 100) return 'covert';
  if (price >= 30) return 'classified';
  if (price >= 10) return 'restricted';
  return 'milspec';
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuthAndModals();
  renderCasesCatalog();
  renderBattlesLobby();
  renderSponsorFeed();
  initLiveFeed();
  initUpgrader();

  if (isLoggedIn && currentUser && usersDb[currentUser]) {
    applyLoggedInState();
  } else {
    applyLoggedOutState();
  }

  document.getElementById('open-case-btn')?.addEventListener('click', handleOpenCase);
  document.getElementById('back-to-catalog-btn')?.addEventListener('click', closeCaseView);
  document.getElementById('create-battle-modal-btn')?.addEventListener('click', createNewBattle);
  document.getElementById('start-battle-spin-btn')?.addEventListener('click', runBattleSpin);
  document.getElementById('close-battle-arena-btn')?.addEventListener('click', closeBattleArena);

  document.querySelectorAll('.btn-multi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-multi').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      multiOpenCount = parseInt(e.target.getAttribute('data-count'));
      updateMultiSpinners();
    });
  });
});

// REGISZTRÁCIÓ ÉS BEJELENTKEZÉSI LOGIKA
function setupAuthAndModals() {
  const loginModal = document.getElementById('login-modal');
  const settingsModal = document.getElementById('settings-modal');

  // MODAL NYITÁS / ZÁRÁS
  const openLoginBtn = document.getElementById('open-login-btn');
  if (openLoginBtn) openLoginBtn.onclick = () => loginModal?.classList.remove('hidden');

  const closeLoginBtn = document.getElementById('close-login-btn');
  if (closeLoginBtn) closeLoginBtn.onclick = () => loginModal?.classList.add('hidden');

  // AUTH TAB VÁLTÁS (LOGIN VS REGISTER)
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('auth-form-login');
  const formRegister = document.getElementById('auth-form-register');

  if (tabBtnLogin && tabBtnRegister && formLogin && formRegister) {
    tabBtnLogin.onclick = () => {
      tabBtnLogin.classList.add('active-auth-tab');
      tabBtnRegister.classList.remove('active-auth-tab');
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    };

    tabBtnRegister.onclick = () => {
      tabBtnRegister.classList.add('active-auth-tab');
      tabBtnLogin.classList.remove('active-auth-tab');
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
    };
  }

  // BEJELENTKEZÉS ÉS REGISZTRÁCIÓ KATTINTÁSOK
  const confirmLoginBtn = document.getElementById('confirm-login-btn');
  if (confirmLoginBtn) confirmLoginBtn.onclick = performLogin;

  const confirmRegisterBtn = document.getElementById('confirm-register-btn');
  if (confirmRegisterBtn) confirmRegisterBtn.onclick = performRegister;

  const openSettingsBtn = document.getElementById('open-settings-btn');
  if (openSettingsBtn) openSettingsBtn.onclick = () => settingsModal?.classList.remove('hidden');

  const closeSettingsBtn = document.getElementById('close-settings-btn');
  if (closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal?.classList.add('hidden');

  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) saveSettingsBtn.onclick = () => settingsModal?.classList.add('hidden');

  const openDepositBtn = document.getElementById('open-deposit-btn');
  if (openDepositBtn) {
    openDepositBtn.onclick = () => {
      if (!isLoggedIn) return;
      userBalance += 100;
      updateBalanceUI();
      saveUserData();
      alert("+$100.00 feltöltve!");
    };
  }
}

// REGISZTRÁCIÓ VÉGREHAJTÁSA
function performRegister() {
  const userIn = document.getElementById('reg-username-input')?.value.trim();
  const emailIn = document.getElementById('reg-email-input')?.value.trim();
  const passIn = document.getElementById('reg-password-input')?.value.trim();
  const passConfIn = document.getElementById('reg-password-confirm-input')?.value.trim();

  if (!userIn || !passIn) {
    return alert("Adj meg egy felhasználónevet és egy jelszót!");
  }

  if (passIn !== passConfIn) {
    return alert("A két jelszó nem egyezik meg!");
  }

  if (usersDb[userIn]) {
    return alert("Ez a felhasználónév már létezik!");
  }

  // ÚJ USER MENTÉSE
  usersDb[userIn] = {
    email: emailIn,
    password: passIn,
    balance: 100.00,
    inventory: []
  };

  currentUser = userIn;
  userBalance = 100.00;
  userInventory = [];
  isLoggedIn = true;

  saveUserData();
  applyLoggedInState();
  document.getElementById('login-modal')?.classList.add('hidden');
  alert(`Sikeres regisztráció! Üdv, ${currentUser}! ($100.00 kezdőegyenleg jóváírva)`);
}

// BEJELENTKEZÉS VÉGREHAJTÁSA
function performLogin() {
  const userIn = document.getElementById('login-username-input')?.value.trim();
  const passIn = document.getElementById('login-password-input')?.value.trim();

  if (!userIn || !passIn) {
    return alert("Adj meg felhasználónevet és jelszót!");
  }

  if (!usersDb[userIn]) {
    return alert("Nincs ilyen felhasználó! Válts a REGISZTRÁCIÓ fülre.");
  }

  if (usersDb[userIn].password !== passIn) {
    return alert("Hibás jelszó!");
  }

  currentUser = userIn;
  userBalance = usersDb[userIn].balance;
  userInventory = usersDb[userIn].inventory || [];
  isLoggedIn = true;

  saveUserData();
  applyLoggedInState();
  document.getElementById('login-modal')?.classList.add('hidden');
}

function performLogout() {
  isLoggedIn = false;
  currentUser = null;
  localStorage.removeItem('cs2_active_user');
  applyLoggedOutState();
}

function applyLoggedInState() {
  document.getElementById('open-login-btn')?.classList.add('hidden');
  document.getElementById('user-profile-box')?.classList.remove('hidden');
  document.getElementById('user-balance-box')?.classList.remove('hidden');
  document.getElementById('open-deposit-btn')?.classList.remove('hidden');

  const displayUser = document.getElementById('display-username');
  if (displayUser) {
    displayUser.innerText = currentUser;
    displayUser.onclick = performLogout;
    displayUser.title = "Kattints a kijelentkezéshez";
  }

  const p1Name = document.getElementById('p1-display-name');
  if (p1Name) p1Name.innerText = currentUser;

  updateBalanceUI();
  renderInventory();
}

function applyLoggedOutState() {
  document.getElementById('open-login-btn')?.classList.remove('hidden');
  document.getElementById('user-profile-box')?.classList.add('hidden');
  document.getElementById('user-balance-box')?.classList.add('hidden');
  document.getElementById('open-deposit-btn')?.classList.add('hidden');
  
  userBalance = 0;
  userInventory = [];
  renderInventory();
}

// ITEM ELADÁS
window.sellItem = function(index) {
  if (index < 0 || index >= userInventory.length) return;

  const itemToSell = userInventory[index];
  userBalance += itemToSell.price;
  
  userInventory.splice(index, 1);

  saveUserData();
  updateBalanceUI();
  renderInventory();
  
  if (document.getElementById('tab-upgrader')?.classList.contains('active')) {
    updateUpgraderInventory();
  }
};

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;

  if (userInventory.length === 0) {
    grid.innerHTML = `<p class="empty-inv-msg" id="txt-empty-inv">${TRANSLATIONS[currentLang].emptyInv}</p>`;
    return;
  }

  grid.innerHTML = userInventory.map((item, index) => `
    <div class="item-card ${getRarityClass(item.price)}">
      <img src="${item.img}" alt="${item.name}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
      <button class="btn-sell-item" onclick="sellItem(${index})">ELADÁS ($${item.price.toFixed(2)})</button>
    </div>
  `).join('');
}

// NYELVVÁLTÁS
window.switchLanguage = function(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`lang-${lang}`)?.classList.add('active');

  const t = TRANSLATIONS[lang];
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  };

  setTxt('txt-live-drops', t.liveDrops);
  setTxt('txt-nav-cases', t.navCases);
  setTxt('txt-nav-battles', t.navBattles);
  setTxt('txt-nav-upgrader', t.navUpgrader);
  setTxt('txt-balance-label', t.balanceLabel);
  setTxt('txt-login-btn', t.loginBtn);
  setTxt('txt-cases-title', t.casesTitle);
  setTxt('txt-cases-sub', t.casesSub);
  setTxt('txt-multi-open', t.multiOpen);
  setTxt('txt-case-contents', t.caseContents);
  setTxt('txt-inventory-title', t.inventoryTitle);
  setTxt('txt-battles-sub', t.battlesSub);
  setTxt('txt-open-battles', t.openBattles);
  setTxt('txt-borrow-desc', t.borrowDesc);
  setTxt('txt-upgrader-sub', t.upgraderSub);
  setTxt('txt-your-stake', t.yourStake);
  setTxt('txt-chance-label', t.chanceLabel);
  setTxt('txt-target-skin', t.targetSkin);
  
  renderInventory();
};

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

      e.currentTarget.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
      if (target === 'upgrader') updateUpgraderInventory();
    });
  });
}

function renderCasesCatalog() {
  const grid = document.getElementById('cases-grid');
  if (!grid) return;
  grid.innerHTML = OFFICIAL_CASES.map(c => `
    <div class="case-card" onclick="openCaseView('${c.id}')">
      <img src="${c.img}" alt="${c.name}">
      <h3>${c.name}</h3>
      <div class="price">$${c.price.toFixed(2)}</div>
    </div>
  `).join('');
}

window.openCaseView = function(caseId) {
  activeCase = OFFICIAL_CASES.find(c => c.id === caseId);
  document.getElementById('case-catalog-view')?.classList.add('hidden');
  document.getElementById('case-opener-view')?.classList.remove('hidden');

  const nameEl = document.getElementById('active-case-name');
  if (nameEl) nameEl.innerText = activeCase.name;

  const priceEl = document.getElementById('active-case-price-text');
  if (priceEl) priceEl.innerText = `$${activeCase.price.toFixed(2)} USD`;

  updateMultiSpinners();

  const grid = document.getElementById('case-items-grid');
  if (grid) {
    grid.innerHTML = SKIN_DATABASE.map(item => `
      <div class="item-card ${getRarityClass(item.price)}">
        <img src="${item.img}" alt="${item.name}">
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');
  }
};

function updateMultiSpinners() {
  const wrapper = document.getElementById('spinners-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  for (let i = 0; i < multiOpenCount; i++) {
    wrapper.innerHTML += `
      <div class="roulette-container">
        <div class="roulette-pointer"></div>
        <div class="roulette-track" id="spinner-track-${i}"></div>
      </div>
    `;
  }
  const totalCost = activeCase ? activeCase.price * multiOpenCount : 0;
  const btn = document.getElementById('open-case-btn');
  if (btn) btn.innerText = `LÁDA NYITÁSA ($${totalCost.toFixed(2)})`;
}

function closeCaseView() {
  document.getElementById('case-opener-view')?.classList.add('hidden');
  document.getElementById('case-catalog-view')?.classList.remove('hidden');
}

// LÁDANYITÁS
function handleOpenCase() {
  if (!isLoggedIn) return document.getElementById('login-modal')?.classList.remove('hidden');
  if (isSpinning) return;
  const totalCost = activeCase.price * multiOpenCount;
  if (userBalance < totalCost) return alert("Nincs elég egyenleged!");

  userBalance -= totalCost;
  updateBalanceUI();
  isSpinning = true;

  const isFast = document.getElementById('fast-spin-toggle')?.checked;
  const spinTime = isFast ? 1.2 : 4.0;

  for (let s = 0; s < multiOpenCount; s++) {
    const wonItem = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    const track = document.getElementById(`spinner-track-${s}`);
    if (!track) continue;

    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';

    let spinnerList = [];
    for (let i = 0; i < 80; i++) {
      if (i === 65) {
        spinnerList.push(wonItem);
      } else {
        spinnerList.push(SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)]);
      }
    }

    track.innerHTML = spinnerList.map(item => `
      <div class="item-card ${getRarityClass(item.price)}">
        <img src="${item.img}" alt="${item.name}">
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');

    const cardWidth = 182; 
    const containerWidth = track.parentElement?.offsetWidth || 800;
    const targetX = -(65 * cardWidth) + (containerWidth / 2) - (cardWidth / 2);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = `transform ${spinTime}s cubic-bezier(0.1, 0.8, 0.1, 1)`;
        track.style.transform = `translateX(${targetX}px)`;
      });
    });

    userInventory.push(wonItem);
  }

  playClickSound();

  setTimeout(() => {
    isSpinning = false;
    playWinSound();
    saveUserData();
    renderInventory();
  }, spinTime * 1000 + 200);
}

// BATTLES
function renderBattlesLobby() {
  const list = document.getElementById('battles-list');
  if (!list) return;
  list.innerHTML = `
    <div class="battle-card-item">
      <div class="battle-info-left">
        <div class="battle-case-preview">
          <img src="${OFFICIAL_CASES[1].img}" class="battle-case-img">
        </div>
        <div class="battle-details">
          <h4>Neon Battle 1v1</h4>
          <p>1 Láda • Standard mód</p>
        </div>
      </div>
      <div class="battle-actions-right">
        <div class="battle-cost-tag">$12.00</div>
        <button class="btn btn-primary btn-sm" onclick="startBattleRoom(12.00)">CSATLAKOZÁS</button>
      </div>
    </div>
  `;
}

function renderSponsorFeed() {
  const feed = document.getElementById('sponsor-feed-list');
  if (!feed) return;
  feed.innerHTML = `
    <div class="sponsor-card">
      <div>
        <div class="p-name">GamerPro99</div>
        <div class="p-need">Kért összeg: $24.00</div>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="alert('Szponzoráltad a csatát (80%)!')">FINANSZÍROZÁS ($19.20)</button>
    </div>
  `;
}

function createNewBattle() { startBattleRoom(12.00); }

function startBattleRoom(cost) {
  if (!isLoggedIn) return document.getElementById('login-modal')?.classList.remove('hidden');
  if (userBalance < cost) return alert("Nincs elég egyenleged!");
  userBalance -= cost;
  updateBalanceUI();
  saveUserData();

  activeBattle = { cost };
  const potVal = document.getElementById('arena-pot-val');
  if (potVal) potVal.innerText = `$${(cost * 2).toFixed(2)}`;
  document.getElementById('battle-arena')?.classList.remove('hidden');
}

function runBattleSpin() {
  if (!activeBattle) return;
  const p1Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
  const p2Item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];

  const slot1 = document.getElementById('p1-drop-slot');
  if (slot1) {
    slot1.innerHTML = `
      <div class="item-card ${getRarityClass(p1Item.price)}">
        <img src="${p1Item.img}">
        <div class="name">${p1Item.name}</div>
        <div class="price">$${p1Item.price.toFixed(2)}</div>
      </div>
    `;
  }

  const slot2 = document.getElementById('p2-drop-slot');
  if (slot2) {
    slot2.innerHTML = `
      <div class="item-card ${getRarityClass(p2Item.price)}">
        <img src="${p2Item.img}">
        <div class="name">${p2Item.name}</div>
        <div class="price">$${p2Item.price.toFixed(2)}</div>
      </div>
    `;
  }

  setTimeout(() => {
    if (p1Item.price >= p2Item.price) {
      const winVal = p1Item.price + p2Item.price;
      userBalance += winVal;
      updateBalanceUI();
      saveUserData();
      playWinSound();
      alert(`NYERTÉL! Összesen $${winVal.toFixed(2)} értékű dropot vittél el.`);
    } else {
      alert("A BOT NYERTE A BATTLET!");
    }
  }, 400);
}

function closeBattleArena() { document.getElementById('battle-arena')?.classList.add('hidden'); }

// UPGRADER
let selectedTargetSkin = SKIN_DATABASE[2];

function initUpgrader() {
  const inputEl = document.getElementById('upgrade-input-val');
  if (inputEl) inputEl.addEventListener('input', updateUpgradeChance);

  const targetList = document.getElementById('upgrade-target-list');
  if (targetList) {
    targetList.innerHTML = SKIN_DATABASE.map(item => `
      <div class="mini-item-card" onclick="selectUpgradeTarget(${item.id})">
        <img src="${item.img}">
        <div class="name">${item.name}</div>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');
  }

  document.getElementById('start-upgrade-btn')?.addEventListener('click', runUpgrade);
  selectUpgradeTarget(selectedTargetSkin.id);
}

function selectUpgradeTarget(id) {
  selectedTargetSkin = SKIN_DATABASE.find(s => s.id === id);
  const imgEl = document.getElementById('target-skin-img');
  if (imgEl) imgEl.src = selectedTargetSkin.img;

  const nameEl = document.getElementById('target-skin-name');
  if (nameEl) nameEl.innerText = selectedTargetSkin.name;

  const priceEl = document.getElementById('target-skin-price');
  if (priceEl) priceEl.innerText = `$${selectedTargetSkin.price.toFixed(2)}`;

  updateUpgradeChance();
}

function updateUpgradeChance() {
  const inputVal = parseFloat(document.getElementById('upgrade-input-val')?.value) || 1;
  let chance = (inputVal / selectedTargetSkin.price) * 100;
  if (chance > 95) chance = 95;
  if (chance < 1) chance = 1;

  const numEl = document.getElementById('upgrade-chance-num');
  if (numEl) numEl.innerText = `${chance.toFixed(2)}%`;

  const slice = document.getElementById('upgrade-chance-slice');
  if (slice) {
    const circumference = 502.4;
    const offset = circumference - (circumference * (chance / 100));
    slice.style.strokeDashoffset = offset;
  }
}

function updateUpgraderInventory() {
  const invList = document.getElementById('upgrade-inv-list');
  if (!invList) return;
  invList.innerHTML = userInventory.map(item => `
    <div class="mini-item-card" onclick="document.getElementById('upgrade-input-val').value=${item.price}; updateUpgradeChance();">
      <img src="${item.img}">
      <div class="name">${item.name}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function runUpgrade() {
  if (!isLoggedIn) return document.getElementById('login-modal')?.classList.remove('hidden');
  if (isSpinning) return;
  const inputVal = parseFloat(document.getElementById('upgrade-input-val')?.value) || 0;
  if (userBalance < inputVal) return alert("Nincs elég egyenleged!");

  userBalance -= inputVal;
  updateBalanceUI();
  saveUserData();
  isSpinning = true;

  let chance = (inputVal / selectedTargetSkin.price) * 100;
  if (chance > 95) chance = 95;
  if (chance < 1) chance = 1;

  const needle = document.getElementById('upgrade-needle');
  const win = Math.random() * 100 <= chance;
  const targetDeg = win ? (chance / 100) * 360 * 0.8 : 360 * 0.9;

  if (needle) {
    needle.style.transition = 'transform 3s cubic-bezier(0.15, 0.9, 0.2, 1)';
    needle.style.transform = `translate(-50%, 0) rotate(${1440 + targetDeg}deg)`;
  }

  playClickSound();

  setTimeout(() => {
    isSpinning = false;
    if (needle) {
      needle.style.transition = 'none';
      needle.style.transform = `translate(-50%, 0) rotate(0deg)`;
    }

    if (win) {
      playWinSound();
      userInventory.push(selectedTargetSkin);
      saveUserData();
      renderInventory();
      alert(`SIKERES UPGRADE! Nyertél egy ${selectedTargetSkin.name} skint!`);
    } else {
      alert("AZ UPGRADE SIKERTELEN VOLT!");
    }
  }, 3200);
}

function updateBalanceUI() {
  const balEl = document.getElementById('user-balance');
  if (balEl) balEl.innerText = `$${userBalance.toFixed(2)}`;
}

function initLiveFeed() {
  const track = document.getElementById('live-feed-track');
  if (!track) return;
  setInterval(() => {
    const item = SKIN_DATABASE[Math.floor(Math.random() * SKIN_DATABASE.length)];
    const el = document.createElement('div');
    el.className = `feed-item ${getRarityClass(item.price)}`;
    el.innerHTML = `<img src="${item.img}"><span>${item.name} ($${item.price.toFixed(2)})</span>`;
    track.prepend(el);
    if (track.children.length > 7) track.removeChild(track.lastChild);
  }, 3500);
}
