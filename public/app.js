// ==========================================
// 1. GLOBÁLIS ÁLLAPOT (STATE)
// ==========================================
const state = {
  currentLang: 'hu',
  user: null, // { username: string, balance: number, inventory: [] }
  settings: {
    sfx: true,
    fastSpin: false
  },
  activeTab: 'cases',
  activeCase: null,
  selectedMultiCount: 1,
  
  // Demó adatok a felülethez
  cases: [
    { id: 'c1', name: 'Mil-Spec Case', price: 2.50, img: '📦', color: '#4b69ff' },
    { id: 'c2', name: 'Restricted Case', price: 5.00, img: '📦', color: '#8847ff' },
    { id: 'c3', name: 'Classified Case', price: 15.00, img: '📦', color: '#d32ce6' },
    { id: 'c4', name: 'Covert Case', price: 50.00, img: '📦', color: '#eb4b4b' },
    { id: 'c5', name: 'Special Knife Case', price: 100.00, img: '📦', color: '#ffd700' }
  ],
  
  caseItems: [
    { name: 'P250 | Sand Dune', price: 0.15, rarity: 'consumer', color: '#b0c3d9' },
    { name: 'AK-47 | Safari Mesh', price: 1.20, rarity: 'milspec', color: '#4b69ff' },
    { name: 'M4A4 | Evil Daimyo', price: 4.50, rarity: 'restricted', color: '#8847ff' },
    { name: 'AWP | Redline', price: 18.00, rarity: 'classified', color: '#d32ce6' },
    { name: 'AK-47 | Vulcan', price: 85.00, rarity: 'covert', color: '#eb4b4b' },
    { name: '★ Karambit | Fade', price: 450.00, rarity: 'special', color: '#ffd700' }
  ]
};

// ==========================================
// 2. INICIALIZÁLÁS (DOM LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAuthSystem();
  initModals();
  initCaseCatalog();
  initUpgrader();
  initLiveFeed();
});

// ==========================================
// 3. NAVIGÁCIÓ ÉS FÜLEK
// ==========================================
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // NAV gombok frissítése
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Oldalak váltása
  document.querySelectorAll('.tab-page').forEach(page => {
    page.classList.remove('active');
  });
  
  const activePage = document.getElementById(`tab-${tabId}`);
  if (activePage) {
    activePage.classList.add('active');
  }
}

// ==========================================
// 4. AUTENTIKÁCIÓ (BEJELENTKEZÉS ÉS REGISZTRÁCIÓ)
// ==========================================
function initAuthSystem() {
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('auth-form-login');
  const formRegister = document.getElementById('auth-form-register');

  // Váltás a Bejelentkezés és Regisztráció fülek között
  if (tabBtnLogin && tabBtnRegister) {
    tabBtnLogin.addEventListener('click', () => {
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
      tabBtnLogin.classList.add('active-auth-tab');
      tabBtnRegister.classList.remove('active-auth-tab');
    });

    tabBtnRegister.addEventListener('click', () => {
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
      tabBtnRegister.classList.add('active-auth-tab');
      tabBtnLogin.classList.remove('active-auth-tab');
    });
  }

  // Bejelentkezés gomb eseménye
  document.getElementById('confirm-login-btn')?.addEventListener('click', () => {
    const user = document.getElementById('login-username-input').value.trim();
    const pass = document.getElementById('login-password-input').value.trim();

    if (!user || !pass) {
      alert('Kérlek adja meg a felhasználónevet és a jelszót!');
      return;
    }

    performLogin(user);
  });

  // Regisztráció gomb eseménye
  document.getElementById('confirm-register-btn')?.addEventListener('click', () => {
    const user = document.getElementById('reg-username-input').value.trim();
    const email = document.getElementById('reg-email-input').value.trim();
    const pass = document.getElementById('reg-password-input').value.trim();
    const passConf = document.getElementById('reg-password-confirm-input').value.trim();

    if (!user || !email || !pass || !passConf) {
      alert('Kérlek töltsd ki az összes mezőt a regisztrációhoz!');
      return;
    }

    if (pass !== passConf) {
      alert('A megadott két jelszó nem egyezik meg!');
      return;
    }

    alert('Sikeres regisztráció!');
    performLogin(user);
  });

  // Steam Bejelentkezés szimulációja
  document.getElementById('steam-login-action')?.addEventListener('click', () => {
    performLogin('SteamPlayer_' + Math.floor(Math.random() * 8999 + 1000));
  });
}

function performLogin(username) {
  state.user = {
    username: username,
    balance: 100.00,
    inventory: []
  };

  // UI Frissítése
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('open-login-btn').classList.add('hidden');
  
  document.getElementById('user-balance-box').classList.remove('hidden');
  document.getElementById('open-deposit-btn').classList.remove('hidden');
  document.getElementById('user-profile-box').classList.remove('hidden');
  
  document.getElementById('display-username').innerText = state.user.username;
  updateBalanceDisplay();
}

function updateBalanceDisplay() {
  if (state.user) {
    document.getElementById('user-balance').innerText = `$${state.user.balance.toFixed(2)}`;
  }
}

// ==========================================
// 5. MODALOK KEZELÉSE (Ablakok megnyitása/bezárása)
// ==========================================
function initModals() {
  // Bejelentkezés / Regisztráció Modal
  const loginModal = document.getElementById('login-modal');
  document.getElementById('open-login-btn')?.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
  });
  document.getElementById('close-login-btn')?.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  // Beállítások Modal
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('open-settings-btn')?.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });
  document.getElementById('close-settings-btn')?.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    state.settings.sfx = document.getElementById('sfx-toggle').checked;
    state.settings.fastSpin = document.getElementById('fast-spin-toggle').checked;
    settingsModal.classList.add('hidden');
  });
}

// ==========================================
// 6. LÁDA KATALÓGUS ÉS NYITÁS
// ==========================================
function initCaseCatalog() {
  const casesGrid = document.getElementById('cases-grid');
  if (!casesGrid) return;

  casesGrid.innerHTML = '';
  state.cases.forEach(c => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.style.borderTop = `3px solid ${c.color}`;
    card.innerHTML = `
      <div style="font-size: 3rem; text-align: center; margin: 10px 0;">${c.img}</div>
      <h3 style="text-align: center; font-size: 1.1rem; margin-bottom: 5px;">${c.name}</h3>
      <div style="text-align: center; color: #00ff88; font-weight: bold; margin-bottom: 10px;">$${c.price.toFixed(2)}</div>
      <button class="btn btn-primary width-100" onclick="openCaseView('${c.id}')">MEGNYITÁS</button>
    `;
    casesGrid.appendChild(card);
  });

  // Vissza a ládákhoz gomb
  document.getElementById('back-to-catalog-btn')?.addEventListener('click', () => {
    document.getElementById('case-opener-view').classList.add('hidden');
    document.getElementById('case-catalog-view').classList.remove('hidden');
  });

  // Láda nyitása gomb
  document.getElementById('open-case-btn')?.addEventListener('click', handleCaseOpen);
}

function openCaseView(caseId) {
  const caseObj = state.cases.find(c => c.id === caseId);
  if (!caseObj) return;

  state.activeCase = caseObj;

  document.getElementById('case-catalog-view').classList.add('hidden');
  document.getElementById('case-opener-view').classList.remove('hidden');

  document.getElementById('active-case-name').innerText = caseObj.name;
  document.getElementById('active-case-price-text').innerText = `$${caseObj.price.toFixed(2)}`;

  renderCaseContents();
}

function renderCaseContents() {
  const grid = document.getElementById('case-items-grid');
  if (!grid) return;

  grid.innerHTML = '';
  state.caseItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item-card';
    el.style.borderBottom = `3px solid ${item.color}`;
    el.innerHTML = `
      <div style="font-weight: bold; font-size: 0.9rem;">${item.name}</div>
      <div style="color: #888; font-size: 0.8rem;">$${item.price.toFixed(2)}</div>
    `;
    grid.appendChild(el);
  });
}

function handleCaseOpen() {
  if (!state.user) {
    alert('Kérlek jelentkezz be a ládanyitáshoz!');
    document.getElementById('login-modal').classList.remove('hidden');
    return;
  }

  if (state.user.balance < state.activeCase.price) {
    alert('Nincs elegendő egyenleged!');
    return;
  }

  // Egyenleg levonása
  state.user.balance -= state.activeCase.price;
  updateBalanceDisplay();

  // Véletlenszerű nyeremény
  const wonItem = state.caseItems[Math.floor(Math.random() * state.caseItems.length)];
  state.user.inventory.push(wonItem);

  alert(`Gratulálunk! Nyereményed: ${wonItem.name} ($${wonItem.price.toFixed(2)})`);
  renderInventory();
}

function renderInventory() {
  const invGrid = document.getElementById('inventory-grid');
  if (!invGrid) return;

  if (state.user.inventory.length === 0) {
    invGrid.innerHTML = '<p class="empty-inv-msg" id="txt-empty-inv">Még nem nyertél tárgyat.</p>';
    return;
  }

  invGrid.innerHTML = '';
  state.user.inventory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.borderBottom = `3px solid ${item.color}`;
    card.innerHTML = `
      <div style="font-weight: bold; font-size: 0.85rem;">${item.name}</div>
      <div style="color: #00ff88; font-size: 0.8rem;">$${item.price.toFixed(2)}</div>
    `;
    invGrid.appendChild(card);
  });
}

// ==========================================
// 7. UPGRADER LOGIKA
// ==========================================
function initUpgrader() {
  const inputVal = document.getElementById('upgrade-input-val');
  if (inputVal) {
    inputVal.addEventListener('input', calculateUpgradeChance);
  }

  document.getElementById('start-upgrade-btn')?.addEventListener('click', () => {
    if (!state.user) {
      alert('Kérlek jelentkezz be az Upgrader használatához!');
      document.getElementById('login-modal').classList.remove('hidden');
      return;
    }
    
    const stake = parseFloat(document.getElementById('upgrade-input-val').value) || 0;
    if (stake <= 0 || stake > state.user.balance) {
      alert('Érvénytelen tétösszeg vagy nincs elég egyenleged!');
      return;
    }

    const chance = Math.min(Math.max((stake / 22.00) * 100, 1), 90);
    const win = Math.random() * 100 <= chance;

    if (win) {
      state.user.balance += (22.00 - stake);
      alert('SIKERES UPGRADE! Megnyerted a skint!');
    } else {
      state.user.balance -= stake;
      alert('SAJNOS NEM SIKERÜLT! Elvesztetted a tétet.');
    }
    updateBalanceDisplay();
  });
}

function calculateUpgradeChance() {
  const stake = parseFloat(document.getElementById('upgrade-input-val').value) || 0;
  const targetPrice = 22.00; // Demó célskin értéke
  let chance = (stake / targetPrice) * 100;
  if (chance > 90) chance = 90;
  if (chance < 1) chance = 1;

  const chanceEl = document.getElementById('upgrade-chance-num');
  if (chanceEl) {
    chanceEl.innerText = `${chance.toFixed(2)}%`;
  }
}

// ==========================================
// 8. ÉLŐ DROPOK FEED (LIVE FEED)
// ==========================================
function initLiveFeed() {
  const track = document.getElementById('live-feed-track');
  if (!track) return;

  setInterval(() => {
    const randomItem = state.caseItems[Math.floor(Math.random() * state.caseItems.length)];
    const dropItem = document.createElement('div');
    dropItem.style.cssText = `
      display: inline-block;
      padding: 4px 10px;
      margin-right: 10px;
      background: #18181c;
      border-left: 3px solid ${randomItem.color};
      border-radius: 4px;
      font-size: 0.75rem;
      white-space: nowrap;
    `;
    dropItem.innerHTML = `<strong>${randomItem.name}</strong> ($${randomItem.price.toFixed(2)})`;

    track.prepend(dropItem);
    if (track.children.length > 15) {
      track.removeChild(track.lastChild);
    }
  }, 3000);
}

// ==========================================
// 9. NYELVVÁLTÓ (HU / EN)
// ==========================================
function switchLanguage(lang) {
  state.currentLang = lang;
  
  document.getElementById('lang-hu').classList.toggle('active', lang === 'hu');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');

  // Példa nyelvi kulcsok váltására
  if (lang === 'en') {
    document.getElementById('txt-live-drops').innerText = 'LIVE DROPS';
    document.getElementById('txt-nav-cases').innerText = 'CASES';
    document.getElementById('txt-nav-battles').innerText = 'CASE BATTLES';
    document.getElementById('txt-nav-upgrader').innerText = 'UPGRADER';
    document.getElementById('txt-balance-label').innerText = 'BALANCE';
    document.getElementById('txt-login-btn').innerText = 'LOGIN';
  } else {
    document.getElementById('txt-live-drops').innerText = 'ÉLŐ DROPOK';
    document.getElementById('txt-nav-cases').innerText = 'LÁDÁK';
    document.getElementById('txt-nav-battles').innerText = 'CASE BATTLES';
    document.getElementById('txt-nav-upgrader').innerText = 'UPGRADER';
    document.getElementById('txt-balance-label').innerText = 'EGYENLEG';
    document.getElementById('txt-login-btn').innerText = 'BEJELENTKEZÉS';
  }
}
